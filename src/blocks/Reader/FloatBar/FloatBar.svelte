<script lang="ts">
	import { reader } from '$lib/stores';

	let visible = $state(true);
	let hideTimeout: ReturnType<typeof setTimeout> | null = null;

	function resetHide() {
		visible = true;
		if (hideTimeout) clearTimeout(hideTimeout);
		hideTimeout = setTimeout(() => {
			if (reader.isPlaying) visible = false;
		}, 3000);
	}

	function handleMove() {
		resetHide();
	}

	$effect(() => {
		// Show bar when paused
		if (!reader.isPlaying) {
			visible = true;
			if (hideTimeout) clearTimeout(hideTimeout);
		} else {
			resetHide();
		}
	});
</script>

<svelte:window onmousemove={handleMove} ontouchmove={handleMove} />

<div class="float-bar" class:hidden={!visible}>
	<!-- Progress -->
	<div class="progress-track">
		<div class="progress-fill" style="width: {reader.progress}%"></div>
	</div>

	<div class="bar-content">
		<!-- Left: back + title -->
		<div class="bar-left">
			<a href="/" class="back-btn" onclick={() => reader.reset()}>&larr;</a>
			<span class="title">{reader.title}</span>
		</div>

		<!-- Center: controls -->
		<div class="bar-center">
			<button class="ctrl-btn" onclick={() => reader.goBack()} disabled={reader.isAtStart}>
				&#9664;&#9664;
			</button>

			<button class="play-btn" onclick={() => reader.toggle()}>
				{#if reader.isPlaying}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="4" width="4" height="16" rx="1" />
						<rect x="14" y="4" width="4" height="16" rx="1" />
					</svg>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
						<polygon points="6,4 20,12 6,20" />
					</svg>
				{/if}
			</button>

			<button class="ctrl-btn" onclick={() => reader.advance()} disabled={reader.isAtEnd}>
				&#9654;&#9654;
			</button>
		</div>

		<!-- Right: settings + counter -->
		<div class="bar-right">
			<span class="counter">{reader.currentWord + 1} / {reader.totalWords}</span>
			<button class="ctrl-btn" aria-label="Settings" onclick={() => reader.toggleSettings()}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="3" />
					<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	.float-bar {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		width: min(90vw, 540px);
		background: rgba(30, 30, 30, 0.85);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
		overflow: hidden;
		transition: opacity 0.5s ease, transform 0.5s ease;
		z-index: 100;
	}

	.float-bar.hidden {
		opacity: 0;
		transform: translateX(-50%) translateY(1rem);
		pointer-events: none;
	}

	.progress-track {
		height: 2px;
		background: rgba(255, 255, 255, 0.04);
	}

	.progress-fill {
		height: 100%;
		background: rgba(255, 255, 255, 0.3);
		transition: width 0.4s ease;
	}

	.bar-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 1rem;
		gap: 1rem;
	}

	.bar-left, .bar-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.bar-right {
		justify-content: flex-end;
	}

	.bar-center {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back-btn {
		color: rgba(255, 255, 255, 0.4);
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.2s;
	}

	.back-btn:hover {
		color: rgba(255, 255, 255, 0.8);
	}

	.title {
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 120px;
	}

	.counter {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.65rem;
		font-variant-numeric: tabular-nums;
		font-family: monospace;
	}

	.play-btn {
		all: unset;
		cursor: pointer;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		transition: all 0.2s;
	}

	.play-btn:hover {
		background: rgba(255, 255, 255, 0.18);
		color: white;
	}

	.ctrl-btn {
		all: unset;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.7rem;
		padding: 0.3rem;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.ctrl-btn:hover:not(:disabled) {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.05);
	}

	.ctrl-btn:disabled {
		opacity: 0.2;
		cursor: not-allowed;
	}
</style>
