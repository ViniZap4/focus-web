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

	const arrayBuffer = await file.arrayBuffer();
	const data = new Uint8Array(arrayBuffer);

	// Try with local worker first, then fallback to no worker (main thread)
	let pdf;
	try {
		pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
		pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
	} catch (e1) {
		const msg1 = e1 instanceof Error ? e1.message : String(e1);
		if (msg1.includes('worker') || msg1.includes('Worker') || msg1.includes('fetch')) {
			// Worker failed — retry without worker (runs in main thread)
			try {
				pdfjsLib.GlobalWorkerOptions.workerSrc = '';
				pdf = await pdfjsLib.getDocument({
					data,
					useSystemFonts: true,
					isEvalSupported: false
				}).promise;
			} catch (e2) {
				const msg2 = e2 instanceof Error ? e2.message : String(e2);
				if (msg2.includes('password')) {
					throw new Error('This PDF is password-protected.');
				}
				throw new Error(`Failed to open PDF: ${msg2}`);
			}
		} else if (msg1.includes('password')) {
			throw new Error('This PDF is password-protected.');
		} else {
			throw new Error(`Failed to open PDF: ${msg1}`);
		}
	}

	const lines: string[] = [];
	const media: MediaItem[] = [];
	let wordCount = 0;

	// Track repeated lines across pages (headers/footers)
	const lineFrequency = new Map<string, number>();

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

	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const pageLines = extractLines(content);

		for (const line of pageLines) {
			const normalized = line.trim().toLowerCase();
			if (repeatedLines.has(normalized)) continue;
			if (/^\d{1,4}$/.test(line.trim())) continue;

			if (line.trim()) {
				lines.push(line.trim());
				wordCount += line.trim().split(/\s+/).length;
			}
		}

		try {
			await extractPageImages(page, pdfjsLib, media, wordCount, i);
		} catch {
			// Skip image extraction for this page
		}

		if (i < pdf.numPages) {
			lines.push('');
		}

		onProgress?.((i / pdf.numPages) * 100);
	}

	const title = file.name.replace(/\.pdf$/i, '');
	return { title, text: cleanPdfText(lines.join('\n')), media };
}

/**
 * Clean up PDF-extracted text:
 * - Join hyphenated line breaks ("exam-\nple" → "example")
 * - Merge broken lines within the same paragraph (lines that don't end with sentence-ending punctuation)
 * - Preserve intentional paragraph breaks (empty lines)
 */
function cleanPdfText(raw: string): string {
	// Join hyphenated words split across lines
	let text = raw.replace(/-\n(\S)/g, '$1');

	const inputLines = text.split('\n');
	const output: string[] = [];
	let buffer = '';

	for (const line of inputLines) {
		const trimmed = line.trim();

		if (trimmed.length === 0) {
			// Empty line = paragraph break
			if (buffer) {
				output.push(buffer);
				buffer = '';
			}
			output.push('');
			continue;
		}

		if (buffer) {
			// If previous line ended mid-sentence, merge with current
			const lastChar = buffer[buffer.length - 1];
			const endsWithPunctuation = '.!?:;"\')\u201D\u2019'.includes(lastChar);
			const isShortLine = buffer.length < 60;

			if (!endsWithPunctuation && isShortLine) {
				// Likely a broken line from PDF layout — merge
				buffer += ' ' + trimmed;
			} else {
				output.push(buffer);
				buffer = trimmed;
			}
		} else {
			buffer = trimmed;
		}
	}

	if (buffer) output.push(buffer);

	return output.join('\n');
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

			if (yDiff > fontSize * 0.5) {
				if (currentLine.trim()) {
					lines.push(currentLine.trim());
				}
				currentLine = '';
			} else if (x > lastRight + fontSize * 2) {
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
				// Skip individual image
			}
		}
	}
}
