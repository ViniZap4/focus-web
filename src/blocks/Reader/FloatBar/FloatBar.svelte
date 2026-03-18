<script lang="ts">
	import { reader } from '$lib/stores';
	import { filterVoicesByLang } from '$lib/parsers';
	import { onMount } from 'svelte';

	let visible = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let scrubbing = $state(false);
	let showPanel = $state(false);
	let voices: SpeechSynthesisVoice[] = $state([]);
	let langVoices = $derived(filterVoicesByLang(voices, reader.detectedLang));

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

	function changeVoice(name: string) {
		reader.settings.voice = name;
		save();
		if (reader.isSpeaking) reader.restartSpeech();
	}

	function preview() {
		window.speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance('Focus, word by word.');
		u.rate = reader.settings.wpm / 180;
		u.pitch = reader.settings.speechPitch;
		u.lang = reader.detectedLang;
		if (reader.settings.voice) {
			const v = voices.find((v) => v.name === reader.settings.voice);
			if (v) u.voice = v;
		}
		window.speechSynthesis.speak(u);
	}

	function resetHide() {
		visible = true;
		if (hideTimer) clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			if (reader.isPlaying && !scrubbing && !showPanel) visible = false;
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
		const bar = document.querySelector('.prog') as HTMLElement;
		if (!bar) return;
		const rect = bar.getBoundingClientRect();
		const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
		reader.jumpToPercent(Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100)));
	}
</script>

<svelte:window onmousemove={resetHide} ontouchmove={resetHide} />

