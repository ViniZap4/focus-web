import type { ParseResult, ParsedSection } from './text';

export type { ParseResult, ParsedSection };
export { detectLanguage, filterVoicesByLang, getBestVoice } from './language';
export type { LanguageResult } from './language';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB absolute max

const VALID_EXTENSIONS = new Set([
	'txt', 'md', 'markdown', 'pdf', 'epub',
	'html', 'htm', 'xhtml', 'rtf', 'text'
]);

export async function parseFile(
	file: File,
	onProgress?: (pct: number) => void
): Promise<ParseResult> {
	// Security: validate file size
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
	}

	if (file.size === 0) {
		throw new Error('File is empty');
	}

	// Security: validate extension
	const ext = file.name.split('.').pop()?.toLowerCase() || '';
	if (!VALID_EXTENSIONS.has(ext)) {
		throw new Error(`Unsupported file type: .${ext}`);
	}

	const type = file.type;

	if (ext === 'pdf' || type === 'application/pdf') {
		const { parsePdfFile } = await import('./pdf');
		const result = await parsePdfFile(file, onProgress);

		if (!result.text.trim()) {
			throw new Error('PDF appears to contain no extractable text (may be scanned/image-only)');
		}

		return result;
	}

	if (ext === 'epub' || type === 'application/epub+zip') {
		const { parseEpubFile } = await import('./epub');
		const result = await parseEpubFile(file, onProgress);

		if (!result.text.trim()) {
			throw new Error('EPUB appears to contain no readable text');
		}

		return result;
	}

	// Default: text-based formats
	const { parseTextFile } = await import('./text');
	return parseTextFile(file);
}

export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.epub', '.html'];
export const SUPPORTED_MIME_TYPES = [
	'text/plain',
	'text/markdown',
	'text/html',
	'application/pdf',
	'application/epub+zip'
];
