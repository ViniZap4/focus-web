<script lang="ts">
	import { reader, THEMES } from '$lib/stores';
	import type { ThemeId } from '$lib/stores';
	import { filterVoicesByLang, detectLanguage } from '$lib/parsers';
	import { onMount } from 'svelte';

	let visible = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let showPanel = $state(false);
	let scrubbing = $state(false);
	let voices: SpeechSynthesisVoice[] = $state([]);
	let langVoices = $derived(filterVoicesByLang(voices, reader.detectedLang));
	let progEl = $state<HTMLDivElement>();

	const fonts = [
		{ l: 'Sans', v: 'Inter' },
		{ l: 'Serif', v: 'Georgia' },
		{ l: 'Mono', v: 'monospace' },
		{ l: 'Sys', v: 'system-ui' }
	];

	onMount(() => {
		function load() { voices = window.speechSynthesis.getVoices(); }
		load();
		window.speechSynthesis.onvoiceschanged = load;
	});

	function save() { reader.saveSettings(); }

	// Save + restart speech if currently speaking (for live WPM/pitch/volume updates)
	function saveLive() {
		save();
		if (reader.isSpeaking) reader.restartSpeech();
	}

	function setTheme(id: ThemeId) {
		reader.settings.theme = id;
		save();
		reader.applyTheme();
	}

	function changeVoice(name: string) {
		reader.settings.voice = name;
		save();
		if (reader.isSpeaking) reader.restartSpeech();
	}

	function redetectLang() {
		if (!reader.text) return;
		const r = detectLanguage(reader.text);
		reader.detectedLang = r.code;
		reader.isRtl = r.isRtl;
		const best = voices.length > 0 ? filterVoicesByLang(voices, r.code)[0] : null;
		if (best) {
			reader.settings.voice = best.name;
			save();
			if (reader.isSpeaking) reader.restartSpeech();
		}
	}

	function preview() {
		window.speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance('Focus, word by word.');
		u.rate = reader.settings.wpm / 180;
		u.pitch = reader.settings.speechPitch;
		u.volume = reader.settings.speechVolume;
		u.lang = reader.detectedLang;
		if (reader.settings.voice) {
			const v = voices.find((v) => v.name === reader.settings.voice);
			if (v) u.voice = v;
		}
		window.speechSynthesis.speak(u);
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

	// ── Auto-hide ─────────────────────────────────────
	function resetHide() {
		visible = true;
		if (hideTimer) clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			if (reader.isPlaying && !showPanel && !scrubbing && !reader.showSections) visible = false;
		}, 3000);
	}

	$effect(() => {
		if (!reader.isPlaying) {
			visible = true;
			if (hideTimer) clearTimeout(hideTimer);
		} else {
			resetHide();
		}
	});
</script>

<svelte:window onmousemove={resetHide} ontouchmove={resetHide} />

