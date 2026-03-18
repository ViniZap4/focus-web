<script lang="ts">
	import { reader } from '$lib/stores';

	let visible = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let expanded = $state(false);

	function resetHide() {
		visible = true;
		if (hideTimer) clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			if (reader.isPlaying && !expanded) visible = false;
		}, 2500);
	}

	function handleMove() {
		resetHide();
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

<svelte:window onmousemove={handleMove} ontouchmove={handleMove} />

<div class="float-bar" class:hidden={!visible} class:expanded>
	<!-- Progress -->
	<div class="progress-track">
		<div class="progress-fill" style="width: {reader.progress}%"></div>
	</div>

	<div class="bar-main">
		<a href="/" class="nav-btn" onclick={() => reader.reset()} title="Home">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M15 18l-6-6 6-6" />
			</svg>
		</a>

		<div class="center-controls">
			<button
				class="ctrl skip"
				onclick={() => {
					const prev = reader.lines[reader.currentLineIndex - 1];
					if (prev) reader.jumpToWord(prev.words[0].globalIndex);
				}}
				disabled={reader.isAtStart}
				title="Previous line"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
					<path d="M19 20L9 12l10-8v16zM7 4h-2v16h2V4z" />
				</svg>
			</button>

			<button class="play-btn" onclick={() => reader.toggle()} title={reader.isPlaying ? 'Pause' : 'Play'}>
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
				title="Next line"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
					<path d="M5 4l10 8-10 8V4zM17 4h2v16h-2V4z" />
				</svg>
			</button>
		</div>

		<div class="right-controls">
			<button
				class="ctrl"
				onclick={() => (expanded = !expanded)}
				title="More options"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
					<circle cx="12" cy="5" r="2" />
					<circle cx="12" cy="12" r="2" />
					<circle cx="12" cy="19" r="2" />
				</svg>
			</button>

			<button
				class="ctrl"
				aria-label="Settings"
				onclick={() => reader.toggleSettings()}
				title="Settings"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<circle cx="12" cy="12" r="3" />
					<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Expanded panel -->
	{#if expanded}
		<div class="expand-panel">
			<div class="expand-row">
				<span class="expand-label">Speed</span>
				<input
					type="range"
					min="60"
					max="600"
					step="10"
					bind:value={reader.settings.wpm}
					oninput={() => reader.saveSettings()}
				/>
				<span class="expand-val">{reader.settings.wpm}</span>
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
		width: min(88vw, 420px);
		background: rgba(22, 22, 22, 0.8);
		backdrop-filter: blur(30px) saturate(1.2);
		-webkit-backdrop-filter: blur(30px) saturate(1.2);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 20px;
		overflow: hidden;
		transition:
			opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
		z-index: 100;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
	}

	.float-bar.hidden {
		opacity: 0;
		transform: translateX(-50%) translateY(1.5rem);
		pointer-events: none;
	}

	.progress-track {
		height: 2px;
		background: rgba(255, 255, 255, 0.03);
	}

	.progress-fill {
		height: 100%;
		background: rgba(255, 255, 255, 0.25);
		transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
		border-radius: 1px;
	}

	.bar-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		color: rgba(255, 255, 255, 0.3);
		text-decoration: none;
		transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.nav-btn:hover {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.05);
	}

	.center-controls {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.play-btn {
		all: unset;
		cursor: pointer;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.8);
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		color: rgba(255, 255, 255, 0.25);
		transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.ctrl:hover:not(:disabled) {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.05);
	}

	.ctrl:disabled {
		opacity: 0.15;
		cursor: not-allowed;
	}

	.right-controls {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}

	/* Expanded panel */
	.expand-panel {
		padding: 0.5rem 1rem 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.03);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			max-height: 0;
		}
		to {
			opacity: 1;
			max-height: 200px;
		}
	}

	.expand-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.expand-label {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		min-width: 36px;
	}

	.expand-row input[type='range'] {
		flex: 1;
		accent-color: rgba(255, 255, 255, 0.4);
		height: 3px;
	}

	.expand-val {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.65rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		min-width: 28px;
		text-align: right;
	}

	.expand-meta {
		display: flex;
		justify-content: space-between;
		color: rgba(255, 255, 255, 0.1);
		font-size: 0.6rem;
		font-family: monospace;
		padding-top: 0.25rem;
	}
</style>
