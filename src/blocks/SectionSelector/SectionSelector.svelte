<script lang="ts">
	import { reader } from '$lib/stores';
	import { onMount } from 'svelte';

	let listEl = $state<HTMLDivElement>();

	function jumpTo(wordIndex: number) {
		reader.jumpToWord(wordIndex);
		reader.showSections = false;
	}

	// Auto-scroll to current section
	onMount(() => {
		requestAnimationFrame(() => {
			if (!listEl) return;
			const active = listEl.querySelector('[data-current]') as HTMLElement;
			if (active) {
				active.scrollIntoView({ block: 'center', behavior: 'instant' });
			}
		});
	});
</script>

{#if reader.showSections}
	<button class="backdrop" aria-label="Close" onclick={() => (reader.showSections = false)}></button>

	<div class="panel">
		<div class="panel-head">
			<span class="panel-title">{reader.title || 'Sections'}</span>
			<span class="panel-meta">{reader.sections.length} sections</span>
		</div>

		<div class="list" bind:this={listEl}>
			{#each reader.sections as section, i}
				{@const isCurrent = i === reader.currentSectionIndex}
				{@const isChild = section.level > 0}
				<button
					class="item"
					class:current={isCurrent}
					class:child={isChild}
					data-current={isCurrent ? '' : undefined}
					onclick={() => jumpTo(section.wordIndex)}
				>
					<span class="item-num">{i + 1}</span>
					<span class="item-title">{section.title}</span>
					{#if isCurrent}
						<span class="item-badge">reading</span>
					{/if}
				</button>
			{/each}

			{#if reader.sections.length === 0}
				<div class="empty">No sections detected</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		all: unset;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.04);
		z-index: 200;
		animation: fadeIn 0.2s var(--ease);
	}
	@keyframes fadeIn { from { opacity: 0; } }

	.panel {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(90vw, 420px);
		max-height: 70vh;
		background: var(--glass);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		border: 1px solid var(--border);
		border-radius: 20px;
		z-index: 201;
		box-shadow: var(--shadow-lg);
		animation: panelIn 0.35s var(--ease);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition:
			background var(--dur-slow) var(--ease),
			border-color var(--dur-slow) var(--ease);
	}
	@keyframes panelIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); } }

	.panel-head {
		padding: 0.8rem 1rem 0.6rem;
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.panel-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.panel-meta {
		font-size: 0.55rem;
		color: var(--text-4);
		flex-shrink: 0;
	}

	.list {
		overflow-y: auto;
		scrollbar-width: thin;
		flex: 1;
		padding: 0.4rem 0;
	}

	.item {
		all: unset;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 1rem;
		font-size: 0.78rem;
		color: var(--text-2);
		box-sizing: border-box;
		transition: all 0.15s var(--ease);
	}

	.item.child {
		padding-left: 2.2rem;
		font-size: 0.72rem;
		color: var(--text-3);
	}

	.item:hover {
		background: var(--surface);
		color: var(--text);
	}

	.item:active { transform: scale(0.995); }

	.item.current {
		background: var(--surface-h);
		color: var(--text);
		font-weight: 500;
	}

	.item-num {
		color: var(--text-4);
		font-size: 0.6rem;
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
		min-width: 1.4rem;
		text-align: right;
	}

	.item.current .item-num { color: var(--text-3); }

	.item-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-badge {
		font-size: 0.5rem;
		color: var(--text-3);
		background: var(--surface);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		font-weight: 500;
		letter-spacing: 0.03em;
		flex-shrink: 0;
	}

	.empty {
		padding: 2rem;
		text-align: center;
		color: var(--text-4);
		font-size: 0.75rem;
	}
</style>
