<script lang="ts">
	import { reader } from '$lib/stores';
	import type { MediaItem } from '$lib/stores/reader.svelte';

	let viewport: HTMLDivElement | undefined = $state();
	let cursorEl: HTMLDivElement | undefined = $state();
	let raf = 0;

	const hasMedia = $derived(reader.activeMedia != null);
	const RENDER_WINDOW = 6;

	function getYoutubeId(url: string): string | null {
		const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?#]+)/);
		return m ? m[1] : null;
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

	$effect(() => {
		void reader.currentWord;
		void reader.focusCount;

		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			if (!viewport || !cursorEl) return;

			const primary = viewport.querySelector('[data-primary]') as HTMLElement | null;
			if (!primary) return;

			const targetScrollTop = primary.offsetTop - viewport.clientHeight / 2 + primary.offsetHeight / 2;
			viewport.scrollTo({
				top: targetScrollTop,
				behavior: reader.isPlaying ? 'instant' : 'smooth'
			});

			const pad = 8;
			let minLeft = primary.offsetLeft;
			let maxRight = primary.offsetLeft + primary.offsetWidth;
			let minTop = primary.offsetTop;
			let maxBottom = primary.offsetTop + primary.offsetHeight;

			const actives = viewport.querySelectorAll('[data-focus]') as NodeListOf<HTMLElement>;
			for (const el of actives) {
				if (Math.abs(el.offsetTop - primary.offsetTop) < primary.offsetHeight * 0.6) {
					minLeft = Math.min(minLeft, el.offsetLeft);
					maxRight = Math.max(maxRight, el.offsetLeft + el.offsetWidth);
					minTop = Math.min(minTop, el.offsetTop);
					maxBottom = Math.max(maxBottom, el.offsetTop + el.offsetHeight);
				}
			}

			cursorEl.style.transform = `translate(${minLeft - pad}px, ${minTop - pad}px)`;
			cursorEl.style.width = `${maxRight - minLeft + pad * 2}px`;
			cursorEl.style.height = `${maxBottom - minTop + pad * 2}px`;
			cursorEl.style.opacity = '1';
		});
	});

	function lineOpacity(dist: number): number {
		if (dist === 0) return 1;
		if (dist === 1) return 0.45;
		if (dist === 2) return 0.2;
		if (dist === 3) return 0.08;
		return 0;
	}
</script>

