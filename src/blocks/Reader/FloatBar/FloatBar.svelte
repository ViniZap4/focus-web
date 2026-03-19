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
		</div>

		<div class="group transport">
			<button class="tb" disabled={reader.isAtStart} onclick={() => { const p = reader.lines[reader.currentLineIndex - 1]; if (p) reader.jumpToWord(p.words[0].globalIndex); }} title="Previous line">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 4h-2v16h2V4z"/></svg>
			</button>
			<button class="tb play" onclick={() => reader.toggle()} title={reader.isPlaying ? 'Pause (p)' : 'Play (p)'}>
				{#if reader.isPlaying}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
				{/if}
			</button>
			<button class="tb" disabled={reader.isAtEnd} onclick={() => { const n = reader.lines[reader.currentLineIndex + 1]; if (n) reader.jumpToWord(n.words[0].globalIndex); }} title="Next line">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4zM17 4h2v16h-2V4z"/></svg>
			</button>
		</div>

		<div class="group">
			<button class="ic" class:active={reader.isBookmarked(reader.currentWord)} onclick={() => reader.toggleBookmark()} title="Bookmark (m)">
				<svg width="14" height="14" viewBox="0 0 24 24" fill={reader.isBookmarked(reader.currentWord) ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5">
					<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
				</svg>
			</button>
			<span class="meta">{reader.currentWord + 1}/{reader.totalWords}{reader.etaMinutes > 0 ? ` · ${reader.etaMinutes}m` : ''}</span>
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
		bottom: 1.25rem;
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
		height: 4px;
		background: var(--surface);
		cursor: pointer;
		transition: height 0.2s var(--ease);
	}
	.prog:hover, .prog.scrubbing { height: 8px; }
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

	/* (Settings content moved to SettingsPanel component in WordDisplay left panel) */
	.settings-backdrop {
		all: unset;
		position: fixed;
		inset: 0;
		z-index: 150;
	}

	.settings-side {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: min(88vw, 340px);
		background: var(--glass);
		backdrop-filter: blur(30px) saturate(1.4);
		-webkit-backdrop-filter: blur(30px) saturate(1.4);
		border-right: 1px solid var(--border);
		z-index: 151;
		display: flex;
		flex-direction: column;
		box-shadow: 8px 0 32px rgba(0, 0, 0, 0.06);
		animation: slideInLeft 0.35s var(--ease);
		transition: background var(--dur-slow) var(--ease), border-color var(--dur-slow) var(--ease);
	}

	@keyframes slideInLeft { from { transform: translateX(-100%); } }

	.settings-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.1rem 0.7rem;
		color: var(--text);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.settings-close {
		all: unset; cursor: pointer;
		width: 30px; height: 30px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 8px;
		color: var(--text-3);
		transition: all var(--dur) var(--ease);
	}
	.settings-close:hover { color: var(--text); background: var(--surface); }
	.settings-close:active { transform: scale(0.93); }

	.settings-body {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: thin;
		padding: 0.5rem 1.1rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.settings-body::-webkit-scrollbar { width: 3px; }
	.settings-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

	.p-section {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding-bottom: 0.55rem;
		border-bottom: 1px solid var(--border);
	}
	.p-section.no-border { border-bottom: none; padding-bottom: 0; }

	.p-label { color: var(--text-2); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.03em; }

	.themes { display: flex; gap: 0.3rem; flex-wrap: wrap; }
	.theme-card {
		all: unset; cursor: pointer;
		display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
		padding: 0.35rem 0.5rem;
		border-radius: 10px;
		border: 1.5px solid transparent;
		transition: all var(--dur) var(--ease);
		flex: 1; min-width: 50px;
	}
	.theme-card:hover { background: var(--surface); }
	.theme-card:active { transform: scale(0.95); }
	.theme-card.on { border-color: var(--text-3); background: var(--surface-h); }

	.tc-swatch {
		width: 22px; height: 22px;
		border-radius: 50%;
		border: 1.5px solid var(--border-h);
		transition: border-color var(--dur-slow) var(--ease);
	}
	.theme-card.on .tc-swatch { border-color: var(--text-3); }
	.tc-name { font-size: 0.55rem; color: var(--text-4); font-weight: 500; transition: color var(--dur-slow) var(--ease); }
	.theme-card.on .tc-name { color: var(--text-2); }

	.chips { display: flex; gap: 0.25rem; flex-wrap: wrap; }
	.chip {
		all: unset; cursor: pointer;
		padding: 0.35rem 0.7rem; border-radius: 8px;
		font-size: 0.72rem; color: var(--text-3);
		border: 1px solid var(--border);
		transition: all var(--dur) var(--ease);
	}
	.chip:hover { color: var(--text-2); border-color: var(--border-h); background: var(--surface); }
	.chip:active { transform: scale(0.95); }
	.chip.on { color: var(--text); background: var(--surface-h); border-color: var(--border-h); }

	.p-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }

	.sl-group { display: flex; flex-direction: column; gap: 0.3rem; }
	.sl-head { display: flex; justify-content: space-between; align-items: baseline; }
	.sl-label { color: var(--text-2); font-size: 0.68rem; font-weight: 500; }
	.sl-val { color: var(--text-3); font-size: 0.62rem; font-family: monospace; font-variant-numeric: tabular-nums; }
	.sl-group input[type='range'] { width: 100%; accent-color: var(--text-3); height: 4px; }

	.voice-row { display: flex; gap: 0.3rem; }
	.voice-row select {
		flex: 1;
		background: var(--surface); border: 1px solid var(--border);
		color: var(--text-2); padding: 0.4rem 0.55rem; border-radius: 9px;
		font-size: 0.72rem; outline: none;
		transition: border-color var(--dur) var(--ease);
	}
	.voice-row select:focus { border-color: var(--border-h); }

	.voice-preview {
		all: unset; cursor: pointer;
		width: 32px; height: 32px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 9px; color: var(--text-3);
		border: 1px solid var(--border);
		transition: all var(--dur) var(--ease);
	}
	.voice-preview:hover { color: var(--text-2); background: var(--surface); }
	.voice-preview:active { transform: scale(0.93); }

	.toggle-row {
		display: flex; align-items: center; justify-content: space-between;
		padding: 0.25rem 0;
		color: var(--text-2); font-size: 0.72rem; cursor: default;
	}
	.tog {
		all: unset; cursor: pointer;
		width: 34px; height: 20px; border-radius: 10px;
		background: var(--surface-h); position: relative;
		transition: background var(--dur) var(--ease);
	}
	.tog.on { background: var(--text-3); }
	.td {
		position: absolute; top: 3px; left: 3px;
		width: 14px; height: 14px; border-radius: 50%;
		background: var(--glass);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
		transition: all var(--dur) var(--ease);
	}
	.tog.on .td { left: 17px; background: var(--bg); }

	/* ── Mode grid ────────────────────────────────── */
	.mode-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.35rem;
	}

	.mode-card {
		all: unset; cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.55rem 0.4rem;
		border-radius: 10px;
		border: 1.5px solid var(--border);
		text-align: center;
		transition: all var(--dur) var(--ease);
	}
	.mode-card:hover { border-color: var(--border-h); background: var(--surface); }
	.mode-card:active { transform: scale(0.97); }
	.mode-card.on { border-color: var(--text-3); background: var(--surface-h); }

	.mode-card span:nth-child(2) {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-2);
	}
	.mode-card.on span:nth-child(2) { color: var(--text); }

	.mode-desc {
		font-size: 0.55rem !important;
		font-weight: 400 !important;
		color: var(--text-4) !important;
	}
	.mode-card.on .mode-desc { color: var(--text-3) !important; }

	.mode-card svg { color: var(--text-3); }
	.mode-card.on svg { color: var(--text-2); }

	.keys { display: flex; flex-wrap: wrap; gap: 0.3rem 0.6rem; padding-top: 0.3rem; }
	.keys span { color: var(--text-4); font-size: 0.6rem; white-space: nowrap; }
	.keys kbd {
		background: var(--surface); color: var(--text-3);
		padding: 0.1rem 0.25rem; border-radius: 4px;
		font-family: monospace; font-size: 0.55rem;
	}
</style>
