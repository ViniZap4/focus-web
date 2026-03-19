<script lang="ts">
	import { reader } from '$lib/stores';
	import type { MediaItem } from '$lib/stores/reader.svelte';

	let viewport: HTMLDivElement | undefined = $state();
	let cursorEl: HTMLDivElement | undefined = $state();
	let raf = 0;

	const hasMedia = $derived(reader.activeMedia != null);
	const RENDER_WINDOW = 6;
	let zoomImage = $state<string | null>(null);

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
				behavior: reader.settings.smoothScroll ? (reader.isPlaying ? 'instant' : 'smooth') : 'instant'
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
		<div class="media-panel" class:compact={item.type === 'link'}>
			<button class="media-dismiss" onclick={() => reader.dismissMedia()} title="Close">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>

			<!-- Type badge -->
			<span class="media-badge">
				{#if item.type === 'image'}
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
				{:else if item.type === 'table'}
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
				{:else if item.type === 'video'}
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
				{:else}
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
				{/if}
				<span>{item.type}</span>
			</span>

			{#if item.type === 'image' && item.src}
				<button class="media-frame img-frame" onclick={() => { zoomImage = item.src ?? null; reader.interactMedia(); }}>
					<img src={item.src} alt={item.alt || 'Image'} />
				</button>
			{/if}

			{#if item.type === 'table' && item.rows}
				<button class="media-frame table-frame" onclick={() => reader.interactMedia()}>
					{@html renderTable(item)}
				</button>
			{/if}

			{#if item.type === 'video' && item.src}
				{@const ytId = getYoutubeId(item.src)}
				<div class="media-frame video-frame">
					{#if ytId}
						<iframe
							src="https://www.youtube.com/embed/{ytId}"
							title={item.label || 'Video'}
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
							allowfullscreen
							onfocus={() => reader.interactMedia()}
						></iframe>
					{:else}
						<a href={item.src} target="_blank" rel="noopener noreferrer" class="ext-link" onclick={() => reader.interactMedia()}>
							<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" opacity="0.4"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
							<span>{item.label || 'Open video'}</span>
						</a>
					{/if}
				</div>
			{/if}

			{#if item.type === 'link' && item.href}
				<a href={item.href} target="_blank" rel="noopener noreferrer" class="media-frame link-frame" onclick={() => reader.interactMedia()}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
					</svg>
					<span class="link-label">{item.label || item.href}</span>
					<span class="link-url">{item.href}</span>
				</a>
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
		style="font-family:{reader.settings.dyslexiaFont ? "'OpenDyslexic','Comic Sans MS'" : `'${reader.settings.fontFamily}'`},system-ui,sans-serif;font-size:{reader.settings.fontSize}px;letter-spacing:{reader.settings.dyslexiaFont ? '0.12em' : reader.settings.letterSpacing + 'px'};line-height:{reader.settings.dyslexiaFont ? 2.2 : reader.settings.lineHeight};word-spacing:{reader.settings.dyslexiaFont ? '0.16em' : 'normal'}"
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
						{@const isBookmarked = reader.isBookmarked(w.globalIndex)}
						{@const isSearchHit = reader.searchQuery && w.text.toLowerCase().includes(reader.searchQuery.toLowerCase())}
						<button
							class="w"
							class:active={isFocused}
							class:primary={d === 0}
							class:near={isClose}
							class:dim={!isFocused && !isClose}
							class:bookmarked={isBookmarked}
							class:search-hit={isSearchHit}
							data-focus={isFocused ? '' : undefined}
							data-primary={d === 0 ? '' : undefined}
							onclick={() => {
								reader.jumpToWord(w.globalIndex);
								const m = reader.media.find((x) => x.triggerAtWord === w.globalIndex);
								if (m) reader.showMediaItem(m);
							}}
							ondblclick={() => reader.toggleBookmark(w.globalIndex)}
						>{#if reader.settings.bionicReading}{@const split = Math.ceil(w.text.length * reader.settings.bionicStrength)}<span class="bb">{w.text.slice(0, split)}</span>{w.text.slice(split)}{:else}{w.text}{/if}</button>
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

{#if zoomImage}
	<button class="zoom-overlay" onclick={() => (zoomImage = null)} aria-label="Close zoom">
		<img src={zoomImage} alt="Full size preview" class="zoom-img" />
	</button>
{/if}

<style>
	.reader-layout { position: fixed; inset: 0; display: flex; transition: all var(--dur-slow) var(--ease); }

	/* ── Side media panel ─────────────────────────── */
	.media-panel {
		flex: 0 0 42%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem 2rem;
		gap: 0.6rem;
		position: relative;
		animation: slideIn 0.5s var(--ease);
		overflow-y: auto;
		scrollbar-width: none;
		background: var(--bg);
		transition: background-color var(--dur-slow) var(--ease);
	}
	.media-panel.compact { flex: 0 0 30%; }
	.media-panel::-webkit-scrollbar { display: none; }
	@keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } }

	.media-dismiss {
		all: unset; cursor: pointer;
		position: absolute; top: 0.8rem; right: 0.8rem;
		width: 28px; height: 28px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 8px;
		color: var(--text-4);
		transition: all var(--dur) var(--ease);
		z-index: 5;
	}
	.media-dismiss:hover { color: var(--text-2); background: var(--surface); }
	.media-dismiss:active { transform: scale(0.93); }

	.media-badge {
		display: flex; align-items: center; gap: 0.3rem;
		color: var(--text-4);
		font-size: 0.55rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		background: var(--surface);
		margin-bottom: 0.25rem;
		transition: all var(--dur-slow) var(--ease);
	}

	/* ── Shared frame ────────────────────────────────── */
	.media-frame {
		width: 88%;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid var(--border);
		transition: all var(--dur) var(--ease);
		animation: frameIn 0.4s var(--ease);
	}
	@keyframes frameIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } }

	/* ── Image ────────────────────────────────────────── */
	.img-frame {
		all: unset;
		cursor: zoom-in;
		display: flex; align-items: center; justify-content: center;
		width: 88%;
		max-height: 60vh;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		background: var(--surface);
		transition: all var(--dur) var(--ease);
		animation: frameIn 0.4s var(--ease);
	}
	.img-frame:hover { transform: scale(1.01); box-shadow: var(--shadow-lg); }
	.img-frame:active { transform: scale(0.99); }
	.img-frame img {
		display: block;
		width: 100%;
		max-height: 60vh;
		object-fit: contain;
	}

	/* ── Table ────────────────────────────────────────── */
	.table-frame {
		background: var(--glass);
		padding: 0;
		max-height: 55vh;
		overflow: auto;
		scrollbar-width: thin;
		box-shadow: var(--shadow-sm);
	}
	.table-frame :global(table) { border-collapse: collapse; width: 100%; }
	.table-frame :global(th),
	.table-frame :global(td) {
		padding: 0.55rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
		font-size: 0.72rem;
		white-space: nowrap;
	}
	.table-frame :global(th) {
		color: var(--text-3);
		font-weight: 600;
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		position: sticky;
		top: 0;
		background: var(--glass);
		backdrop-filter: blur(8px);
	}
	.table-frame :global(td) { color: var(--text-2); }
	.table-frame :global(tr:hover td) { background: var(--surface); }

	/* ── Video ────────────────────────────────────────── */
	.video-frame {
		box-shadow: var(--shadow-lg);
		background: #000;
	}
	.video-frame iframe {
		width: 100%;
		aspect-ratio: 16 / 9;
		border: none;
		display: block;
	}
	.ext-link {
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		gap: 0.5rem;
		padding: 2.5rem 2rem;
		background: var(--surface);
		color: var(--text-3);
		text-decoration: none;
		font-size: 0.75rem;
		transition: all var(--dur) var(--ease);
	}
	.ext-link:hover { color: var(--text-2); background: var(--surface-h); }

	/* ── Link ─────────────────────────────────────────── */
	.link-frame {
		display: flex; flex-direction: column;
		gap: 0.4rem;
		padding: 1.2rem 1.4rem;
		background: var(--glass);
		color: var(--text-2);
		text-decoration: none;
		box-shadow: var(--shadow-sm);
		transition: all var(--dur) var(--ease);
	}
	.link-frame:hover {
		background: var(--surface-h);
		color: var(--text);
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}
	.link-label { font-size: 0.8rem; font-weight: 500; }
	.link-url { font-size: 0.6rem; color: var(--text-4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

	.media-caption {
		color: var(--text-4);
		font-size: 0.6rem;
		text-align: center;
		max-width: 88%;
		line-height: 1.4;
	}

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
	.w .bb { font-weight: 700; }
	.w.primary { color: var(--text); transform: scale(1.04); }
	.w.active { color: var(--text); }
	.w.near { color: var(--text-3); }
	.w.dim { color: var(--text-5); }
	.w:hover:not(.active) { color: var(--text-2); transition-duration: 0.08s; }
	.w.bookmarked { border-bottom: 2px solid var(--text-3); padding-bottom: 0.02em; }
	.w.search-hit { background: var(--surface-a); border-radius: 4px; }

	.mask { position: fixed; right: 0; height: 28vh; pointer-events: none; z-index: 50; left: 0;
		transition: left var(--dur-slow) var(--ease), background var(--dur-slow) var(--ease); }
	.has-media + .mask.shifted, .mask.shifted { left: 42%; }
	.mask-top { top: 0; background: linear-gradient(to bottom, var(--bg) 10%, var(--bg-t) 100%); }
	.mask-bottom { bottom: 0; background: linear-gradient(to top, var(--bg) 10%, var(--bg-t) 100%); }

	/* ── Image zoom overlay ───────────────────────────── */
	.zoom-overlay {
		all: unset;
		cursor: zoom-out;
		position: fixed;
		inset: 0;
		z-index: 500;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: zoomIn 0.3s var(--ease);
	}
	@keyframes zoomIn { from { opacity: 0; } }
	.zoom-img {
		max-width: 92vw;
		max-height: 92vh;
		object-fit: contain;
		border-radius: 8px;
	}
</style>
