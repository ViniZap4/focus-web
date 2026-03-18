<script lang="ts">
	import { reader } from '$lib/stores';

	let container: HTMLDivElement | undefined = $state();
	let raf = 0;

	// Center active word on screen
	$effect(() => {
		void reader.currentWord;

		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			if (!container) return;

			const el = container.querySelector('[data-active="true"]') as HTMLElement | null;
			if (!el) return;

			const cRect = container.getBoundingClientRect();
			const eRect = el.getBoundingClientRect();

			const delta = (eRect.top + eRect.height / 2) - (cRect.top + cRect.height / 2);

			container.scrollTo({
				top: container.scrollTop + delta,
				behavior: reader.isPlaying ? 'instant' : 'smooth'
			});
		});
	});
</script>

<div
	bind:this={container}
	class="container"
	style="font-family:'{reader.settings.fontFamily}',system-ui,sans-serif;font-size:{reader.settings.fontSize}px;letter-spacing:{reader.settings.letterSpacing}px;line-height:{reader.settings.lineHeight}"
>
	<!-- Spacer so first word can be centered -->
	<div class="pad"></div>

	{#each reader.lines as line (line.lineIndex)}
		<div class="line">
			{#each line.words as w (w.globalIndex)}
				{@const d = w.globalIndex - reader.currentWord}
				<button
					class="word"
					class:active={d === 0}
					class:near={d !== 0 && d >= -2 && d <= 2}
					class:past={d < -2}
					class:future={d > 2}
					data-active={d === 0 ? 'true' : undefined}
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

	<!-- Spacer so last word can be centered -->
	<div class="pad"></div>
</div>

<style>
	.container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 2rem;
		background: #1a1a1a;
	}
	.container::-webkit-scrollbar { display: none; }

	.pad {
		flex: 0 0 50vh;
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
		transition: color 0.3s, transform 0.3s, filter 0.3s;
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
