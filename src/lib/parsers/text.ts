import type { MediaItem } from '$lib/stores/reader.svelte';

export interface ParseResult {
	title: string;
	text: string;
	media: MediaItem[];
}

export async function parseTextFile(file: File): Promise<ParseResult> {
	const text = await file.text();
	const title = file.name.replace(/\.[^.]+$/, '');
	return { title, text, media: [] };
}
