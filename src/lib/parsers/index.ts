import type { ParseResult } from './text';

export type { ParseResult };

export async function parseFile(file: File): Promise<ParseResult> {
	const ext = file.name.split('.').pop()?.toLowerCase() || '';
	const type = file.type;

	if (ext === 'pdf' || type === 'application/pdf') {
		const { parsePdfFile } = await import('./pdf');
		return parsePdfFile(file);
	}

	if (ext === 'epub' || type === 'application/epub+zip') {
		const { parseEpubFile } = await import('./epub');
		return parseEpubFile(file);
	}

	// Default: treat as text (.txt, .md, .html, etc.)
	const { parseTextFile } = await import('./text');
	return parseTextFile(file);
}

export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.epub', '.html', '.htm'];
export const SUPPORTED_MIME_TYPES = [
	'text/plain',
	'text/markdown',
	'text/html',
	'application/pdf',
	'application/epub+zip'
];
