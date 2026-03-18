<script lang="ts">
	import { reader } from '$lib/stores';
	import { tick } from 'svelte';

	let containerEl: HTMLDivElement | undefined = $state();

	// Auto-scroll to keep active word centered
	$effect(() => {
		void reader.currentWord;
		tick().then(() => {
			if (!containerEl) return;
			const active = containerEl.querySelector('[data-active="true"]') as HTMLElement | null;
			if (!active) return;
			const containerRect = containerEl.getBoundingClientRect();
			const activeRect = active.getBoundingClientRect();
			const offset = activeRect.top - containerRect.top - containerRect.height / 2 + activeRect.height / 2;
			containerEl.scrollTo({ top: containerEl.scrollTop + offset, behavior: 'smooth' });
		});
	});

	function wordState(globalIndex: number): 'active' | 'past' | 'future' {
		if (globalIndex === reader.currentWord) return 'active';
		if (globalIndex < reader.currentWord) return 'past';
		return 'future';
	}
</script>

<div
	bind:this={containerEl}
	class="word-display"
	style="
		font-family: {reader.settings.fontFamily}, system-ui, sans-serif;
		font-size: {reader.settings.fontSize}px;
		letter-spacing: {reader.settings.letterSpacing}px;
		line-height: {reader.settings.lineHeight};
	"
>
	<!-- Top spacer to allow first word to be centered -->
	<div class="spacer"></div>

	{#each reader.lines as line}
		<div class="line">
			{#each line.words as word}
				<button
					class="word {wordState(word.globalIndex)}"
					data-active={word.globalIndex === reader.currentWord}
					onclick={() => reader.jumpToWord(word.globalIndex)}
				>
					{word.text}
				</button>
			{/each}
		</div>
	{/each}

	<!-- Bottom spacer -->
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
		padding: 0.15em 0;
		max-width: 70vw;
	}

	.word {
		all: unset;
		cursor: pointer;
		transition: all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
		padding: 0.05em 0.08em;
		border-radius: 4px;
	}

	.word.active {
		color: white;
		opacity: 1;
		transform: scale(1.05);
	}

	.word.past {
		color: rgba(255, 255, 255, 0.25);
		opacity: 1;
	}

	.word.future {
		color: rgba(255, 255, 255, 0.08);
		opacity: 1;
	}

	.word:hover:not(.active) {
		color: rgba(255, 255, 255, 0.5);
	}
</style>
