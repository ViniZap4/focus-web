import type { MediaItem } from '$lib/stores/reader.svelte';
import type { ParseResult } from './text';

export async function parsePdfFile(file: File): Promise<ParseResult> {
	const pdfjsLib = await import('pdfjs-dist');
	pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

	const lines: string[] = [];
	const media: MediaItem[] = [];
	let wordCount = 0;

	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();

		let currentLine = '';
		let lastY: number | null = null;

		for (const item of content.items) {
			if (!('str' in item)) continue;
			const textItem = item as { str: string; transform: number[] };
			const y = textItem.transform[5];

			if (lastY !== null && Math.abs(y - lastY) > 5) {
				if (currentLine.trim()) {
					lines.push(currentLine.trim());
					wordCount += currentLine.trim().split(/\s+/).length;
				}
				currentLine = '';
			}

			currentLine += textItem.str + ' ';
			lastY = y;
		}

		if (currentLine.trim()) {
			lines.push(currentLine.trim());
			wordCount += currentLine.trim().split(/\s+/).length;
		}

		// Try to extract images from the page
		try {
			const opList = await page.getOperatorList();
			for (let j = 0; j < opList.fnArray.length; j++) {
				if (
					opList.fnArray[j] === pdfjsLib.OPS.paintImageXObject ||
					opList.fnArray[j] === pdfjsLib.OPS.paintJpegXObject
				) {
					const imgName = opList.argsArray[j][0];
					try {
						const img = await page.objs.get(imgName);
						if (img && img.width > 50 && img.height > 50) {
							const canvas = document.createElement('canvas');
							canvas.width = img.width;
							canvas.height = img.height;
							const ctx = canvas.getContext('2d')!;
							const imgData = new ImageData(
								new Uint8ClampedArray(img.data),
								img.width,
								img.height
							);
							ctx.putImageData(imgData, 0, 0);
							media.push({
								type: 'image',
								src: canvas.toDataURL('image/png'),
								alt: `Page ${i} image`,
								triggerAtWord: Math.min(wordCount, wordCount - 1)
							});
						}
					} catch {
						// Skip images that can't be extracted
					}
				}
			}
		} catch {
			// Skip image extraction errors
		}

		lines.push(''); // Page break
	}

	const title = file.name.replace(/\.pdf$/i, '');
	return { title, text: lines.join('\n'), media };
}