<div class="bar" class:hidden={!visible}>
	<!-- Progress scrubber -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="prog" class:scrubbing onmousedown={startScrub} ontouchstart={startScrub}>
		<div class="prog-fill" style="width:{reader.progress}%">
			<div class="prog-dot"></div>
		</div>
	</div>

	<!-- Main row -->
	<div class="main">
		<a href="/" class="ic" onclick={() => reader.reset()}>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>
			<span class="tip">Home</span>
		</a>

		<button class="ic" disabled={reader.isAtStart} onclick={() => {
			const p = reader.lines[reader.currentLineIndex - 1];
			if (p) reader.jumpToWord(p.words[0].globalIndex);
		}}>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 4h-2v16h2V4z"/></svg>
			<span class="tip">Prev line</span>
		</button>

		<button class="play" onclick={() => reader.toggle()}>
			{#if reader.isPlaying}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
			{/if}
			<span class="tip">{reader.isPlaying ? 'Pause · p' : 'Play · p'}</span>
		</button>

		<button class="ic" disabled={reader.isAtEnd} onclick={() => {
			const n = reader.lines[reader.currentLineIndex + 1];
			if (n) reader.jumpToWord(n.words[0].globalIndex);
		}}>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4zM17 4h2v16h-2V4z"/></svg>
			<span class="tip">Next line</span>
		</button>

		<div class="sep"></div>

		<span class="meta">{reader.currentWord + 1}/{reader.totalWords}{reader.etaMinutes > 0 ? ` · ${reader.etaMinutes}m` : ''}</span>

		<button class="ic" onclick={() => (showPanel = !showPanel)}>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/>
				<circle cx="10" cy="8" r="2" fill="currentColor"/><circle cx="16" cy="16" r="2" fill="currentColor"/>
			</svg>
			<span class="tip">Settings</span>
		</button>
	</div>

	<!-- Settings panel (inline in float bar) -->
	{#if showPanel}
		<div class="panel">
			<!-- Font -->
			<div class="p-row">
				<span class="p-label">Font</span>
				<div class="chips">
					{#each fonts as f}
						<button
							class="chip"
							class:on={reader.settings.fontFamily === f.v}
							style="font-family:{f.v}"
							onclick={() => { reader.settings.fontFamily = f.v; save(); }}
						>{f.l}</button>
					{/each}
				</div>
			</div>

			<!-- Size + Height -->
			<div class="p-row dual">
				<div class="sl">
					<label for="fs">Size</label>
					<input id="fs" type="range" min="20" max="64" step="2" bind:value={reader.settings.fontSize} oninput={save} />
					<span class="sv">{reader.settings.fontSize}</span>
				</div>
				<div class="sl">
					<label for="lh">Height</label>
					<input id="lh" type="range" min="1.4" max="4" step="0.2" bind:value={reader.settings.lineHeight} oninput={save} />
					<span class="sv">{reader.settings.lineHeight.toFixed(1)}</span>
				</div>
			</div>

			<!-- Speed + Pitch -->
			<div class="p-row dual">
				<div class="sl">
					<label for="wpm">WPM</label>
					<input id="wpm" type="range" min="60" max="600" step="10" bind:value={reader.settings.wpm} oninput={save} />
					<span class="sv">{reader.settings.wpm}</span>
				</div>
				<div class="sl">
					<label for="pi">Pitch</label>
					<input id="pi" type="range" min="0.5" max="2" step="0.1" bind:value={reader.settings.speechPitch} oninput={save} />
					<span class="sv">{reader.settings.speechPitch.toFixed(1)}</span>
				</div>
			</div>

			<!-- Voice -->
			<div class="p-row">
				<div class="voice-row">
					<select value={reader.settings.voice} onchange={(e) => changeVoice((e.target as HTMLSelectElement).value)}>
						<option value="">Auto ({reader.detectedLang})</option>
						{#each langVoices as v}
							<option value={v.name}>{v.name}</option>
						{/each}
						{#if voices.length > langVoices.length}
							<optgroup label="Other">
								{#each voices.filter(v => !langVoices.includes(v)) as v}
									<option value={v.name}>{v.name} ({v.lang})</option>
								{/each}
							</optgroup>
						{/if}
					</select>
					<button class="ic-sm" onclick={preview}>
						<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
						<span class="tip">Preview</span>
					</button>
				</div>
			</div>

			<!-- Toggles -->
			<div class="p-row toggles">
				<label>Smooth scroll
					<button class="tog" class:on={reader.settings.smoothScroll} aria-label="Smooth scroll"
						onclick={() => { reader.settings.smoothScroll = !reader.settings.smoothScroll; save(); }}>
						<span class="td"></span>
					</button>
				</label>
				<label>Auto language
					<button class="tog" class:on={reader.settings.autoDetectLang} aria-label="Auto language"
						onclick={() => { reader.settings.autoDetectLang = !reader.settings.autoDetectLang; save(); }}>
						<span class="td"></span>
					</button>
				</label>
			</div>

			<!-- Keys reference -->
			<div class="keys">
				<kbd>→</kbd><kbd>j</kbd><kbd>spc</kbd> next &nbsp;
				<kbd>←</kbd><kbd>k</kbd> prev &nbsp;
				<kbd>↓↑</kbd> line &nbsp;
				<kbd>p</kbd> play &nbsp;
				<kbd>s</kbd> speak
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
		width: min(92vw, 480px);
		background: rgba(14, 14, 14, 0.92);
		backdrop-filter: blur(30px) saturate(1.3);
		-webkit-backdrop-filter: blur(30px) saturate(1.3);
		border: 1px solid rgba(255,255,255,0.05);
		border-radius: 20px;
		overflow: hidden;
		z-index: 100;
		box-shadow: 0 8px 40px rgba(0,0,0,0.5);
		transition: opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1);
	}
	.bar.hidden {
		opacity: 0;
		transform: translateX(-50%) translateY(1rem);
		pointer-events: none;
	}

	/* Progress */
	.prog { height: 3px; background: rgba(255,255,255,0.03); cursor: pointer; transition: height 0.2s; }
	.prog:hover, .prog.scrubbing { height: 7px; }
	.prog-fill { height: 100%; background: rgba(255,255,255,0.2); transition: width 0.3s cubic-bezier(0.16,1,0.3,1); position: relative; }
	.prog-dot {
		position: absolute; right: -5px; top: 50%;
		transform: translateY(-50%) scale(0);
		width: 10px; height: 10px; border-radius: 50%; background: white;
		box-shadow: 0 0 6px rgba(0,0,0,0.4);
		transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
	}
	.prog:hover .prog-dot, .prog.scrubbing .prog-dot { transform: translateY(-50%) scale(1); }

	/* Main controls */
	.main {
		display: flex;
		align-items: center;
		padding: 0.35rem 0.6rem;
		gap: 0.15rem;
	}

	.sep { flex: 1; }

	/* Icon button with tooltip */
	.ic {
		all: unset; cursor: pointer;
		width: 32px; height: 32px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 10px;
		color: rgba(255,255,255,0.2);
		text-decoration: none;
		transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
		flex-shrink: 0;
		position: relative;
	}
	.ic:hover:not(:disabled) { color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.05); }
	.ic:disabled { opacity: 0.1; cursor: not-allowed; }

	/* Tooltip */
	.tip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%) translateY(4px);
		opacity: 0;
		pointer-events: none;
		background: rgba(0,0,0,0.85);
		color: rgba(255,255,255,0.6);
		font-size: 0.55rem;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		white-space: nowrap;
		transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
		z-index: 10;
	}
	.ic:hover .tip, .play:hover .tip, .ic-sm:hover .tip {
		opacity: 1;
		transform: translateX(-50%) translateY(-4px);
	}

	/* Play button */
	.play {
		all: unset; cursor: pointer;
		width: 42px; height: 42px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 50%;
		background: rgba(255,255,255,0.07);
		color: rgba(255,255,255,0.8);
		transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
		flex-shrink: 0;
		margin: 0 0.2rem;
		position: relative;
	}
	.play:hover { background: rgba(255,255,255,0.14); color: white; transform: scale(1.05); }
	.play:active { transform: scale(0.95); }

	.meta {
		color: rgba(255,255,255,0.1);
		font-size: 0.55rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		padding: 0 0.3rem;
	}

	/* ── Settings panel ─────────────────────────────────── */
	.panel {
		padding: 0.6rem 0.8rem 0.7rem;
		border-top: 1px solid rgba(255,255,255,0.04);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
	}
	@keyframes slideUp { from { opacity: 0; transform: translateY(6px); } }

	.p-row { display: flex; flex-direction: column; gap: 0.25rem; }
	.p-row.dual { flex-direction: row; gap: 0.6rem; }
	.p-label { color: rgba(255,255,255,0.15); font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.08em; }

	.chips { display: flex; gap: 0.2rem; }
	.chip {
		all: unset; cursor: pointer;
		padding: 0.2rem 0.5rem; border-radius: 7px;
		font-size: 0.6rem; color: rgba(255,255,255,0.18);
		border: 1px solid rgba(255,255,255,0.04);
		transition: all 0.2s;
	}
	.chip:hover { color: rgba(255,255,255,0.45); border-color: rgba(255,255,255,0.08); }
	.chip.on { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); }

	.sl { flex: 1; display: flex; align-items: center; gap: 0.3rem; }
	.sl label { color: rgba(255,255,255,0.15); font-size: 0.5rem; text-transform: uppercase; letter-spacing: 0.06em; min-width: 28px; }
	.sl input[type='range'] { flex: 1; accent-color: rgba(255,255,255,0.3); height: 3px; }
	.sv { color: rgba(255,255,255,0.12); font-size: 0.5rem; font-family: monospace; font-variant-numeric: tabular-nums; min-width: 24px; text-align: right; }

	.voice-row { display: flex; gap: 0.25rem; }
	.voice-row select {
		flex: 1;
		background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04);
		color: rgba(255,255,255,0.4); padding: 0.25rem 0.4rem; border-radius: 7px;
		font-size: 0.6rem; outline: none;
	}
	.voice-row select:focus { border-color: rgba(255,255,255,0.1); }

	.ic-sm {
		all: unset; cursor: pointer;
		width: 26px; height: 26px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 7px; color: rgba(255,255,255,0.18);
		border: 1px solid rgba(255,255,255,0.04);
		transition: all 0.2s; position: relative;
	}
	.ic-sm:hover { color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.04); }

	.toggles { flex-direction: column; gap: 0.35rem; }
	.toggles label {
		display: flex; align-items: center; justify-content: space-between;
		color: rgba(255,255,255,0.18); font-size: 0.55rem;
	}
	.tog {
		all: unset; cursor: pointer;
		width: 30px; height: 16px; border-radius: 8px;
		background: rgba(255,255,255,0.06); position: relative;
		transition: background 0.3s;
	}
	.tog.on { background: rgba(255,255,255,0.18); }
	.td {
		position: absolute; top: 2px; left: 2px;
		width: 12px; height: 12px; border-radius: 50%;
		background: rgba(255,255,255,0.4);
		transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
	}
	.tog.on .td { left: 16px; background: white; }

	.keys {
		color: rgba(255,255,255,0.08); font-size: 0.5rem;
		padding-top: 0.15rem; line-height: 1.8;
	}
	.keys kbd {
		background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.15);
		padding: 0.05rem 0.2rem; border-radius: 3px;
		font-family: monospace; font-size: 0.45rem;
	}
</style>
