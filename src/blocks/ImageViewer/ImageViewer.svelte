<script lang="ts">
	import { reader, type MediaItem } from '$lib/stores/reader.svelte';

	let scale = $state(1);

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		scale = Math.max(0.5, Math.min(3, scale - e.deltaY * 0.001));
	}

	function renderTable(item: MediaItem): string {
		if (!item.rows) return '';
		let html = '<table>';
		for (let i = 0; i < item.rows.length; i++) {
			html += '<tr>';
			for (const cell of item.rows[i]) {
				const tag = i === 0 ? 'th' : 'td';
				html += `<${tag}>${cell}</${tag}>`;
			}
			html += '</tr>';
		}
		html += '</table>';
		return html;
	}

	const showOverlay = $derived(reader.activeMedia?.type === 'table' && reader.activeMedia?.rows);
</script>

{#if showOverlay}
	{@const item = reader.activeMedia!}

	<button class="overlay" aria-label="Close media" onclick={() => reader.dismissMedia()}></button>

	<div class="viewer" onwheel={handleWheel}>
		<button class="dismiss" onclick={() => reader.dismissMedia()} aria-label="Close">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>

		{#if item.type === 'table' && item.rows}
			<div class="table-container">
				{@html renderTable(item)}
			</div>
		{/if}

		{#if item.alt}
			<span class="caption">{item.alt}</span>
		{/if}
	</div>
{/if}

<style>
	.overlay {
		all: unset;
		position: fixed; inset: 0;
		background: rgba(0, 0, 0, 0.1);
		z-index: 300;
		animation: fadeIn 0.3s var(--ease);
	}
	@keyframes fadeIn { from { opacity: 0; } }

	.viewer {
		position: fixed; top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		max-width: 85vw; max-height: 80vh;
		z-index: 301;
		display: flex; flex-direction: column; align-items: center; gap: 1rem;
		animation: viewerIn 0.4s var(--ease);
	}
	@keyframes viewerIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); } }

	.dismiss {
		all: unset; cursor: pointer;
		position: absolute; top: -2rem; right: -1rem;
		width: 32px; height: 32px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 10px;
		color: var(--text-2);
		background: var(--glass);
		backdrop-filter: blur(12px);
		transition: all var(--dur) var(--ease);
	}
	.dismiss:hover { color: var(--text); background: var(--surface-a); }

	.table-container {
		background: var(--glass);
		backdrop-filter: blur(20px);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 1.5rem;
		overflow: auto;
		max-width: 80vw; max-height: 70vh;
		box-shadow: var(--shadow-lg);
	}

	.table-container :global(table) { border-collapse: collapse; width: 100%; }
	.table-container :global(th),
	.table-container :global(td) {
		padding: 0.6rem 1rem; text-align: left;
		border-bottom: 1px solid var(--border);
		font-size: 0.8rem;
	}
	.table-container :global(th) {
		color: var(--text-2); font-weight: 500;
		font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
	}
	.table-container :global(td) { color: var(--text-2); }
	.table-container :global(tr:hover td) { background: var(--surface); }

	.caption { color: var(--text-3); font-size: 0.7rem; text-align: center; }
</style>
