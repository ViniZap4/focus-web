import JSZip from 'jszip';
import type { MediaItem } from '$lib/stores/reader.svelte';
import type { ParseResult } from './text';
import { sanitizeNode } from './sanitize';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB per image

export async function parseEpubFile(
	file: File,
	onProgress?: (pct: number) => void
): Promise<ParseResult> {
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(`EPUB too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 200 MB`);
	}

	let zip: JSZip;
	try {
		const buffer = await file.arrayBuffer();
		if (buffer.byteLength === 0) {
			throw new Error('EPUB file appears to be empty');
		}
		// Check ZIP magic bytes (PK\x03\x04)
		const sig = new Uint8Array(buffer, 0, 4);
		if (sig[0] !== 0x50 || sig[1] !== 0x4b) {
			throw new Error(
				'This file is not a valid EPUB. EPUBs are ZIP archives — this file has a different format.'
			);
		}
		zip = await JSZip.loadAsync(buffer);
	} catch (err) {
		if (err instanceof Error && err.message.startsWith('This file')) throw err;
		if (err instanceof Error && err.message.startsWith('EPUB file')) throw err;
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(
			`Could not read EPUB archive. The file may be corrupted or DRM-protected. (${msg})`
		);
	}

	// Validate EPUB: check mimetype
	const mimetype = await zip.file('mimetype')?.async('string');
	if (mimetype && !mimetype.trim().startsWith('application/epub+zip')) {
		throw new Error('Invalid EPUB: wrong mimetype');
	}

	// Read container.xml
	const containerXml = await zip.file('META-INF/container.xml')?.async('string');
	if (!containerXml) throw new Error('Invalid EPUB: missing META-INF/container.xml');

	const parser = new DOMParser();
	const containerDoc = parser.parseFromString(containerXml, 'application/xml');

	if (containerDoc.querySelector('parsererror')) {
		throw new Error('Invalid EPUB: malformed container.xml');
	}

	const rootfile = containerDoc.querySelector('rootfile');
	const opfPath = rootfile?.getAttribute('full-path');
	if (!opfPath) throw new Error('Invalid EPUB: missing OPF path in container.xml');

	const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

	// Read OPF
	const opfXml = await zip.file(opfPath)?.async('string');
	if (!opfXml) throw new Error(`Invalid EPUB: missing OPF file at ${opfPath}`);

	const opfDoc = parser.parseFromString(opfXml, 'application/xml');

	// Extract metadata
	const titleEl =
		opfDoc.querySelector('metadata title') ||
		opfDoc.querySelector('dc\\:title') ||
		opfDoc.querySelector('title');
	const title = titleEl?.textContent?.trim() || file.name.replace(/\.epub$/i, '');

	const langEl =
		opfDoc.querySelector('metadata language') ||
		opfDoc.querySelector('dc\\:language') ||
		opfDoc.querySelector('language');
	const detectedLang = langEl?.textContent?.trim() || undefined;

	// Build manifest map
	const manifest = new Map<string, { href: string; mediaType: string }>();
	opfDoc.querySelectorAll('manifest item').forEach((item) => {
		const id = item.getAttribute('id') || '';
		const href = item.getAttribute('href') || '';
		const mediaType = item.getAttribute('media-type') || '';
		manifest.set(id, { href: decodeURIComponent(href), mediaType });
	});

	// Get spine order
	const spineItems: string[] = [];
	opfDoc.querySelectorAll('spine itemref').forEach((ref) => {
		const idref = ref.getAttribute('idref') || '';
		if (idref) spineItems.push(idref);
	});

	if (spineItems.length === 0) {
		throw new Error('Invalid EPUB: empty spine (no content sections found)');
	}

	const lines: string[] = [];
	const media: MediaItem[] = [];
	let wordCount = 0;

	// Image extraction queue (async, non-blocking)
	const imagePromises: Promise<void>[] = [];

	for (let idx = 0; idx < spineItems.length; idx++) {
		const itemId = spineItems[idx];
		const item = manifest.get(itemId);
		if (!item) continue;
		if (!item.mediaType.includes('html') && !item.mediaType.includes('xml')) continue;

		const filePath = resolveHref(opfDir, item.href);
		const html = await zip.file(filePath)?.async('string');
		if (!html) continue;

		// Parse as XHTML, fallback to HTML
		let doc: Document;
		try {
			doc = parser.parseFromString(html, 'application/xhtml+xml');
			if (doc.querySelector('parsererror')) throw new Error('parse error');
		} catch {
			doc = parser.parseFromString(html, 'text/html');
		}

		const body = doc.querySelector('body') || doc.documentElement;
		if (!body) continue;

		// Sanitize
		sanitizeNode(body);

		// Get the directory of this content file for resolving relative paths
		const contentDir = filePath.includes('/')
			? filePath.substring(0, filePath.lastIndexOf('/') + 1)
			: opfDir;

		// Process content
		const result = processNode(body, zip, contentDir, wordCount);
		lines.push(...result.lines);
		wordCount = result.wordCount;

		// Queue image extraction
		for (const imgTask of result.imageQueue) {
			imagePromises.push(
				extractImage(imgTask.path, imgTask.alt, imgTask.atWord, zip, media)
			);
		}

		// Queue table extraction
		media.push(...result.tables);

		onProgress?.(((idx + 1) / spineItems.length) * 100);
	}

	// Wait for all images to be extracted
	await Promise.allSettled(imagePromises);

	return { title, text: lines.join('\n'), media, detectedLang };
}

