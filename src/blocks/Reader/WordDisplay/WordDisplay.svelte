<script lang="ts">
	import { reader } from '$lib/stores';

	let container: HTMLDivElement | undefined = $state();
	let raf = 0;

	// Scroll active word to vertical center.
	// Uses setInterval-style: only the latest RAF executes.
	$effect(() => {
		// Track dependency
		const _ = reader.currentWord;

		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			if (!container) return;

			const el = container.querySelector('[data-active="true"]') as HTMLElement | null;
			if (!el) return;

			const cRect = container.getBoundingClientRect();
			const eRect = el.getBoundingClientRect();

			const elCenter = eRect.top + eRect.height / 2;
			const boxCenter = cRect.top + cRect.height / 2;
			const delta = elCenter - boxCenter;

			// Always instant during play — smooth can't keep up
			container.scrollTo({
				top: container.scrollTop + delta,
				behavior: reader.isPlaying ? 'instant' : 'smooth'
			});

			void _;
		});
	});
</script>

<div
	bind:this={container}
	class="container"
	style="font-family:'{reader.settings.fontFamily}',system-ui,sans-serif;font-size:{reader.settings.fontSize}px;letter-spacing:{reader.settings.letterSpacing}px;line-height:{reader.settings.lineHeight}"
>
	<div class="pad"></div>

	{#each reader.lines as line (line.lineIndex)}
		<div class="line">
			{#each line.words as w (w.globalIndex)}
				{@const d = w.globalIndex - reader.currentWord}
				<button
					class="word"
					class:active={d === 0}
					class:near={d >= -2 && d <= 2 && d !== 0}
					class:past={d < -2}
					class:future={d > 2}
					data-active={d === 0}
					onclick={() => {
						reader.jumpToWord(w.globalIndex);
						const m = reader.media.find((m) => m.triggerAtWord === w.globalIndex);
						if (m) reader.showMediaItem(m);
					}}
				>
					{w.text}
				</button>
			{/each}
		</div>
	{/each}

	<div class="pad"></div>
</div>

<style>
	.container {
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
	.container::-webkit-scrollbar { display: none; }

	.pad {
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
		padding: 0.04em 0.06em;
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.05);
		transition: color 0.35s, transform 0.35s, filter 0.35s;
		transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	}

	.word.active {
		color: white;
		transform: scale(1.08);
		filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.1));
	}

	.word.near {
		color: rgba(255, 255, 255, 0.28);
	}

	.word.past {
		color: rgba(255, 255, 255, 0.12);
	}

	.word.future {
		color: rgba(255, 255, 255, 0.05);
	}

	.word:hover:not(.active) {
		color: rgba(255, 255, 255, 0.4);
		transition-duration: 0.1s;
	}
</style>
