<script lang="ts">
	import { reader } from '$lib/stores';
	import { detectLanguage, filterVoicesByLang } from '$lib/parsers';
	let scrubbing = $state(false);
	let progEl = $state<HTMLDivElement>();

	function redetectLang() {
		if (!reader.text) return;
		const r = detectLanguage(reader.text);
		reader.detectedLang = r.code;
		reader.isRtl = r.isRtl;
		const voices = window.speechSynthesis.getVoices();
		const best = voices.length > 0 ? filterVoicesByLang(voices, r.code)[0] : null;
		if (best) {
			reader.settings.voice = best.name;
			reader.saveSettings();
			if (reader.isSpeaking) reader.restartSpeech();
		}
	}

	// ── Scrubber ──────────────────────────────────────
	function startScrub(e: MouseEvent | TouchEvent) {
		scrubbing = true;
		doScrub(e);
		const move = (ev: MouseEvent | TouchEvent) => doScrub(ev);
		const end = () => {
			scrubbing = false;
			window.removeEventListener('mousemove', move);
			window.removeEventListener('mouseup', end);
			window.removeEventListener('touchmove', move);
			window.removeEventListener('touchend', end);
		};
		window.addEventListener('mousemove', move);
		window.addEventListener('mouseup', end);
		window.addEventListener('touchmove', move, { passive: true });
		window.addEventListener('touchend', end);
	}

	function doScrub(e: MouseEvent | TouchEvent) {
		if (!progEl) return;
		const rect = progEl.getBoundingClientRect();
		const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
		reader.jumpToPercent(Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100)));
	}


</script>

