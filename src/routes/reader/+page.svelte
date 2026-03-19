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
		// Ctrl+F / Cmd+F: open search
		if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
			e.preventDefault();
			reader.showSearch = !reader.showSearch;
			return;
		}

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
			case 'f':
				e.preventDefault();
				reader.settings.zenMode = !reader.settings.zenMode;
				reader.saveSettings();
				break;
			case 'm':
				e.preventDefault();
				reader.toggleBookmark();
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
	<div class="reader" class:ready class:zen={reader.settings.zenMode}>
		{#if reader.settings.readingMode === 'rsvp'}
			<div class="rsvp-view">
				<div class="rsvp-word" style="font-family:'{reader.settings.fontFamily}',system-ui;font-size:{Math.min(reader.settings.fontSize * 1.8, 96)}px">
					{#if reader.settings.bionicReading}
						{@const w = reader.allWords[reader.currentWord]?.text || ''}
						{@const s = Math.ceil(w.length * reader.settings.bionicStrength)}
						<span class="rsvp-bold">{w.slice(0, s)}</span>{w.slice(s)}
					{:else}
						{reader.allWords[reader.currentWord]?.text || ''}
					{/if}
				</div>
				<div class="rsvp-meta">{reader.currentWord + 1} / {reader.totalWords}</div>
			</div>
		{:else}
			<WordDisplay />
		{/if}

		{#if !reader.settings.zenMode}
			<FloatBar />
		{/if}

		<SectionSelector />

		<!-- Search bar -->
		{#if reader.showSearch}
			<div class="search-bar">
				<input
					type="text"
					placeholder="Search..."
					value={reader.searchQuery}
					oninput={(e) => reader.search((e.target as HTMLInputElement).value)}
					onkeydown={(e) => {
						if (e.key === 'Enter') { e.preventDefault(); reader.searchNext(); }
						if (e.key === 'Escape') { reader.showSearch = false; reader.search(''); }
					}}
				/>
				{#if reader.searchResults.length > 0}
					<span class="search-count">{reader.searchIndex + 1}/{reader.searchResults.length}</span>
					<button class="search-nav" onclick={() => reader.searchPrev()} title="Previous">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
					</button>
					<button class="search-nav" onclick={() => reader.searchNext()} title="Next">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
					</button>
				{/if}
				<button class="search-nav" onclick={() => { reader.showSearch = false; reader.search(''); }} title="Close">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.reader {
		opacity: 0;
		transition: opacity 0.6s var(--ease);
	}
	.reader.ready { opacity: 1; }

	/* ── Zen mode: minimal chrome, vignette focus ── */
	.zen { cursor: none; }
	.zen:hover { cursor: default; }

	/* ── RSVP view ─────────────────────────────────── */
	.rsvp-view {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--bg);
		gap: 1.5rem;
		z-index: 10;
	}

	.rsvp-word {
		color: var(--text);
		font-weight: 300;
		letter-spacing: -0.02em;
		text-align: center;
		padding: 0 2rem;
		transition: color var(--dur-slow) var(--ease);
		min-height: 1.2em;
	}

	.rsvp-bold { font-weight: 700; }

	.rsvp-meta {
		color: var(--text-4);
		font-size: 0.65rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
	}

	/* ── Search bar ────────────────────────────────── */
	.search-bar {
		position: fixed;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.5rem;
		background: var(--glass);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid var(--border);
		border-radius: 14px;
		box-shadow: var(--shadow-lg);
		z-index: 200;
		animation: searchIn 0.25s var(--ease);
	}

	@keyframes searchIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } }

	.search-bar input {
		all: unset;
		width: 200px;
		padding: 0.3rem 0.5rem;
		font-size: 0.75rem;
		color: var(--text);
	}

	.search-bar input::placeholder { color: var(--text-4); }

	.search-count {
		color: var(--text-3);
		font-size: 0.6rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.search-nav {
		all: unset;
		cursor: pointer;
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 7px;
		color: var(--text-3);
		transition: all var(--dur) var(--ease);
	}

	.search-nav:hover { color: var(--text-2); background: var(--surface); }
	.search-nav:active { transform: scale(0.93); }
</style>
