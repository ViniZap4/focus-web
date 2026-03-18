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
</script>

{#if reader.activeMedia}
	{@const item = reader.activeMedia}

	<button
		class="overlay"
		aria-label="Close media"
		onclick={() => reader.dismissMedia()}
	></button>

	<div class="viewer" onwheel={handleWheel}>
		<button class="dismiss" onclick={() => reader.dismissMedia()} aria-label="Close">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>

		{#if item.type === 'image' && item.src}
			<div class="img-container" style="transform: scale({scale})">
				<img src={item.src} alt={item.alt || 'Content image'} />
			</div>
		{/if}

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
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 300;
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
	}

	.viewer {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		max-width: 85vw;
		max-height: 80vh;
		z-index: 301;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		animation: viewerIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes viewerIn {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.9);
		}
	}

	.dismiss {
		all: unset;
		cursor: pointer;
		position: absolute;
		top: -2rem;
		right: -1rem;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		color: rgba(255, 255, 255, 0.4);
		background: rgba(30, 30, 30, 0.8);
		backdrop-filter: blur(12px);
		transition: all 0.2s;
	}

	.dismiss:hover {
		color: white;
		background: rgba(50, 50, 50, 0.9);
	}

	.img-container {
		transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5);
	}

	.img-container img {
		display: block;
		max-width: 80vw;
		max-height: 70vh;
		object-fit: contain;
	}

	.table-container {
		background: rgba(25, 25, 25, 0.95);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
		padding: 1.5rem;
		overflow: auto;
		max-width: 80vw;
		max-height: 70vh;
		box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5);
	}

	.table-container :global(table) {
		border-collapse: collapse;
		width: 100%;
	}

	.table-container :global(th),
	.table-container :global(td) {
		padding: 0.6rem 1rem;
		text-align: left;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		font-size: 0.8rem;
	}

	.table-container :global(th) {
		color: rgba(255, 255, 255, 0.5);
		font-weight: 500;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table-container :global(td) {
		color: rgba(255, 255, 255, 0.4);
	}

	.table-container :global(tr:hover td) {
		background: rgba(255, 255, 255, 0.02);
	}

	.caption {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.7rem;
		text-align: center;
	}
</style>
