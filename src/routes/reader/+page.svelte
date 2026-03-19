<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
	import { reader } from '$lib/stores';
	import { WordDisplay } from '../../blocks/Reader/WordDisplay';
	import { FloatBar } from '../../blocks/Reader/FloatBar';
	import { SectionSelector } from '../../blocks/SectionSelector';
	import { onMount, onDestroy } from 'svelte';

	let ready = $state(false);

	onMount(() => {
		if (!reader.text) {
			goto('/');
			return;
		}
		requestAnimationFrame(() => {
			ready = true;
		});
	});

	beforeNavigate(() => {
		reader.stop();
	});

	onDestroy(() => {
		reader.stop();
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if (e.target instanceof HTMLSelectElement) return;

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
				const nextLine = reader.currentLineIndex + 1;
				const target = reader.lines[nextLine];
				if (target) reader.jumpToWord(target.words[0].globalIndex);
				break;
			}
			case 'ArrowUp': {
				e.preventDefault();
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
			case '+':
			case '=':
				e.preventDefault();
				reader.settings.wpm = Math.min(600, reader.settings.wpm + 20);
				reader.saveSettings();
				if (reader.isSpeaking) reader.restartSpeech();
				break;
			case '-':
			case '_':
				e.preventDefault();
				reader.settings.wpm = Math.max(60, reader.settings.wpm - 20);
				reader.saveSettings();
				if (reader.isSpeaking) reader.restartSpeech();
				break;
			case 'b':
				e.preventDefault();
				reader.settings.bionicReading = !reader.settings.bionicReading;
				reader.saveSettings();
				break;
			case 'Escape':
				e.preventDefault();
				if (reader.showSections) {
					reader.showSections = false;
				} else if (reader.showSettings) {
					reader.showSettings = false;
				} else if (reader.activeMedia) {
					reader.dismissMedia();
				}
				break;
		}
	}
</script>

<svelte:head>
	<title>{reader.isPlaying ? '▶ ' : ''}{reader.title || 'Focus'}</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if reader.text}
	<div class="reader" class:ready>
		<WordDisplay />
		<FloatBar />
		<SectionSelector />
	</div>
{/if}

<style>
	.reader {
		opacity: 0;
		transition: opacity 0.6s var(--ease);
	}

	.reader.ready {
		opacity: 1;
	}
</style>
