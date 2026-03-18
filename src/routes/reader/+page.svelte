<script lang="ts">
	import { goto } from '$app/navigation';
	import { reader } from '$lib/stores';
	import { WordDisplay } from '../../blocks/Reader/WordDisplay';
	import { FloatBar } from '../../blocks/Reader/FloatBar';
	import { Settings } from '../../blocks/Settings';
	import { onMount } from 'svelte';

	onMount(() => {
		if (!reader.text) {
			goto('/');
			return;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		// Don't capture when typing in inputs
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		switch (e.key) {
			case 'ArrowRight':
			case ' ':
			case 'j':
				e.preventDefault();
				reader.advance();
				break;
			case 'ArrowLeft':
			case 'k':
				e.preventDefault();
				reader.goBack();
				break;
			case 'ArrowDown': {
				e.preventDefault();
				// Jump to first word of next line
				const nextLine = reader.currentLineIndex + 1;
				const target = reader.lines[nextLine];
				if (target) reader.jumpToWord(target.words[0].globalIndex);
				break;
			}
			case 'ArrowUp': {
				e.preventDefault();
				// Jump to first word of previous line
				const prevLine = reader.currentLineIndex - 1;
				const target2 = reader.lines[prevLine];
				if (target2) reader.jumpToWord(target2.words[0].globalIndex);
				break;
			}
			case 'p':
				e.preventDefault();
				reader.toggle();
				break;
			case 's':
				e.preventDefault();
				if (reader.isSpeaking) {
					reader.stop();
				} else {
					reader.play();
				}
				break;
			case 'Escape':
				e.preventDefault();
				if (reader.showSettings) {
					reader.toggleSettings();
				}
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if reader.text}
	<WordDisplay />
	<FloatBar />
	<Settings />
{/if}