<div class="bar" class:hidden={!visible}>
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
			<button class="ic" class:active={showPanel} onclick={() => { showPanel = !showPanel; }} title="Settings">
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

	{#if showPanel}
		<div class="panel">
			<!-- Theme -->
			<div class="p-section">
				<div class="p-grid themes">
					{#each THEMES as t}
						<button class="theme-card" class:on={reader.settings.theme === t.id} onclick={() => setTheme(t.id)}>
							<span class="tc-swatch" style="background:{t.preview}"></span>
							<span class="tc-name">{t.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Font + Align -->
			<div class="p-section">
				<div class="p-grid-2">
					<div>
						<span class="p-label">Font</span>
						<div class="chips">
							{#each fonts as f}
								<button class="chip" class:on={reader.settings.fontFamily === f.v} style="font-family:{f.v}" onclick={() => { reader.settings.fontFamily = f.v; save(); }}>{f.l}</button>
							{/each}
						</div>
					</div>
					<div>
						<span class="p-label">Align</span>
						<div class="chips">
							<button class="chip" class:on={reader.settings.textAlign === 'center'} onclick={() => { reader.settings.textAlign = 'center'; save(); }}>Center</button>
							<button class="chip" class:on={reader.settings.textAlign === 'left'} onclick={() => { reader.settings.textAlign = 'left'; save(); }}>Left</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Size + Height + Width + Gap -->
			<div class="p-section">
				<div class="p-grid-2">
					<div class="sl-group">
						<div class="sl-head"><span class="sl-label">Size</span><span class="sl-val">{reader.settings.fontSize}px</span></div>
						<input type="range" min="20" max="64" step="2" bind:value={reader.settings.fontSize} oninput={save} />
					</div>
					<div class="sl-group">
						<div class="sl-head"><span class="sl-label">Line height</span><span class="sl-val">{reader.settings.lineHeight.toFixed(1)}</span></div>
						<input type="range" min="1.4" max="4" step="0.2" bind:value={reader.settings.lineHeight} oninput={save} />
					</div>
				</div>
				<div class="p-grid-2">
					<div class="sl-group">
						<div class="sl-head"><span class="sl-label">Line width</span><span class="sl-val">{reader.settings.maxLineWidth}%</span></div>
						<input type="range" min="40" max="100" step="5" bind:value={reader.settings.maxLineWidth} oninput={save} />
					</div>
					<div class="sl-group">
						<div class="sl-head"><span class="sl-label">Word gap</span><span class="sl-val">{reader.settings.wordGap.toFixed(2)}</span></div>
						<input type="range" min="0" max="1" step="0.05" bind:value={reader.settings.wordGap} oninput={save} />
					</div>
				</div>
			</div>

			<!-- Speed + Pitch + Volume (live update during speech) -->
			<div class="p-section">
				<div class="p-grid-2">
					<div class="sl-group">
						<div class="sl-head"><span class="sl-label">Speed</span><span class="sl-val">{reader.settings.wpm} wpm</span></div>
						<input type="range" min="60" max="600" step="10" bind:value={reader.settings.wpm} oninput={saveLive} />
					</div>
					<div class="sl-group">
						<div class="sl-head"><span class="sl-label">Pitch</span><span class="sl-val">{reader.settings.speechPitch.toFixed(1)}</span></div>
						<input type="range" min="0.5" max="2" step="0.1" bind:value={reader.settings.speechPitch} oninput={saveLive} />
					</div>
				</div>
				<div class="sl-group">
					<div class="sl-head">
						<span class="sl-label">Volume</span>
						<span class="sl-val">{Math.round(reader.settings.speechVolume * 100)}%</span>
					</div>
					<input type="range" min="0" max="1" step="0.05" bind:value={reader.settings.speechVolume} oninput={saveLive} />
				</div>
			</div>

			<!-- Voice -->
			<div class="p-section">
				<span class="p-label">Voice ({reader.detectedLang})</span>
				<div class="voice-row">
					<select value={reader.settings.voice} onchange={(e) => changeVoice((e.target as HTMLSelectElement).value)}>
						<option value="">Auto</option>
						{#each langVoices as v}
							<option value={v.name}>{v.name}</option>
						{/each}
						{#if voices.length > langVoices.length}
							<optgroup label="Other languages">
								{#each voices.filter(v => !langVoices.includes(v)) as v}
									<option value={v.name}>{v.name} ({v.lang})</option>
								{/each}
							</optgroup>
						{/if}
					</select>
					<button class="voice-preview" onclick={preview} title="Preview voice">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
					</button>
				</div>
			</div>

			<!-- Toggles -->
			<div class="p-section">
				<label class="toggle-row">
					<span>Bionic reading</span>
					<button class="tog" class:on={reader.settings.bionicReading} aria-label="Bionic reading"
						onclick={() => { reader.settings.bionicReading = !reader.settings.bionicReading; save(); }}>
						<span class="td"></span>
					</button>
				</label>
				{#if reader.settings.bionicReading}
					<div class="sl-group">
						<div class="sl-head"><span class="sl-label">Fixation</span><span class="sl-val">{Math.round(reader.settings.bionicStrength * 100)}%</span></div>
						<input type="range" min="0.3" max="0.8" step="0.05" bind:value={reader.settings.bionicStrength} oninput={save} />
					</div>
				{/if}
				<div class="sl-group">
					<div class="sl-head"><span class="sl-label">Sentence pause</span><span class="sl-val">{reader.settings.sentencePause.toFixed(1)}s</span></div>
					<input type="range" min="0" max="2" step="0.1" bind:value={reader.settings.sentencePause} oninput={save} />
				</div>
			</div>

			<!-- Reading mode + advanced -->
			<div class="p-section">
				<span class="p-label">Mode</span>
				<div class="chips">
					<button class="chip" class:on={reader.settings.readingMode === 'scroll'} onclick={() => { reader.settings.readingMode = 'scroll'; save(); }}>Scroll</button>
					<button class="chip" class:on={reader.settings.readingMode === 'rsvp'} onclick={() => { reader.settings.readingMode = 'rsvp'; save(); }}>RSVP</button>
				</div>
				{#if reader.settings.speedRamp}
					<div class="sl-group">
						<div class="sl-head"><span class="sl-label">Ramp to</span><span class="sl-val">{reader.settings.speedRampMax} wpm</span></div>
						<input type="range" min="200" max="600" step="20" bind:value={reader.settings.speedRampMax} oninput={save} />
					</div>
				{/if}
			</div>

			<div class="p-section no-border">
				<label class="toggle-row">
					<span>Zen mode</span>
					<button class="tog" class:on={reader.settings.zenMode} aria-label="Zen mode"
						onclick={() => { reader.settings.zenMode = !reader.settings.zenMode; save(); }}>
						<span class="td"></span>
					</button>
				</label>
				<label class="toggle-row">
					<span>Speed ramp</span>
					<button class="tog" class:on={reader.settings.speedRamp} aria-label="Speed ramp"
						onclick={() => { reader.settings.speedRamp = !reader.settings.speedRamp; save(); }}>
						<span class="td"></span>
					</button>
				</label>
				<label class="toggle-row">
					<span>Dyslexia font</span>
					<button class="tog" class:on={reader.settings.dyslexiaFont} aria-label="Dyslexia font"
						onclick={() => { reader.settings.dyslexiaFont = !reader.settings.dyslexiaFont; save(); }}>
						<span class="td"></span>
					</button>
				</label>
				<label class="toggle-row">
					<span>Pause on interact</span>
					<button class="tog" class:on={reader.settings.pauseOnMedia} aria-label="Pause on interact"
						onclick={() => { reader.settings.pauseOnMedia = !reader.settings.pauseOnMedia; save(); }}>
						<span class="td"></span>
					</button>
				</label>
				<label class="toggle-row">
					<span>Smooth scroll</span>
					<button class="tog" class:on={reader.settings.smoothScroll} aria-label="Smooth scroll"
						onclick={() => { reader.settings.smoothScroll = !reader.settings.smoothScroll; save(); }}>
						<span class="td"></span>
					</button>
				</label>
				<label class="toggle-row">
					<span>Auto-detect language</span>
					<button class="tog" class:on={reader.settings.autoDetectLang} aria-label="Auto language"
						onclick={() => { reader.settings.autoDetectLang = !reader.settings.autoDetectLang; save(); }}>
						<span class="td"></span>
					</button>
				</label>
			</div>

			<div class="keys">
				<span><kbd>→</kbd><kbd>j</kbd><kbd>spc</kbd> next</span>
				<span><kbd>←</kbd><kbd>k</kbd> prev</span>
				<span><kbd>↓↑</kbd> line</span>
				<span><kbd>p</kbd> play</span>
				<span><kbd>s</kbd> speak</span>
				<span><kbd>+</kbd><kbd>-</kbd> speed</span>
				<span><kbd>b</kbd> bionic</span>
				<span><kbd>f</kbd> zen</span>
				<span><kbd>m</kbd> bookmark</span>
				<span><kbd>⌘F</kbd> search</span>
			</div>
		</div>
	{/if}
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
	.bar.hidden {
		opacity: 0;
		transform: translateX(-50%) translateY(1rem);
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

	/* ── Settings panel ───────────────────────────── */
	.panel {
		padding: 0.7rem 0.9rem 0.8rem;
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		animation: slideUp 0.35s var(--ease);
		max-height: 55vh;
		overflow-y: auto;
		scrollbar-width: none;
	}
	.panel::-webkit-scrollbar { display: none; }
	@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } }

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

	.keys { display: flex; flex-wrap: wrap; gap: 0.3rem 0.6rem; padding-top: 0.3rem; }
	.keys span { color: var(--text-4); font-size: 0.6rem; white-space: nowrap; }
	.keys kbd {
		background: var(--surface); color: var(--text-3);
		padding: 0.1rem 0.25rem; border-radius: 4px;
		font-family: monospace; font-size: 0.55rem;
	}
</style>
