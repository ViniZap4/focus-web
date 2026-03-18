<script lang="ts">
	import { reader } from '$lib/stores';
	import { onMount } from 'svelte';
	import { filterVoicesByLang } from '$lib/parsers';

	let visible = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let expanded = $state(false);
	let scrubbing = $state(false);
	let voices: SpeechSynthesisVoice[] = $state([]);

	let langVoices = $derived(filterVoicesByLang(voices, reader.detectedLang));

	onMount(() => {
		function loadVoices() {
			voices = window.speechSynthesis.getVoices();
		}
		loadVoices();
		window.speechSynthesis.onvoiceschanged = loadVoices;
	});

	function resetHide() {
		visible = true;
		if (hideTimer) clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			if (reader.isPlaying && !expanded && !scrubbing) visible = false;
		}, 2500);
	}

	$effect(() => {
		if (!reader.isPlaying) {
			visible = true;
			if (hideTimer) clearTimeout(hideTimer);
		} else {
			resetHide();
		}
	});

	function onScrub(e: MouseEvent | TouchEvent) {
		const track = (e.currentTarget as HTMLElement);
		const rect = track.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
		reader.jumpToPercent(pct);
	}

	function startScrub(e: MouseEvent | TouchEvent) {
		scrubbing = true;
		onScrub(e);

		const onMove = (ev: MouseEvent | TouchEvent) => onScrub(ev);
		const onEnd = () => {
			scrubbing = false;
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onEnd);
			window.removeEventListener('touchmove', onMove);
			window.removeEventListener('touchend', onEnd);
		};

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onEnd);
		window.addEventListener('touchmove', onMove, { passive: true });
		window.addEventListener('touchend', onEnd);
	}

	function adjustSpeed(delta: number) {
		reader.settings.wpm = Math.max(60, Math.min(600, reader.settings.wpm + delta));
		reader.saveSettings();
	}
</script>

<svelte:window onmousemove={resetHide} ontouchmove={resetHide} />

