import type { MediaItem } from '$lib/stores/reader.svelte';

export interface ParsedSection {
	title: string;
	wordIndex: number;
	level: number;
}

export interface ParseResult {
	title: string;
	text: string;
	media: MediaItem[];
	sections?: ParsedSection[];
	detectedLang?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function parseTextFile(file: File): Promise<ParseResult> {
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 50 MB`);
	}

	const title = file.name.replace(/\.[^.]+$/, '');

	// Detect encoding from BOM or assume UTF-8
	const buffer = await file.arrayBuffer();
	const text = decodeText(buffer);

	// If HTML file, extract text content
	const ext = file.name.split('.').pop()?.toLowerCase();
	if (ext === 'html' || ext === 'htm') {
		return { title, text: parseHtml(text), media: [] };
	}

	// If markdown, strip basic syntax
	if (ext === 'md' || ext === 'markdown') {
		return { title, text: parseMarkdown(text), media: [] };
	}

	return { title, text, media: [] };
}

function decodeText(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);

	// Check BOM
	if (bytes[0] === 0xff && bytes[1] === 0xfe) {
		return new TextDecoder('utf-16le').decode(buffer);
	}
	if (bytes[0] === 0xfe && bytes[1] === 0xff) {
		return new TextDecoder('utf-16be').decode(buffer);
	}

	// Try UTF-8 first
	try {
		const decoder = new TextDecoder('utf-8', { fatal: true });
		return decoder.decode(buffer);
	} catch {
		// Fallback to Latin-1
		return new TextDecoder('iso-8859-1').decode(buffer);
	}
}

function parseHtml(html: string): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');

	// Remove scripts and styles
	doc.querySelectorAll('script, style, link, meta').forEach((el) => el.remove());

	const lines: string[] = [];
	processHtmlNode(doc.body, lines);
	return lines.join('\n');
}

function processHtmlNode(node: Node, lines: string[]) {
	for (const child of node.childNodes) {
		if (child.nodeType === Node.TEXT_NODE) {
			const text = child.textContent?.trim();
			if (text) lines.push(text);
		} else if (child.nodeType === Node.ELEMENT_NODE) {
			const el = child as Element;
			const tag = el.tagName.toLowerCase();

			if (['table'].includes(tag)) {
				// Render table as pipe-delimited text
				el.querySelectorAll('tr').forEach((tr) => {
					const cells: string[] = [];
					tr.querySelectorAll('td, th').forEach((td) => {
						cells.push(td.textContent?.trim() || '');
					});
					if (cells.length > 0) lines.push(cells.join(' | '));
				});
			} else {
				processHtmlNode(child, lines);
			}
		}
	}
}

function parseMarkdown(md: string): string {
	return md
		.replace(/^#{1,6}\s+/gm, '') // headers
		.replace(/\*\*(.+?)\*\*/g, '$1') // bold
		.replace(/\*(.+?)\*/g, '$1') // italic
		.replace(/__(.+?)__/g, '$1')
		.replace(/_(.+?)_/g, '$1')
		.replace(/~~(.+?)~~/g, '$1') // strikethrough
		.replace(/`(.+?)`/g, '$1') // inline code
		.replace(/```[\s\S]*?```/g, '') // code blocks
		.replace(/!\[.*?\]\(.*?\)/g, '') // images
		.replace(/\[(.+?)\]\(.*?\)/g, '$1') // links
		.replace(/^[-*+]\s+/gm, '') // unordered lists
		.replace(/^\d+\.\s+/gm, '') // ordered lists
		.replace(/^>\s+/gm, '') // blockquotes
		.replace(/^---+$/gm, '') // horizontal rules
		.replace(/\n{3,}/g, '\n\n');
}
