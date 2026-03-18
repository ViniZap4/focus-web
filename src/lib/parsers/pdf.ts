import type { MediaItem } from '$lib/stores/reader.svelte';
import type { ParseResult } from './text';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGE_DIMENSION = 4096;

export async function parsePdfFile(
	file: File,
	onProgress?: (pct: number) => void
): Promise<ParseResult> {
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(`PDF too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 100 MB`);
	}

	const pdfjsLib = await import('pdfjs-dist');
	pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

	const arrayBuffer = await file.arrayBuffer();

	let pdf;
	try {
		pdf = await pdfjsLib.getDocument({
			data: arrayBuffer,
			useSystemFonts: true
		}).promise;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg.includes('password')) {
			throw new Error('This PDF is password-protected. Please provide an unlocked version.');
		}
		throw new Error(`Failed to open PDF: ${msg}`);
	}

	const lines: string[] = [];
	const media: MediaItem[] = [];
	let wordCount = 0;

	// Track repeated lines across pages (headers/footers)
	const lineFrequency = new Map<string, number>();

	// First pass: count line frequency to detect headers/footers
	if (pdf.numPages > 3) {
		const samplePages = [1, 2, Math.floor(pdf.numPages / 2), pdf.numPages];
		for (const pageNum of samplePages) {
			if (pageNum > pdf.numPages) continue;
			const page = await pdf.getPage(pageNum);
			const content = await page.getTextContent();
			const pageLines = extractLines(content);
			for (const line of pageLines) {
				const normalized = line.trim().toLowerCase();
				if (normalized.length > 0 && normalized.length < 100) {
					lineFrequency.set(normalized, (lineFrequency.get(normalized) || 0) + 1);
				}
			}
		}
	}

	const repeatedLines = new Set(
		[...lineFrequency.entries()].filter(([, count]) => count >= 3).map(([line]) => line)
	);

	// Second pass: extract all content
	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const pageLines = extractLines(content);

		for (const line of pageLines) {
			const normalized = line.trim().toLowerCase();

			// Skip detected headers/footers
			if (repeatedLines.has(normalized)) continue;

			// Skip page numbers
			if (/^\d{1,4}$/.test(line.trim())) continue;

			if (line.trim()) {
				lines.push(line.trim());
				wordCount += line.trim().split(/\s+/).length;
			}
		}

		// Extract images (with size limits)
		await extractPageImages(page, pdfjsLib, media, wordCount, i);

		if (i < pdf.numPages) {
			lines.push(''); // Page separator
		}

		onProgress?.((i / pdf.numPages) * 100);
	}

	const title = file.name.replace(/\.pdf$/i, '');
	return { title, text: lines.join('\n'), media };
}

interface TextContentItem {
	str: string;
	transform: number[];
	width: number;
	height: number;
}

function extractLines(content: { items: unknown[] }): string[] {
	const lines: string[] = [];
	let currentLine = '';
	let lastY: number | null = null;
	let lastRight = 0;

	for (const item of content.items) {
		if (!('str' in (item as Record<string, unknown>))) continue;
		const textItem = item as TextContentItem;
		const y = textItem.transform[5];
		const x = textItem.transform[4];

		if (lastY !== null) {
			const yDiff = Math.abs(y - lastY);
			const fontSize = Math.abs(textItem.transform[0]) || 12;

			// New line if Y changed significantly
			if (yDiff > fontSize * 0.5) {
				if (currentLine.trim()) {
					lines.push(currentLine.trim());
				}
				currentLine = '';
			} else if (x > lastRight + fontSize * 2) {
				// Large horizontal gap — could be column break or tab
				currentLine += '  ';
			}
		}

		currentLine += textItem.str;
		lastY = y;
		lastRight = x + (textItem.width || 0);
	}

	if (currentLine.trim()) {
		lines.push(currentLine.trim());
	}

	return lines;
}

async function extractPageImages(
	page: { getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>; objs: { get: (name: string) => Promise<{ width: number; height: number; data: Uint8ClampedArray } | null> } },
	pdfjsLib: { OPS: Record<string, number> },
	media: MediaItem[],
	wordCount: number,
	pageNum: number
) {
	try {
		const opList = await page.getOperatorList();
		for (let j = 0; j < opList.fnArray.length; j++) {
			if (
				opList.fnArray[j] === pdfjsLib.OPS.paintImageXObject ||
				opList.fnArray[j] === pdfjsLib.OPS.paintJpegXObject
			) {
				const imgName = opList.argsArray[j][0] as string;
				try {
					const img = await page.objs.get(imgName);
					if (!img || img.width < 80 || img.height < 80) continue;

					// Limit image dimensions for memory
					let w = img.width;
					let h = img.height;
					if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
						const scale = MAX_IMAGE_DIMENSION / Math.max(w, h);
						w = Math.floor(w * scale);
						h = Math.floor(h * scale);
					}

					const canvas = document.createElement('canvas');
					canvas.width = w;
					canvas.height = h;
					const ctx = canvas.getContext('2d')!;

					if (w === img.width && h === img.height) {
						const imgData = new ImageData(
							new Uint8ClampedArray(img.data),
							img.width,
							img.height
						);
						ctx.putImageData(imgData, 0, 0);
					} else {
						// Scale down
						const tempCanvas = document.createElement('canvas');
						tempCanvas.width = img.width;
						tempCanvas.height = img.height;
						const tempCtx = tempCanvas.getContext('2d')!;
						const imgData = new ImageData(
							new Uint8ClampedArray(img.data),
							img.width,
							img.height
						);
						tempCtx.putImageData(imgData, 0, 0);
						ctx.drawImage(tempCanvas, 0, 0, w, h);
					}

					media.push({
						type: 'image',
						src: canvas.toDataURL('image/jpeg', 0.8),
						alt: `Page ${pageNum} image`,
						triggerAtWord: Math.max(0, wordCount - 1)
					});
				} catch {
					// Skip
				}
			}
		}
	} catch {
		// Skip image extraction entirely
	}
}
