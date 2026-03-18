<script lang="ts">
	import { reader } from '$lib/stores';

	let containerEl: HTMLDivElement | undefined = $state();
	let scrollRAF = 0;

	// ── Scroll: keep active word centered ─────────────────────────────────
	//
	// Uses requestAnimationFrame to debounce. When currentWord changes
	// rapidly (speech), only the latest position is scrolled to.
	// No "scrolling" flag — just cancel the previous RAF.

	$effect(() => {
		void reader.currentWord;

		cancelAnimationFrame(scrollRAF);
		scrollRAF = requestAnimationFrame(() => {
			if (!containerEl) return;

			const active = containerEl.querySelector('[data-active="true"]') as HTMLElement | null;
			if (!active) return;

			const containerH = containerEl.clientHeight;
			const activeTop = active.offsetTop;
			const activeH = active.offsetHeight;

			// Target: center of active word = center of container
			const targetScroll = activeTop - containerH / 2 + activeH / 2;

			containerEl.scrollTo({
				top: targetScroll,
				behavior: reader.settings.smoothScroll ? 'smooth' : 'instant'
			});
		});
	});

	// ── Word state classification ─────────────────────────────────────────
	//
	// Determines visual state based on distance from current word.
	// Returns a CSS class string.

	function wordClass(globalIndex: number): string {
		const diff = globalIndex - reader.currentWord;
		if (diff === 0) return 'active';
		if (diff === -1 || diff === -2) return 'near-before';
		if (diff === 1 || diff === 2) return 'near-after';
		if (diff < 0) return 'past';
		return 'future';
	}

	function hasMediaAt(globalIndex: number): boolean {
		return reader.media.some((m) => m.triggerAtWord === globalIndex);
	}

	function mediaAt(globalIndex: number) {
		return reader.media.find((m) => m.triggerAtWord === globalIndex);
	}
</script>

<div
	bind:this={containerEl}
	class="word-display"
	style="
		font-family: '{reader.settings.fontFamily}', system-ui, sans-serif;
		font-size: {reader.settings.fontSize}px;
		letter-spacing: {reader.settings.letterSpacing}px;
		line-height: {reader.settings.lineHeight};
	"
>
	<div class="spacer"></div>

	{#each reader.lines as line (line.lineIndex)}
		<div class="line">
			{#each line.words as word (word.globalIndex)}
				<button
					class="word {wordClass(word.globalIndex)}"
					data-active={word.globalIndex === reader.currentWord}
					onclick={() => {
						reader.jumpToWord(word.globalIndex);
						const m = mediaAt(word.globalIndex);
						if (m) reader.showMediaItem(m);
					}}
				>
					{word.text}
					{#if hasMediaAt(word.globalIndex)}
						<span class="media-dot"></span>
					{/if}
				</button>
			{/each}
		</div>
	{/each}

	<div class="spacer"></div>
</div>

<style>
	.word-display {
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

	.word-display::-webkit-scrollbar {
		display: none;
	}

	.spacer {
		flex-shrink: 0;
		height: 50vh;
	}

	.line {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.3em;
		padding: 0.1em 0;
		max-width: 70vw;
	}

	.word {
		all: unset;
		cursor: pointer;
		position: relative;
		padding: 0.04em 0.06em;
		border-radius: 4px;
		transition:
			color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
			filter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.word.active {
		color: white;
		transform: scale(1.08);
		filter: drop-shadow(0 0 18px rgba(255, 255, 255, 0.12));
	}

	.word.near-before {
		color: rgba(255, 255, 255, 0.35);
	}

	.word.near-after {
		color: rgba(255, 255, 255, 0.2);
	}

	.word.past {
		color: rgba(255, 255, 255, 0.12);
	}

	.word.future {
		color: rgba(255, 255, 255, 0.05);
	}

	.word:hover:not(.active) {
		color: rgba(255, 255, 255, 0.45);
		transition-duration: 0.12s;
	}

	.media-dot {
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
		0%,
		100% {
			opacity: 0.5;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.4);
		}
	}
</style>
