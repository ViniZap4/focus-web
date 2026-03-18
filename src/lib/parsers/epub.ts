import JSZip from 'jszip';
import type { MediaItem } from '$lib/stores/reader.svelte';
import type { ParseResult } from './text';

export async function parseEpubFile(file: File): Promise<ParseResult> {
	const zip = await JSZip.loadAsync(await file.arrayBuffer());

	// Read container.xml to find the OPF
	const containerXml = await zip.file('META-INF/container.xml')?.async('string');
	if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');

	const parser = new DOMParser();
	const containerDoc = parser.parseFromString(containerXml, 'application/xml');
	const rootfile = containerDoc.querySelector('rootfile');
	const opfPath = rootfile?.getAttribute('full-path');
	if (!opfPath) throw new Error('Invalid EPUB: missing OPF path');

	const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

	// Read OPF
	const opfXml = await zip.file(opfPath)?.async('string');
	if (!opfXml) throw new Error('Invalid EPUB: missing OPF file');

	const opfDoc = parser.parseFromString(opfXml, 'application/xml');

	// Get title
	const titleEl = opfDoc.querySelector('metadata title');
	const title = titleEl?.textContent || file.name.replace(/\.epub$/i, '');

	// Get manifest items
	const manifest = new Map<string, { href: string; mediaType: string }>();
	opfDoc.querySelectorAll('manifest item').forEach((item) => {
		const id = item.getAttribute('id') || '';
		const href = item.getAttribute('href') || '';
		const mediaType = item.getAttribute('media-type') || '';
		manifest.set(id, { href, mediaType });
	});

	// Get spine order
	const spineItems: string[] = [];
	opfDoc.querySelectorAll('spine itemref').forEach((ref) => {
		const idref = ref.getAttribute('idref') || '';
		spineItems.push(idref);
	});

	const lines: string[] = [];
	const media: MediaItem[] = [];
	let wordCount = 0;

	for (const itemId of spineItems) {
		const item = manifest.get(itemId);
		if (!item) continue;
		if (!item.mediaType.includes('html') && !item.mediaType.includes('xml')) continue;

		const filePath = opfDir + item.href;
		const html = await zip.file(filePath)?.async('string');
		if (!html) continue;

		const doc = parser.parseFromString(html, 'application/xhtml+xml');
		const body = doc.querySelector('body');
		if (!body) continue;

		// Process nodes recursively
		processNode(body, lines, media, zip, opfDir, () => wordCount, (wc) => (wordCount = wc));
	}

	return { title, text: lines.join('\n'), media };
}

function processNode(
	node: Node,
	lines: string[],
	media: MediaItem[],
	zip: JSZip,
	basePath: string,
	getWordCount: () => number,
	setWordCount: (n: number) => void
) {
	if (node.nodeType === Node.TEXT_NODE) {
		const text = node.textContent?.trim();
		if (text) {
			lines.push(text);
			setWordCount(getWordCount() + text.split(/\s+/).length);
		}
		return;
	}

	if (node.nodeType !== Node.ELEMENT_NODE) return;

	const el = node as Element;
	const tag = el.tagName.toLowerCase();

	// Handle images
	if (tag === 'img' || tag === 'image') {
		const src = el.getAttribute('src') || el.getAttribute('xlink:href') || '';
		if (src) {
			const imgPath = resolveHref(basePath, src);
			const zipFile = zip.file(imgPath);
			if (zipFile) {
				zipFile.async('base64').then((data) => {
					const ext = src.split('.').pop()?.toLowerCase() || 'png';
					const mimeMap: Record<string, string> = {
						jpg: 'image/jpeg',
						jpeg: 'image/jpeg',
						png: 'image/png',
						gif: 'image/gif',
						svg: 'image/svg+xml',
						webp: 'image/webp'
					};
					const mime = mimeMap[ext] || 'image/png';
					media.push({
						type: 'image',
						src: `data:${mime};base64,${data}`,
						alt: el.getAttribute('alt') || '',
						triggerAtWord: getWordCount()
					});
				});
			}
		}
		return;
	}

	// Handle tables
	if (tag === 'table') {
		const rows: string[][] = [];
		el.querySelectorAll('tr').forEach((tr) => {
			const cells: string[] = [];
			tr.querySelectorAll('td, th').forEach((td) => {
				cells.push(td.textContent?.trim() || '');
			});
			if (cells.length > 0) rows.push(cells);
		});
		if (rows.length > 0) {
			media.push({
				type: 'table',
				rows,
				triggerAtWord: getWordCount()
			});
			// Also add table text to reading flow
			for (const row of rows) {
				const rowText = row.join(' | ');
				lines.push(rowText);
				setWordCount(getWordCount() + rowText.split(/\s+/).length);
			}
		}
		return;
	}

	// Recurse into children
	for (const child of node.childNodes) {
		processNode(child, lines, media, zip, basePath, getWordCount, setWordCount);
	}

	// Add breaks after block elements
	if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br'].includes(tag)) {
		// Line is already added by text nodes
	}
}

function resolveHref(base: string, href: string): string {
	if (href.startsWith('/')) return href.substring(1);
	const parts = (base + href).split('/');
	const resolved: string[] = [];
	for (const p of parts) {
		if (p === '..') resolved.pop();
		else if (p !== '.') resolved.push(p);
	}
	return resolved.join('/');
}
