<script lang="ts">
	import { reader } from '$lib/stores';

	function jumpTo(wordIndex: number) {
		reader.jumpToWord(wordIndex);
		reader.showSections = false;
	}
</script>

{#if reader.showSections}
	<button class="backdrop" aria-label="Close" onclick={() => (reader.showSections = false)}></button>

	<div class="panel">
		<div class="list">
			{#each reader.sections as section, i}
				{@const isCurrent = i === reader.currentSectionIndex}
				<button
					class="item"
					class:current={isCurrent}
					style="padding-left: {0.75 + section.level * 1}rem"
					onclick={() => jumpTo(section.wordIndex)}
				>
					<span class="num">{i + 1}.</span>
					<span class="title">{section.title}</span>
				</button>
				{#if i < reader.sections.length - 1 && reader.sections[i + 1].level !== section.level}
					<div class="divider"></div>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		all: unset;
		position: fixed;
		inset: 0;
		z-index: 200;
		animation: fadeIn 0.2s var(--ease);
	}
	@keyframes fadeIn { from { opacity: 0; } }

	.panel {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(88vw, 380px);
		max-height: 65vh;
		background: var(--glass);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		border: 1px solid var(--border);
		border-radius: 20px;
		z-index: 201;
		box-shadow: var(--shadow-lg);
		animation: panelIn 0.35s var(--ease);
		overflow: hidden;
	}
	@keyframes panelIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); } }

	.list {
		overflow-y: auto;
		scrollbar-width: none;
		max-height: 65vh;
		padding: 0.6rem 0;
	}
	.list::-webkit-scrollbar { display: none; }

	.item {
		all: unset; cursor: pointer;
		display: flex; align-items: baseline; gap: 0.5rem;
		width: 100%;
		padding: 0.55rem 0.75rem;
		font-size: 0.8rem;
		color: var(--text-2);
		box-sizing: border-box;
		transition: all 0.15s var(--ease);
	}
	.item:hover { background: var(--surface); color: var(--text); }
	.item:active { transform: scale(0.99); }
	.item.current { background: var(--surface-h); color: var(--text); font-weight: 500; }

	.num {
		color: var(--text-4);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
		min-width: 1.2rem;
	}
	.item.current .num { color: var(--text-3); }

	.title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.divider { height: 1px; background: var(--border); margin: 0.15rem 0.75rem; }
</style>