<div class="bar" class:bar-hidden={reader.settings.zenMode}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={progEl}
		class="prog"
		class:scrubbing
		onmousedown={startScrub}
		ontouchstart={startScrub}
		role="slider"
		aria-label="Reading position"
		aria-valuenow={Math.round(reader.progress)}
		aria-valuemin={0}
		aria-valuemax={100}
		tabindex={0}
	>
		<div class="prog-fill" style="width:{reader.progress}%">
			<div class="prog-dot"></div>
		</div>
	</div>

	<div class="main">
		<div class="group">
			<a href="/" class="ic" onclick={() => reader.reset()} title="Home">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>
			</a>
			<button class="lang-badge" onclick={redetectLang} title="Re-detect language">
				{reader.detectedLang}
			</button>
			<span class="mode-tag">{reader.settings.readingMode}</span>
		</div>

		<div class="group transport">
			{#if reader.settings.readingMode === 'scroll' || reader.settings.readingMode === 'highlight'}
				<button class="tb" disabled={reader.isAtStart} onclick={() => { const p = reader.lines[reader.currentLineIndex - 1]; if (p) reader.jumpToWord(p.words[0].globalIndex); }} title="Previous line">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 4h-2v16h2V4z"/></svg>
				</button>
			{:else}
				<button class="tb" disabled={reader.isAtStart} onclick={() => reader.goBack()} title="Previous word">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
				</button>
			{/if}

			<button class="tb play" onclick={() => reader.toggle()} title={reader.isPlaying ? 'Pause (p)' : 'Play (p)'}>
				{#if reader.isPlaying}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
				{/if}
			</button>

			{#if reader.settings.readingMode === 'scroll' || reader.settings.readingMode === 'highlight'}
				<button class="tb" disabled={reader.isAtEnd} onclick={() => { const n = reader.lines[reader.currentLineIndex + 1]; if (n) reader.jumpToWord(n.words[0].globalIndex); }} title="Next line">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4zM17 4h2v16h-2V4z"/></svg>
				</button>
			{:else}
				<button class="tb" disabled={reader.isAtEnd} onclick={() => reader.advance()} title="Next word">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
				</button>
			{/if}
		</div>

		<div class="group">
			<button class="ic" class:active={reader.isBookmarked(reader.currentWord)} onclick={() => reader.toggleBookmark()} title="Bookmark (m)">
				<svg width="14" height="14" viewBox="0 0 24 24" fill={reader.isBookmarked(reader.currentWord) ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5">
					<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
				</svg>
			</button>
			<span class="meta">{reader.currentWord + 1}/{reader.totalWords}{reader.etaMinutes > 0 ? ` · ${reader.etaMinutes}m` : ''}{reader.settings.wpm ? ` · ${reader.settings.wpm}` : ''}</span>
			<button class="ic" class:active={reader.showSettings} onclick={() => reader.toggleSettings()} title="Settings">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/>
					<circle cx="10" cy="8" r="2" fill="currentColor"/><circle cx="16" cy="16" r="2" fill="currentColor"/>
				</svg>
			</button>
			<button class="ic" class:active={reader.showSections} onclick={() => reader.toggleSections()} title="Sections">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
					<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/>
				</svg>
			</button>
		</div>
	</div>

</div>


<style>
	.bar {
		position: fixed;
		bottom: max(1.25rem, env(safe-area-inset-bottom, 0px));
		left: 50%;
		transform: translateX(-50%);
		width: min(94vw, 520px);
		background: var(--glass);
		backdrop-filter: blur(30px) saturate(1.4);
		-webkit-backdrop-filter: blur(30px) saturate(1.4);
		border: 1px solid var(--border);
		border-radius: 20px;
		overflow: hidden;
		z-index: 100;
		box-shadow: var(--shadow-lg);
		transition:
			opacity 0.4s var(--ease),
			transform 0.4s var(--ease),
			background var(--dur-slow) var(--ease),
			border-color var(--dur-slow) var(--ease),
			box-shadow var(--dur-slow) var(--ease);
	}
	.bar-hidden {
		opacity: 0;
		transform: translateX(-50%) translateY(100%);
		pointer-events: none;
	}

	/* ── Progress scrubber ─────────────────────────── */
	.prog {
		height: 6px;
		background: var(--surface);
		cursor: pointer;
		transition: height 0.2s var(--ease);
		touch-action: none;
	}
	.prog:hover, .prog.scrubbing { height: 10px; }
	.prog-fill {
		height: 100%;
		background: var(--text-3);
		position: relative;
		transition: width 0.3s var(--ease), background var(--dur-slow) var(--ease);
	}
	.prog-dot {
		position: absolute;
		right: -5px;
		top: 50%;
		transform: translateY(-50%) scale(0);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--text-2);
		box-shadow: 0 0 6px rgba(0, 0, 0, 0.15);
		transition: transform 0.2s var(--ease);
	}
	.prog:hover .prog-dot, .prog.scrubbing .prog-dot {
		transform: translateY(-50%) scale(1);
	}

	.main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.55rem;
		gap: 0.2rem;
	}

	.group { display: flex; align-items: center; gap: 0.15rem; }
	.transport { gap: 0.3rem; }

	.ic {
		all: unset; cursor: pointer;
		width: 36px; height: 36px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 11px;
		color: var(--text-3);
		text-decoration: none;
		flex-shrink: 0;
		transition: all var(--dur) var(--ease);
	}
	.ic:hover:not(:disabled) { color: var(--text-2); background: var(--surface); }
	.ic:active:not(:disabled) { transform: scale(0.94); }
	.ic.active { color: var(--text-2); background: var(--surface-h); }

	.lang-badge {
		all: unset; cursor: pointer;
		padding: 0.22rem 0.5rem;
		border-radius: 7px;
		background: var(--surface);
		color: var(--text-3);
		font-size: 0.6rem; font-weight: 600;
		letter-spacing: 0.04em; text-transform: uppercase;
		transition: all var(--dur) var(--ease);
	}
	.lang-badge:hover { background: var(--surface-h); color: var(--text-2); }
	.lang-badge:active { transform: scale(0.94); }

	.mode-tag {
		padding: 0.18rem 0.4rem;
		border-radius: 5px;
		background: var(--surface);
		color: var(--text-4);
		font-size: 0.5rem; font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.tb {
		all: unset; cursor: pointer;
		width: 38px; height: 38px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 12px;
		background: var(--surface);
		color: var(--text-3);
		transition: all 0.25s var(--ease);
	}
	.tb:hover:not(:disabled) { background: var(--surface-h); color: var(--text-2); }
	.tb:active:not(:disabled) { transform: scale(0.93); }
	.tb:disabled { opacity: 0.15; cursor: not-allowed; }

	.tb.play {
		width: 42px; height: 42px;
		background: var(--surface-h);
		color: var(--text-2);
	}
	.tb.play:hover { background: var(--surface-a); color: var(--text); transform: scale(1.04); }
	.tb.play:active { transform: scale(0.93); }

	.meta {
		color: var(--text-4);
		font-size: 0.55rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		padding: 0 0.15rem;
	}

	@media (max-width: 440px) {
		.meta { display: none; }
		.mode-tag { display: none; }
		.main { padding: 0.35rem 0.4rem; }
	}

</style>