<div class="reader-layout" class:has-media={hasMedia}>
	{#if hasMedia}
		{@const item = reader.activeMedia!}
		<div class="media-panel">
			<button class="media-dismiss" onclick={() => reader.dismissMedia()} title="Close">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>

			{#if item.type === 'image' && item.src}
				<div class="media-content">
					<img src={item.src} alt={item.alt || 'Image'} class="media-img" />
				</div>
			{/if}

			{#if item.type === 'table' && item.rows}
				<div class="media-content table-wrap">
					{@html renderTable(item)}
				</div>
			{/if}

			{#if item.type === 'video' && item.src}
				{@const ytId = getYoutubeId(item.src)}
				<div class="media-content">
					{#if ytId}
						<iframe
							src="https://www.youtube.com/embed/{ytId}"
							title={item.label || 'Video'}
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
							allowfullscreen
							class="media-video"
						></iframe>
					{:else}
						<a href={item.src} target="_blank" rel="noopener noreferrer" class="media-link-card">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
							<span>{item.label || 'Open video'}</span>
						</a>
					{/if}
				</div>
			{/if}

			{#if item.type === 'link' && item.href}
				<div class="media-content">
					<a href={item.href} target="_blank" rel="noopener noreferrer" class="media-link-card">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
						</svg>
						<span>{item.label || item.href}</span>
					</a>
				</div>
			{/if}

			{#if item.alt}
				<span class="media-caption">{item.alt}</span>
			{/if}
			{#if item.label && item.type !== 'link'}
				<span class="media-caption">{item.label}</span>
			{/if}
		</div>
	{/if}

	<div
		bind:this={viewport}
		class="vp"
		style="font-family:'{reader.settings.fontFamily}',system-ui,sans-serif;font-size:{reader.settings.fontSize}px;letter-spacing:{reader.settings.letterSpacing}px;line-height:{reader.settings.lineHeight}"
	>
		<div bind:this={cursorEl} class="cursor"></div>
		<div class="pad"></div>

		{#each reader.lines as line (line.lineIndex)}
			{@const dist = Math.abs(line.lineIndex - reader.currentLineIndex)}
			{@const isNearby = dist <= RENDER_WINDOW}
			<div
				class="line"
				style="opacity:{lineOpacity(dist)};justify-content:{reader.settings.textAlign === 'left' ? 'flex-start' : 'center'};max-width:{reader.settings.maxLineWidth}vw;gap:{reader.settings.wordGap}em;{dist > 3 ? 'pointer-events:none' : ''}"
			>
				{#if isNearby}
					{#each line.words as w (w.globalIndex)}
						{@const d = w.globalIndex - reader.currentWord}
						{@const isFocused = d >= 0 && d < reader.focusCount}
						{@const isClose = !isFocused && d >= -4 && d <= reader.focusCount + 3}
						<button
							class="w"
							class:active={isFocused}
							class:primary={d === 0}
							class:near={isClose}
							class:dim={!isFocused && !isClose}
							data-focus={isFocused ? '' : undefined}
							data-primary={d === 0 ? '' : undefined}
							onclick={() => {
								reader.jumpToWord(w.globalIndex);
								const m = reader.media.find((x) => x.triggerAtWord === w.globalIndex);
								if (m) reader.showMediaItem(m);
							}}
						>{w.text}</button>
					{/each}
				{:else}
					<span class="line-text" style="text-align:{reader.settings.textAlign}">{line.words.map(w => w.text).join(' ')}</span>
				{/if}
			</div>
		{/each}

		<div class="pad"></div>
	</div>
</div>

<div class="mask mask-top" class:shifted={hasMedia}></div>
<div class="mask mask-bottom" class:shifted={hasMedia}></div>

<style>
	.reader-layout { position: fixed; inset: 0; display: flex; transition: all var(--dur-slow) var(--ease); }

	/* ── Side media panel (all types) ──────────────── */
	.media-panel {
		flex: 0 0 42%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		gap: 0.75rem;
		position: relative;
		animation: slideIn 0.5s var(--ease);
		overflow-y: auto;
		scrollbar-width: none;
	}
	.media-panel::-webkit-scrollbar { display: none; }
	@keyframes slideIn { from { opacity: 0; transform: translateX(-2rem); } }

	.media-dismiss {
		all: unset; cursor: pointer;
		position: absolute; top: 1rem; right: 1rem;
		width: 32px; height: 32px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 10px;
		color: var(--text-3);
		background: var(--surface);
		transition: all var(--dur) var(--ease);
		z-index: 5;
	}
	.media-dismiss:hover { color: var(--text); background: var(--surface-h); }
	.media-dismiss:active { transform: scale(0.93); }

	.media-content {
		max-width: 90%;
		max-height: 65vh;
		border-radius: 14px;
		overflow: hidden;
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--border);
	}

	.media-img { display: block; max-width: 100%; max-height: 65vh; object-fit: contain; }

	.media-video { width: 100%; aspect-ratio: 16/9; border: none; display: block; }

	.table-wrap {
		background: var(--glass);
		padding: 1rem;
		overflow: auto;
	}
	.table-wrap :global(table) { border-collapse: collapse; width: 100%; }
	.table-wrap :global(th), .table-wrap :global(td) {
		padding: 0.5rem 0.8rem; text-align: left;
		border-bottom: 1px solid var(--border); font-size: 0.75rem;
	}
	.table-wrap :global(th) { color: var(--text-2); font-weight: 500; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; }
	.table-wrap :global(td) { color: var(--text-2); }
	.table-wrap :global(tr:hover td) { background: var(--surface); }

	.media-link-card {
		display: flex; align-items: center; gap: 0.6rem;
		padding: 1rem 1.5rem;
		background: var(--glass);
		color: var(--text-2);
		text-decoration: none;
		font-size: 0.8rem;
		transition: all var(--dur) var(--ease);
		width: 100%;
	}
	.media-link-card:hover { background: var(--surface-h); color: var(--text); }

	.media-caption { color: var(--text-3); font-size: 0.65rem; text-align: center; max-width: 90%; }

	/* ── Viewport ─────────────────────────────────────── */
	.vp {
		flex: 1;
		overflow-y: auto; overflow-x: hidden;
		scrollbar-width: none;
		display: flex; flex-direction: column; align-items: center;
		padding: 0 2rem;
		background: var(--bg);
		position: relative;
		transition: background-color var(--dur-slow) var(--ease);
	}
	.vp::-webkit-scrollbar { display: none; }
	.pad { flex: 0 0 50vh; }

	.cursor {
		position: absolute; top: 0; left: 0;
		border-radius: 14px;
		background: var(--surface); border: 1.5px solid var(--border);
		pointer-events: none; z-index: 1; opacity: 0;
		will-change: transform, width, height;
		transition: transform 0.28s var(--ease), width 0.28s var(--ease), height 0.28s var(--ease),
			opacity 0.2s ease, background var(--dur-slow) var(--ease), border-color var(--dur-slow) var(--ease);
	}

	.line { display: flex; flex-wrap: wrap; padding: 0.15em 0; z-index: 2; transition: opacity 0.4s var(--ease); }
	.has-media .line { max-width: 90% !important; }
	.line-text { color: var(--text-5); }

	.w {
		all: unset; cursor: pointer; padding: 0.06em 0.1em; border-radius: 6px; z-index: 2;
		color: var(--text-5); transition: color 0.2s var(--ease), transform 0.2s var(--ease);
	}
	.w.primary { color: var(--text); transform: scale(1.04); }
	.w.active { color: var(--text); }
	.w.near { color: var(--text-3); }
	.w.dim { color: var(--text-5); }
	.w:hover:not(.active) { color: var(--text-2); transition-duration: 0.08s; }

	.mask { position: fixed; right: 0; height: 28vh; pointer-events: none; z-index: 50; left: 0;
		transition: left var(--dur-slow) var(--ease), background var(--dur-slow) var(--ease); }
	.mask.shifted { left: 42%; }
	.mask-top { top: 0; background: linear-gradient(to bottom, var(--bg) 10%, var(--bg-t) 100%); }
	.mask-bottom { bottom: 0; background: linear-gradient(to top, var(--bg) 10%, var(--bg-t) 100%); }
</style>
