<script lang="ts">
	import { reader } from '$lib/stores';

	let visible = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let scrubbing = $state(false);

	function resetHide() {
		visible = true;
		if (hideTimer) clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			if (reader.isPlaying && !scrubbing) visible = false;
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
		const track = (e.currentTarget || e.target) as HTMLElement;
		const bar = track.closest('.progress-track') as HTMLElement;
		if (!bar) return;
		const rect = bar.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
		reader.jumpToPercent(pct);
	}

	function startScrub(e: MouseEvent | TouchEvent) {
		scrubbing = true;
		onScrub(e);
		const onMove = (ev: MouseEvent | TouchEvent) => {
			const bar = document.querySelector('.progress-track') as HTMLElement;
			if (!bar) return;
			const rect = bar.getBoundingClientRect();
			const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
			const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
			reader.jumpToPercent(pct);
		};
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
</script>

<svelte:window onmousemove={resetHide} ontouchmove={resetHide} />

<div class="bar" class:hidden={!visible}>
	<!-- Scrubable progress -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="progress-track" class:scrubbing onmousedown={startScrub} ontouchstart={startScrub}>
		<div class="progress-fill" style="width: {reader.progress}%">
			<div class="handle"></div>
		</div>
	</div>

	<div class="row">
		<!-- Back -->
		<a href="/" class="btn" onclick={() => reader.reset()} title="Home">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>
		</a>

		<!-- Skip back -->
		<button class="btn" disabled={reader.isAtStart} title="Prev line (↑)" onclick={() => {
			const p = reader.lines[reader.currentLineIndex - 1];
			if (p) reader.jumpToWord(p.words[0].globalIndex);
		}}>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 4h-2v16h2V4z"/></svg>
		</button>

		<!-- Play / Pause -->
		<button class="play" onclick={() => reader.toggle()} title={reader.isPlaying ? 'Pause (p)' : 'Play (p)'}>
			{#if reader.isPlaying}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
			{/if}
		</button>

		<!-- Skip forward -->
		<button class="btn" disabled={reader.isAtEnd} title="Next line (↓)" onclick={() => {
			const n = reader.lines[reader.currentLineIndex + 1];
			if (n) reader.jumpToWord(n.words[0].globalIndex);
		}}>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4zM17 4h2v16h-2V4z"/></svg>
		</button>

		<!-- Spacer -->
		<div class="spacer"></div>

		<!-- Counter + ETA -->
		<span class="meta">
			{reader.currentWord + 1}/{reader.totalWords}
			{#if reader.etaMinutes > 0}
				· {reader.etaMinutes}m
			{/if}
		</span>

		<!-- Settings -->
		<button class="btn" aria-label="Settings" onclick={() => reader.toggleSettings()} title="Settings">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
		</button>
	</div>
</div>

<style>
	.bar {
		position: fixed;
		bottom: 1.25rem;
		left: 50%;
		transform: translateX(-50%);
		width: min(90vw, 440px);
		background: rgba(16, 16, 16, 0.88);
		backdrop-filter: blur(30px) saturate(1.2);
		-webkit-backdrop-filter: blur(30px) saturate(1.2);
		border: 1px solid rgba(255,255,255,0.05);
		border-radius: 18px;
		overflow: hidden;
		z-index: 100;
		box-shadow: 0 6px 32px rgba(0,0,0,0.5);
		transition: opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1);
	}
	.bar.hidden {
		opacity: 0;
		transform: translateX(-50%) translateY(1rem);
		pointer-events: none;
	}

	/* Progress */
	.progress-track {
		height: 3px;
		background: rgba(255,255,255,0.03);
		cursor: pointer;
		transition: height 0.2s;
	}
	.progress-track:hover, .progress-track.scrubbing { height: 6px; }

	.progress-fill {
		height: 100%;
		background: rgba(255,255,255,0.22);
		transition: width 0.35s cubic-bezier(0.16,1,0.3,1);
		position: relative;
	}
	.handle {
		position: absolute;
		right: -5px; top: 50%;
		transform: translateY(-50%) scale(0);
		width: 10px; height: 10px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 0 6px rgba(0,0,0,0.5);
		transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
	}
	.progress-track:hover .handle, .progress-track.scrubbing .handle {
		transform: translateY(-50%) scale(1);
	}

	/* Main row */
	.row {
		display: flex;
		align-items: center;
		padding: 0.35rem 0.55rem;
		gap: 0.2rem;
	}

	.spacer { flex: 1; }

	.btn {
		all: unset; cursor: pointer;
		width: 30px; height: 30px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 9px;
		color: rgba(255,255,255,0.22);
		text-decoration: none;
		transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
		flex-shrink: 0;
	}
	.btn:hover:not(:disabled) {
		color: rgba(255,255,255,0.6);
		background: rgba(255,255,255,0.05);
	}
	.btn:disabled { opacity: 0.1; cursor: not-allowed; }

	.play {
		all: unset; cursor: pointer;
		width: 40px; height: 40px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 50%;
		background: rgba(255,255,255,0.07);
		color: rgba(255,255,255,0.8);
		transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
		flex-shrink: 0;
		margin: 0 0.15rem;
	}
	.play:hover { background: rgba(255,255,255,0.14); color: white; transform: scale(1.05); }
	.play:active { transform: scale(0.95); }

	.meta {
		color: rgba(255,255,255,0.1);
		font-size: 0.55rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		padding: 0 0.2rem;
	}
</style>
