<script lang="ts">
	import { reader } from '$lib/stores';
	import { tick } from 'svelte';

	let containerEl: HTMLDivElement | undefined = $state();
	let scrolling = $state(false);

	$effect(() => {
		void reader.currentWord;
		if (scrolling) return;
		scrolling = true;
		tick().then(() => {
			if (!containerEl) {
				scrolling = false;
				return;
			}
			const active = containerEl.querySelector('[data-active="true"]') as HTMLElement | null;
			if (!active) {
				scrolling = false;
				return;
			}
			const containerRect = containerEl.getBoundingClientRect();
			const activeRect = active.getBoundingClientRect();
			const offset =
				activeRect.top -
				containerRect.top -
				containerRect.height / 2 +
				activeRect.height / 2;

			containerEl.scrollTo({
				top: containerEl.scrollTop + offset,
				behavior: reader.settings.smoothScroll ? 'smooth' : 'instant'
			});

			requestAnimationFrame(() => {
				scrolling = false;
			});
		});
	});

	function wordState(
		globalIndex: number
	): 'active' | 'near-before' | 'near-after' | 'past' | 'future' {
		const diff = globalIndex - reader.currentWord;
		if (diff === 0) return 'active';
		if (diff >= -3 && diff < 0) return 'near-before';
		if (diff > 0 && diff <= 3) return 'near-after';
		if (diff < 0) return 'past';
		return 'future';
	}

	// Check if a media item should show an indicator at this word
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
				{@const state = wordState(word.globalIndex)}
				<button
					class="word {state}"
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
			color 0.5s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
			filter 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.word.active {
		color: white;
		transform: scale(1.08);
		filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.15));
	}

	.word.near-before {
		color: rgba(255, 255, 255, 0.35);
	}

	.word.near-after {
		color: rgba(255, 255, 255, 0.18);
	}

	.word.past {
		color: rgba(255, 255, 255, 0.12);
	}

	.word.future {
		color: rgba(255, 255, 255, 0.05);
	}

	.word:hover:not(.active) {
		color: rgba(255, 255, 255, 0.45);
		transition-duration: 0.15s;
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
