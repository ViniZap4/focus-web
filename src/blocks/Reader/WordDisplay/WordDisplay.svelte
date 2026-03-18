<script lang="ts">
	import { reader } from '$lib/stores';

	let containerEl: HTMLDivElement | undefined = $state();
	let scrollRAF = 0;

	// ── Scroll: keep active word vertically centered ──────────────────────
	//
	// On every currentWord change:
	//   1. Cancel any pending RAF (debounce rapid changes from speech).
	//   2. In the next frame, find the active element and scroll it to center.
	//   3. Use 'instant' during playback (smooth can't keep up at high WPM).
	//      Use 'smooth' only for manual navigation.

	$effect(() => {
		const word = reader.currentWord;
		const playing = reader.isPlaying;
		const smooth = reader.settings.smoothScroll;

		cancelAnimationFrame(scrollRAF);
		scrollRAF = requestAnimationFrame(() => {
			if (!containerEl) return;

			const el = containerEl.querySelector(`[data-active="true"]`) as HTMLElement | null;
			if (!el) return;

			// getBoundingClientRect gives current visual position (accounts for scroll)
			const cRect = containerEl.getBoundingClientRect();
			const eRect = el.getBoundingClientRect();

			// Distance from element center to container center
			const offset =
				eRect.top + eRect.height / 2 - (cRect.top + cRect.height / 2);

			// Scroll by that offset to center the element
			containerEl.scrollTo({
				top: containerEl.scrollTop + offset,
				behavior: playing || !smooth ? 'instant' : 'smooth'
			});

			// Suppress unused variable warnings
			void word;
		});
	});

	// ── Word classification ───────────────────────────────────────────────

	function cls(gi: number): string {
		const d = gi - reader.currentWord;
		if (d === 0) return 'active';
		if (d === -1 || d === -2) return 'near-before';
		if (d === 1 || d === 2) return 'near-after';
		return d < 0 ? 'past' : 'future';
	}

	function hasMedia(gi: number): boolean {
		return reader.media.some((m) => m.triggerAtWord === gi);
	}

	function getMedia(gi: number) {
		return reader.media.find((m) => m.triggerAtWord === gi);
	}
</script>

<div
	bind:this={containerEl}
	class="wd"
	style="
		font-family: '{reader.settings.fontFamily}', system-ui, sans-serif;
		font-size: {reader.settings.fontSize}px;
		letter-spacing: {reader.settings.letterSpacing}px;
		line-height: {reader.settings.lineHeight};
	"
>
	<div class="sp"></div>

	{#each reader.lines as line (line.lineIndex)}
		<div class="ln">
			{#each line.words as w (w.globalIndex)}
				<button
					class="w {cls(w.globalIndex)}"
					data-active={w.globalIndex === reader.currentWord}
					onclick={() => {
						reader.jumpToWord(w.globalIndex);
						const m = getMedia(w.globalIndex);
						if (m) reader.showMediaItem(m);
					}}
				>
					{w.text}
					{#if hasMedia(w.globalIndex)}
						<span class="dot"></span>
					{/if}
				</button>
			{/each}
		</div>
	{/each}

	<div class="sp"></div>
</div>

<style>
	.wd {
		position: fixed;
		inset: 0;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 2rem;
	}
	.wd::-webkit-scrollbar {
		display: none;
	}

	.sp {
		flex-shrink: 0;
		height: 50vh;
	}

	.ln {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.3em;
		padding: 0.1em 0;
		max-width: 70vw;
	}

	.w {
		all: unset;
		cursor: pointer;
		position: relative;
		padding: 0.04em 0.06em;
		border-radius: 4px;
		transition:
			color 0.35s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
			filter 0.35s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.w.active {
		color: white;
		transform: scale(1.08);
		filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.1));
	}
	.w.near-before {
		color: rgba(255, 255, 255, 0.35);
	}
	.w.near-after {
		color: rgba(255, 255, 255, 0.2);
	}
	.w.past {
		color: rgba(255, 255, 255, 0.12);
	}
	.w.future {
		color: rgba(255, 255, 255, 0.05);
	}
	.w:hover:not(.active) {
		color: rgba(255, 255, 255, 0.45);
		transition-duration: 0.1s;
	}

	.dot {
		position: absolute;
		top: -2px;
		right: -4px;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(140, 180, 255, 0.5);
		animation: pulse 2s ease-in-out infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 0.5; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.4); }
	}
</style>