interface ImageTask {
	path: string;
	alt: string;
	atWord: number;
}

interface ProcessResult {
	lines: string[];
	wordCount: number;
	imageQueue: ImageTask[];
	tables: MediaItem[];
}

const BLOCK_TAGS = new Set([
	'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'blockquote', 'section', 'article', 'header', 'footer',
	'li', 'dt', 'dd', 'pre', 'address', 'hr', 'br'
]);

function processNode(
	node: Node,
	zip: JSZip,
	basePath: string,
	startWordCount: number
): ProcessResult {
	const lines: string[] = [];
	const imageQueue: ImageTask[] = [];
	const tables: MediaItem[] = [];
	let wordCount = startWordCount;
	let currentParagraph = '';

	function flushParagraph() {
		const text = currentParagraph.trim();
		if (text) {
			lines.push(text);
			wordCount += text.split(/\s+/).filter((w) => w.length > 0).length;
		}
		currentParagraph = '';
	}

	function walk(n: Node) {
		if (n.nodeType === Node.TEXT_NODE) {
			const text = n.textContent?.replace(/\s+/g, ' ') || '';
			if (text.trim()) {
				currentParagraph += text;
			}
			return;
		}

		if (n.nodeType !== Node.ELEMENT_NODE) return;

		const el = n as Element;
		const tag = el.tagName.toLowerCase();

		// Images
		if (tag === 'img' || tag === 'image') {
			flushParagraph();
			const src =
				el.getAttribute('src') ||
				el.getAttribute('xlink:href') ||
				el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
				'';
			if (src && !src.startsWith('data:')) {
				const imgPath = resolveHref(basePath, src);
				imageQueue.push({ path: imgPath, alt: el.getAttribute('alt') || '', atWord: wordCount });
			}
			return;
		}

		// SVG
		if (tag === 'svg') {
			flushParagraph();
			const imgEl = el.querySelector('image');
			if (imgEl) {
				const href = imgEl.getAttribute('href') || imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
				if (href && !href.startsWith('data:')) {
					imageQueue.push({ path: resolveHref(basePath, href), alt: '', atWord: wordCount });
				}
			}
			return;
		}

		// Tables
		if (tag === 'table') {
			flushParagraph();
			const rows: string[][] = [];
			el.querySelectorAll('tr').forEach((tr) => {
				const cells: string[] = [];
				tr.querySelectorAll('td, th').forEach((td) => cells.push(td.textContent?.trim() || ''));
				if (cells.length > 0) rows.push(cells);
			});
			if (rows.length > 0) {
				tables.push({ type: 'table', rows, triggerAtWord: wordCount });
				for (const row of rows) {
					const rowText = row.join(' | ');
					lines.push(rowText);
					wordCount += rowText.split(/\s+/).filter((w) => w.length > 0).length;
				}
			}
			return;
		}

		// Links — extract as media + keep text in flow
		if (tag === 'a') {
			const href = el.getAttribute('href') || '';
			if (href && href.startsWith('http')) {
				flushParagraph();
				tables.push({
					type: 'link',
					href,
					label: el.textContent?.trim() || href,
					triggerAtWord: wordCount
				});
			}
			// Process text content normally
			for (const child of n.childNodes) walk(child);
			return;
		}

		// Figure — extract images with captions
		if (tag === 'figure') {
			flushParagraph();
			const img = el.querySelector('img, image');
			if (img) {
				const src = img.getAttribute('src') || img.getAttribute('xlink:href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
				if (src && !src.startsWith('data:')) {
					const caption = el.querySelector('figcaption')?.textContent?.trim() || '';
					imageQueue.push({ path: resolveHref(basePath, src), alt: caption, atWord: wordCount });
				}
			}
			return;
		}

		// Skip nav/aside
		if (tag === 'nav' || tag === 'aside') return;

		// Block elements — flush paragraph before and after
		if (BLOCK_TAGS.has(tag)) {
			flushParagraph();
			if (tag === 'br' || tag === 'hr') return;
			for (const child of n.childNodes) walk(child);
			flushParagraph();
			return;
		}

		// Inline elements — keep text in current paragraph
		for (const child of n.childNodes) walk(child);
	}

	walk(node);
	flushParagraph();
	return { lines, wordCount, imageQueue, tables };
}

async function extractImage(
	path: string,
	alt: string,
	atWord: number,
	zip: JSZip,
	media: MediaItem[]
) {
	const zipFile = zip.file(path);
	if (!zipFile) return;

	// Check size before extracting
	const meta = zipFile as unknown as { _data?: { uncompressedSize?: number } };
	if (meta._data?.uncompressedSize && meta._data.uncompressedSize > MAX_IMAGE_SIZE) return;

	try {
		const data = await zipFile.async('base64');
		if (data.length > MAX_IMAGE_SIZE * 1.37) return; // base64 overhead

		const ext = path.split('.').pop()?.toLowerCase() || 'png';
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
			alt,
			triggerAtWord: atWord
		});
	} catch {
		// Skip
	}
}

function resolveHref(base: string, href: string): string {
	// Handle absolute paths
	if (href.startsWith('/')) return href.substring(1);

	// Handle fragment-only refs
	if (href.startsWith('#')) return base + href;

	// Combine base + href and resolve . and ..
	const combined = base + href;
	const parts = combined.split('/');
	const resolved: string[] = [];

	for (const p of parts) {
		if (p === '..') {
			resolved.pop();
		} else if (p !== '.' && p !== '') {
			resolved.push(p);
		}
	}

	return resolved.join('/');
}