<div class="float-bar" class:hidden={!visible} class:expanded>
	<!-- Scrubable progress bar -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="progress-track"
		class:scrubbing
		onmousedown={startScrub}
		ontouchstart={startScrub}
	>
		<div class="progress-fill" style="width: {reader.progress}%">
			<div class="progress-handle"></div>
		</div>
	</div>

	<div class="bar-main">
		<!-- Left: nav + lang -->
		<div class="bar-left">
			<a href="/" class="nav-btn" onclick={() => reader.reset()} title="Home">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M15 18l-6-6 6-6" />
				</svg>
			</a>

			<button
				class="lang-btn"
				title="Language: {reader.detectedLang}"
				onclick={() => (expanded = !expanded)}
			>
				{reader.detectedLang.toUpperCase()}
			</button>
		</div>

		<!-- Center: transport -->
		<div class="center-controls">
			<button class="ctrl" onclick={() => reader.restart()} title="Restart" disabled={reader.isAtStart}>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="1 4 1 10 7 10" />
					<path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
				</svg>
			</button>

			<button
				class="ctrl skip"
				onclick={() => {
					const prev = reader.lines[reader.currentLineIndex - 1];
					if (prev) reader.jumpToWord(prev.words[0].globalIndex);
				}}
				disabled={reader.isAtStart}
				title="Previous line (↑)"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
					<path d="M19 20L9 12l10-8v16zM7 4h-2v16h2V4z" />
				</svg>
			</button>

			<button class="play-btn" onclick={() => reader.toggle()} title={reader.isPlaying ? 'Pause (p)' : 'Play (p)'}>
				{#if reader.isPlaying}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="4" width="4" height="16" rx="1.5" />
						<rect x="14" y="4" width="4" height="16" rx="1.5" />
					</svg>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
						<path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z" />
					</svg>
				{/if}
			</button>

			<button
				class="ctrl skip"
				onclick={() => {
					const next = reader.lines[reader.currentLineIndex + 1];
					if (next) reader.jumpToWord(next.words[0].globalIndex);
				}}
				disabled={reader.isAtEnd}
				title="Next line (↓)"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
					<path d="M5 4l10 8-10 8V4zM17 4h2v16h-2V4z" />
				</svg>
			</button>

			<!-- Inline speed adjust -->
			<div class="speed-inline">
				<button class="speed-adj" onclick={() => adjustSpeed(-20)} title="Slower">−</button>
				<span class="speed-val">{reader.settings.wpm}</span>
				<button class="speed-adj" onclick={() => adjustSpeed(20)} title="Faster">+</button>
			</div>
		</div>

		<!-- Right: settings + meta -->
		<div class="bar-right">
			{#if reader.etaMinutes > 0}
				<span class="eta">{reader.etaMinutes}m</span>
			{/if}

			{#if reader.mediaCount > 0}
				<span class="media-badge" title="{reader.mediaCount} media items">
					{reader.mediaCount}
					<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
						<rect x="3" y="3" width="18" height="18" rx="2" />
						<circle cx="8" cy="8" r="1.5" />
						<path d="M21 15l-5-5L5 21" />
					</svg>
				</span>
			{/if}

			<button
				class="ctrl"
				aria-label="Settings"
				onclick={() => reader.toggleSettings()}
				title="Settings (esc)"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<circle cx="12" cy="12" r="3" />
					<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Expanded panel: voice picker + options -->
	{#if expanded}
		<div class="expand-panel">
			<div class="expand-row">
				<span class="expand-label">Voice</span>
				<select
					class="voice-select"
					value={reader.settings.voice}
					onchange={(e) => {
						reader.settings.voice = (e.target as HTMLSelectElement).value;
						reader.saveSettings();
					}}
				>
					<option value="">Auto ({reader.detectedLang})</option>
					{#if langVoices.length > 0}
						<optgroup label="Matching ({reader.detectedLang})">
							{#each langVoices as v}
								<option value={v.name}>{v.name}</option>
							{/each}
						</optgroup>
					{/if}
					<optgroup label="All voices">
						{#each voices as v}
							<option value={v.name}>{v.name} ({v.lang})</option>
						{/each}
					</optgroup>
				</select>
			</div>

			<div class="expand-row">
				<span class="expand-label">Size</span>
				<input
					type="range"
					min="18"
					max="64"
					step="2"
					bind:value={reader.settings.fontSize}
					oninput={() => reader.saveSettings()}
				/>
				<span class="expand-val">{reader.settings.fontSize}</span>
			</div>

			<div class="expand-meta">
				<span>{reader.currentWord + 1} / {reader.totalWords}</span>
				<span>{reader.title}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.float-bar {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%) translateY(0);
		width: min(92vw, 500px);
		background: rgba(18, 18, 18, 0.85);
		backdrop-filter: blur(30px) saturate(1.2);
		-webkit-backdrop-filter: blur(30px) saturate(1.2);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 20px;
		overflow: hidden;
		transition:
			opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
		z-index: 100;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
	}

	.float-bar.hidden {
		opacity: 0;
		transform: translateX(-50%) translateY(1.5rem);
		pointer-events: none;
	}

	/* Scrubable progress */
	.progress-track {
		height: 4px;
		background: rgba(255, 255, 255, 0.03);
		cursor: pointer;
		position: relative;
		transition: height 0.2s;
	}

	.progress-track:hover,
	.progress-track.scrubbing {
		height: 8px;
	}

	.progress-fill {
		height: 100%;
		background: rgba(255, 255, 255, 0.25);
		transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		border-radius: 1px;
		position: relative;
	}

	.progress-handle {
		position: absolute;
		right: -4px;
		top: 50%;
		transform: translateY(-50%) scale(0);
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: white;
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
	}

	.progress-track:hover .progress-handle,
	.progress-track.scrubbing .progress-handle {
		transform: translateY(-50%) scale(1);
	}

	.bar-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.6rem;
		gap: 0.4rem;
	}

	.bar-left, .bar-right {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		min-width: 0;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 10px;
		color: rgba(255, 255, 255, 0.3);
		text-decoration: none;
		transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		flex-shrink: 0;
	}

	.nav-btn:hover {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.05);
	}

	.lang-btn {
		all: unset;
		cursor: pointer;
		font-size: 0.55rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.25);
		padding: 0.2rem 0.4rem;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.06);
		transition: all 0.25s;
		flex-shrink: 0;
	}

	.lang-btn:hover {
		color: rgba(255, 255, 255, 0.6);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.center-controls {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}

	.play-btn {
		all: unset;
		cursor: pointer;
		width: 38px;
		height: 38px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.8);
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		flex-shrink: 0;
	}

	.play-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		color: white;
		transform: scale(1.06);
	}

	.play-btn:active {
		transform: scale(0.96);
	}

	.ctrl {
		all: unset;
		cursor: pointer;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.2);
		transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		flex-shrink: 0;
	}

	.ctrl:hover:not(:disabled) {
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
	}

	.ctrl:disabled {
		opacity: 0.12;
		cursor: not-allowed;
	}

	.speed-inline {
		display: flex;
		align-items: center;
		gap: 0.1rem;
		margin-left: 0.15rem;
	}

	.speed-adj {
		all: unset;
		cursor: pointer;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 5px;
		color: rgba(255, 255, 255, 0.15);
		font-size: 0.75rem;
		transition: all 0.2s;
	}

	.speed-adj:hover {
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.04);
	}

	.speed-val {
		color: rgba(255, 255, 255, 0.15);
		font-size: 0.55rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		min-width: 22px;
		text-align: center;
	}

	.eta {
		color: rgba(255, 255, 255, 0.1);
		font-size: 0.55rem;
		font-family: monospace;
		white-space: nowrap;
	}

	.media-badge {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		color: rgba(140, 180, 255, 0.3);
		font-size: 0.55rem;
		font-family: monospace;
	}

	/* Expanded panel */
	.expand-panel {
		padding: 0.5rem 0.8rem 0.65rem;
		border-top: 1px solid rgba(255, 255, 255, 0.03);
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideDown {
		from { opacity: 0; transform: translateY(-4px); }
	}

	.expand-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.expand-label {
		color: rgba(255, 255, 255, 0.15);
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		min-width: 32px;
	}

	.voice-select {
		flex: 1;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.4);
		padding: 0.3rem 0.4rem;
		border-radius: 6px;
		font-size: 0.65rem;
		outline: none;
	}

	.voice-select:focus {
		border-color: rgba(255, 255, 255, 0.1);
	}

	.expand-row input[type='range'] {
		flex: 1;
		accent-color: rgba(255, 255, 255, 0.35);
		height: 3px;
	}

	.expand-val {
		color: rgba(255, 255, 255, 0.15);
		font-size: 0.6rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		min-width: 24px;
		text-align: right;
	}

	.expand-meta {
		display: flex;
		justify-content: space-between;
		color: rgba(255, 255, 255, 0.08);
		font-size: 0.55rem;
		font-family: monospace;
	}
</style>
