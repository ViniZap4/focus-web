<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
	import { reader } from '$lib/stores';
	import type { MediaItem } from '$lib/stores/reader.svelte';
	import { WordDisplay } from '../../blocks/Reader/WordDisplay';
	import { FloatBar } from '../../blocks/Reader/FloatBar';
	import { SectionSelector } from '../../blocks/SectionSelector';
	import { SettingsPanel } from '../../blocks/Reader/SettingsPanel';
	import { onMount, onDestroy } from 'svelte';

	let ready = $state(false);
	let zoomSrc = $state<string | null>(null);

	const showMediaModal = $derived(
		reader.activeMedia != null &&
		(reader.settings.mediaDisplay === 'modal' || reader.settings.readingMode !== 'scroll')
	);

	function autoFocusAction(node: HTMLElement) {
		requestAnimationFrame(() => node.focus());
	}

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

	onMount(() => {
		if (!reader.text) { goto('/'); return; }
		requestAnimationFrame(() => { ready = true; });
	});

	beforeNavigate(() => { reader.stop(); });
	onDestroy(() => { reader.stop(); });

	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
			e.preventDefault();
			reader.showSearch = !reader.showSearch;
			return;
		}

		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if (e.target instanceof HTMLSelectElement) return;

		switch (e.key) {
			case 'ArrowRight': case ' ': case 'j':
				e.preventDefault(); reader.advance(); break;
			case 'ArrowLeft': case 'k':
				e.preventDefault(); reader.goBack(); break;
			case 'ArrowDown': {
				e.preventDefault();
				const nl = reader.lines[reader.currentLineIndex + 1];
				if (nl) reader.jumpToWord(nl.words[0].globalIndex);
				break;
			}
			case 'ArrowUp': {
				e.preventDefault();
				const pl = reader.lines[reader.currentLineIndex - 1];
				if (pl) reader.jumpToWord(pl.words[0].globalIndex);
				break;
			}
			case 'p': e.preventDefault(); reader.toggle(); break;
			case 's': e.preventDefault(); reader.isSpeaking ? reader.stop() : reader.play(); break;
			case '+': case '=':
				e.preventDefault(); reader.settings.wpm = Math.min(600, reader.settings.wpm + 20);
				reader.saveSettings(); if (reader.isSpeaking) reader.restartSpeech(); break;
			case '-': case '_':
				e.preventDefault(); reader.settings.wpm = Math.max(60, reader.settings.wpm - 20);
				reader.saveSettings(); if (reader.isSpeaking) reader.restartSpeech(); break;
			case 'b': e.preventDefault(); reader.settings.bionicReading = !reader.settings.bionicReading; reader.saveSettings(); break;
			case 'f': e.preventDefault(); reader.settings.zenMode = !reader.settings.zenMode; reader.saveSettings(); break;
			case 'm': e.preventDefault(); reader.toggleBookmark(); break;
			case 'Escape':
				e.preventDefault();
				if (zoomSrc) { zoomSrc = null; }
				else if (reader.showSearch) { reader.showSearch = false; reader.search(''); }
				else if (reader.showSections) { reader.showSections = false; }
				else if (reader.showSettings) { reader.showSettings = false; }
				else if (reader.activeMedia) { reader.dismissMedia(); }
				else if (reader.settings.zenMode) { reader.settings.zenMode = false; reader.saveSettings(); }
				break;
		}
	}
</script>

<svelte:head>
	<title>{reader.isPlaying ? '▶ ' : ''}{reader.title || 'Focus'}</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if reader.text}
	<div class="reader" class:ready class:zen={reader.settings.zenMode}>

		<!-- ── Reading modes ──────────────────────────── -->
		{#if reader.settings.readingMode === 'rsvp'}
			{@const curWord = reader.allWords[reader.currentWord]}
			{@const nextWords = reader.allWords.slice(reader.currentWord + 1, reader.currentWord + 6)}
			<div class="rsvp-view">
				<div class="rsvp-progress"><div class="rsvp-progress-fill" style="width:{reader.progress}%"></div></div>
				<div class="rsvp-word" style="font-family:{reader.settings.dyslexiaFont ? "'OpenDyslexic','Comic Sans MS'" : `'${reader.settings.fontFamily}'`},system-ui;font-size:{Math.min(reader.settings.fontSize * 1.8, 96)}px">
					{#if reader.settings.bionicReading && curWord}
						{@const s = Math.ceil(curWord.text.length * reader.settings.bionicStrength)}
						<span class="rsvp-bold">{curWord.text.slice(0, s)}</span>{curWord.text.slice(s)}
					{:else}
						{curWord?.text || ''}
					{/if}
				</div>
				<div class="rsvp-upcoming">{nextWords.map(w => w.text).join(' ')}</div>
			</div>

		{:else if reader.settings.readingMode === 'paragraph'}
			{@const ci = reader.currentLineIndex}
			{@const prevLine = ci > 0 ? reader.lines[ci - 1] : null}
			{@const curLine = reader.lines[ci]}
			{@const nextLine = ci < reader.lines.length - 1 ? reader.lines[ci + 1] : null}
			<div class="para-view" style="font-family:{reader.settings.dyslexiaFont ? "'OpenDyslexic','Comic Sans MS'" : `'${reader.settings.fontFamily}'`},system-ui;font-size:{reader.settings.fontSize * 0.5}px;line-height:{reader.settings.lineHeight}">
				{#if prevLine}
					<p class="para-context">{prevLine.words.map(w => w.text).join(' ')}</p>
				{/if}
				{#if curLine}
					<p class="para-text">
						{#each curLine.words as w}
							{@const d = w.globalIndex - reader.currentWord}
							<span class="pw" class:pw-active={d === 0} class:pw-read={d < 0}>{w.text}</span>{' '}
						{/each}
					</p>
				{/if}
				{#if nextLine}
					<p class="para-context para-next">{nextLine.words.map(w => w.text).join(' ')}</p>
				{/if}
				<span class="para-counter">{ci + 1} / {reader.lines.length}</span>
			</div>

		{:else if reader.settings.readingMode === 'highlight'}
			{@const hlStart = Math.max(0, reader.currentLineIndex - 15)}
			{@const hlEnd = Math.min(reader.lines.length, reader.currentLineIndex + 15)}
			<div class="hl-view" style="font-family:{reader.settings.dyslexiaFont ? "'OpenDyslexic','Comic Sans MS'" : `'${reader.settings.fontFamily}'`},system-ui;font-size:{reader.settings.fontSize * 0.42}px;line-height:{reader.settings.lineHeight * 0.85}">
				<div class="hl-pad"></div>
				{#each reader.lines.slice(hlStart, hlEnd) as line (line.lineIndex)}
					{@const dist = Math.abs(line.lineIndex - reader.currentLineIndex)}
					<button class="hl-line" class:hl-active={dist === 0} class:hl-near={dist <= 2} class:hl-far={dist > 2} onclick={() => reader.jumpToWord(line.words[0].globalIndex)}>
						{line.words.map(w => w.text).join(' ')}
					</button>
				{/each}
				<div class="hl-pad"></div>
			</div>

		{:else}
			<WordDisplay />
		{/if}

		<!-- ── Media modal (for non-scroll modes or when modal setting is on) ── -->
		{#if showMediaModal}
			{@const item = reader.activeMedia}
			{#if item}
				<button class="modal-backdrop" onclick={() => reader.dismissMedia()} aria-label="Close media"></button>
				<div class="modal-panel">
					<button class="modal-close" onclick={() => reader.dismissMedia()} title="Close">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>

					<span class="modal-badge">{item.type}</span>

					{#if item.type === 'image' && item.src}
						<button class="modal-frame img-modal" onclick={() => { zoomSrc = item.src ?? null; reader.interactMedia(); }}>
							<img src={item.src} alt={item.alt || 'Image'} />
						</button>
					{/if}

					{#if item.type === 'table' && item.rows}
						<div class="modal-frame table-modal">
							{@html renderTable(item)}
						</div>
					{/if}

					{#if item.type === 'video' && item.src}
						{@const ytId = getYoutubeId(item.src)}
						<div class="modal-frame video-modal">
							{#if ytId}
								<iframe src="https://www.youtube.com/embed/{ytId}" title={item.label || 'Video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope" allowfullscreen onfocus={() => reader.interactMedia()}></iframe>
							{:else}
								<a href={item.src} target="_blank" rel="noopener noreferrer" class="modal-ext-link" onclick={() => reader.interactMedia()}>
									<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.4"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
									<span>{item.label || 'Open video'}</span>
								</a>
							{/if}
						</div>
					{/if}

					{#if item.type === 'link' && item.href}
						<a href={item.href} target="_blank" rel="noopener noreferrer" class="modal-frame link-modal" onclick={() => reader.interactMedia()}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
							</svg>
							<span>{item.label || item.href}</span>
						</a>
					{/if}

					{#if item.alt}<span class="modal-caption">{item.alt}</span>{/if}
					{#if item.label && item.type !== 'link'}<span class="modal-caption">{item.label}</span>{/if}
				</div>
			{/if}
		{/if}

		<!-- ── Settings side panel (works for ALL modes) ── -->
		{#if reader.showSettings}
			<div class="settings-overlay">
				<button class="settings-overlay-close" onclick={() => (reader.showSettings = false)} aria-label="Close settings"></button>
				<div class="settings-panel-standalone">
					<div class="sp-head">
						<span class="sp-title">Settings</span>
						<button class="sp-close" onclick={() => (reader.showSettings = false)}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						</button>
					</div>
					<div class="sp-body">
						<SettingsPanel />
					</div>
				</div>
			</div>
		{/if}

		<!-- ── Shared UI ────────────────────────────────── -->
		<FloatBar />
		<SectionSelector />

		{#if reader.showSearch}
			<div class="search-bar">
				<input type="text" placeholder="Search..." use:autoFocusAction value={reader.searchQuery}
					oninput={(e) => reader.search((e.target as HTMLInputElement).value)}
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); reader.searchNext(); } if (e.key === 'Escape') { reader.showSearch = false; reader.search(''); } }}
				/>
				{#if reader.searchResults.length > 0}
					<span class="search-count">{reader.searchIndex + 1}/{reader.searchResults.length}</span>
					<button class="search-nav" title="Previous" onclick={() => reader.searchPrev()}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
					<button class="search-nav" title="Next" onclick={() => reader.searchNext()}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
				{/if}
				<button class="search-nav" title="Close" onclick={() => { reader.showSearch = false; reader.search(''); }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
			</div>
		{/if}

		{#if zoomSrc}
			<button class="zoom-overlay" onclick={() => (zoomSrc = null)} aria-label="Close zoom">
				<img src={zoomSrc} alt="Full size preview" class="zoom-img" />
			</button>
		{/if}
	</div>
{/if}

<style>
	.reader { opacity: 0; transition: opacity 0.6s var(--ease); }
	.reader.ready { opacity: 1; }

	/* ── RSVP ─────────────────────────────────────── */
	.rsvp-view {
		position: fixed; inset: 0;
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		background: var(--bg); gap: 1.5rem; z-index: 10;
	}
	.rsvp-word {
		color: var(--text); font-weight: 300; letter-spacing: -0.02em;
		text-align: center; padding: 0 2rem;
		transition: color var(--dur-slow) var(--ease); min-height: 1.2em;
	}
	.rsvp-bold { font-weight: 700; }
	.rsvp-upcoming {
		color: var(--text-4);
		font-size: 0.85rem;
		max-width: 400px;
		text-align: center;
		line-height: 1.6;
	}
	.rsvp-progress { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--surface); }
	.rsvp-progress-fill { height: 100%; background: var(--text-4); transition: width 0.3s var(--ease); }

	/* ── Paragraph ────────────────────────────────── */
	.para-view {
		position: fixed; inset: 0;
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		background: var(--bg); padding: 2rem; gap: 1.5rem; z-index: 10;
	}
	.para-context {
		max-width: 600px; text-align: center; color: var(--text-5); margin: 0;
		font-size: 0.85em;
		transition: opacity 0.3s var(--ease);
	}
	.para-next { color: var(--text-4); }
	.para-text { max-width: 600px; text-align: center; color: var(--text-3); margin: 0; }
	.pw { transition: color 0.15s var(--ease); }
	.pw-active { color: var(--text); font-weight: 600; }
	.pw-read { color: var(--text-4); }
	.para-counter { color: var(--text-4); font-size: 0.6rem; font-family: monospace; font-variant-numeric: tabular-nums; }

	/* ── Highlight ────────────────────────────────── */
	.hl-view {
		position: fixed; inset: 0;
		overflow-y: auto; scrollbar-width: none;
		background: var(--bg); padding: 15vh 2rem 30vh;
		max-width: 700px; margin: 0 auto; z-index: 10;
	}
	.hl-view::-webkit-scrollbar { display: none; }
	.hl-pad { height: 30vh; flex-shrink: 0; }
	.hl-line {
		all: unset; display: block; width: 100%; text-align: left;
		padding: 0.35em 0.7em; border-radius: 8px; cursor: pointer;
		color: var(--text-5); transition: all 0.25s var(--ease); box-sizing: border-box;
	}
	.hl-line.hl-active { color: var(--text); background: var(--surface-h); font-weight: 500; }
	.hl-line.hl-near { color: var(--text-3); }
	.hl-line.hl-far { color: var(--text-5); }
	.hl-line:hover:not(.hl-active) { color: var(--text-2); background: var(--surface); }

	/* ── Media modal ─────────────────────────────── */
	.modal-backdrop {
		all: unset; position: fixed; inset: 0;
		background: rgba(0, 0, 0, 0.25); z-index: 300;
		animation: fadeIn 0.2s var(--ease);
	}
	@keyframes fadeIn { from { opacity: 0; } }

	.modal-panel {
		position: fixed; top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		width: min(90vw, 560px);
		max-height: 80vh;
		display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
		padding: 1.2rem;
		background: var(--glass);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		border: 1px solid var(--border);
		border-radius: 20px;
		box-shadow: var(--shadow-lg);
		z-index: 301;
		animation: modalIn 0.3s var(--ease);
		overflow-y: auto;
		scrollbar-width: none;
	}
	.modal-panel::-webkit-scrollbar { display: none; }
	@keyframes modalIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); } }

	.modal-close {
		all: unset; cursor: pointer;
		position: absolute; top: 0.6rem; right: 0.6rem;
		width: 28px; height: 28px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 8px; color: var(--text-3);
		transition: all var(--dur) var(--ease); z-index: 5;
	}
	.modal-close:hover { color: var(--text); background: var(--surface); }

	.modal-badge {
		font-size: 0.55rem; color: var(--text-4); text-transform: uppercase; letter-spacing: 0.06em;
		font-weight: 500; padding: 0.15rem 0.5rem; border-radius: 6px; background: var(--surface);
	}

	.modal-frame {
		width: 100%; border-radius: 14px; overflow: hidden;
		border: 1px solid var(--border); transition: all var(--dur) var(--ease);
	}

	.img-modal {
		all: unset; cursor: zoom-in; width: 100%;
		border-radius: 14px; overflow: hidden; border: 1px solid var(--border);
		display: flex; align-items: center; justify-content: center;
		background: var(--surface);
	}
	.img-modal img { display: block; width: 100%; max-height: 55vh; object-fit: contain; }
	.img-modal:hover { transform: scale(1.005); }

	.table-modal {
		background: var(--glass); padding: 0; max-height: 50vh; overflow: auto; scrollbar-width: thin;
	}
	.table-modal :global(table) { border-collapse: collapse; width: 100%; }
	.table-modal :global(th), .table-modal :global(td) {
		padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.75rem;
	}
	.table-modal :global(th) { color: var(--text-2); font-weight: 600; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; position: sticky; top: 0; background: var(--glass); }
	.table-modal :global(td) { color: var(--text-2); }

	.video-modal { background: #000; }
	.video-modal iframe { width: 100%; aspect-ratio: 16/9; border: none; display: block; }

	.modal-ext-link {
		display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
		padding: 2rem; background: var(--surface); color: var(--text-3);
		text-decoration: none; font-size: 0.75rem; transition: all var(--dur) var(--ease);
	}
	.modal-ext-link:hover { color: var(--text-2); }

	.link-modal {
		display: flex; align-items: center; gap: 0.6rem;
		padding: 1rem 1.2rem; background: var(--glass);
		color: var(--text-2); text-decoration: none; font-size: 0.8rem;
		transition: all var(--dur) var(--ease);
	}
	.link-modal:hover { background: var(--surface-h); color: var(--text); }

	.modal-caption { color: var(--text-4); font-size: 0.6rem; text-align: center; }

	/* ── Settings standalone panel (non-scroll modes) */
	.settings-overlay {
		position: fixed; inset: 0; z-index: 150;
		display: flex;
	}

	.settings-overlay-close {
		all: unset;
		flex: 1;
		cursor: default;
	}

	.settings-panel-standalone {
		width: min(88vw, 340px);
		height: 100%;
		background: var(--glass);
		backdrop-filter: blur(30px) saturate(1.4);
		-webkit-backdrop-filter: blur(30px) saturate(1.4);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		box-shadow: 8px 0 32px rgba(0, 0, 0, 0.06);
		animation: slideLeft 0.3s var(--ease);
		transition: background var(--dur-slow) var(--ease);
	}

	@keyframes slideLeft { from { transform: translateX(-100%); } }

	.sp-head {
		display: flex; align-items: center; justify-content: space-between;
		padding: 0.9rem 1rem 0.6rem;
	}

	.sp-title { color: var(--text); font-size: 0.85rem; font-weight: 600; }

	.sp-close {
		all: unset; cursor: pointer;
		width: 28px; height: 28px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 8px; color: var(--text-3);
		transition: all var(--dur) var(--ease);
	}
	.sp-close:hover { color: var(--text); background: var(--surface); }

	.sp-body {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: thin;
		padding: 0.3rem 1rem 2rem;
	}
	.sp-body::-webkit-scrollbar { width: 3px; }
	.sp-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

	/* ── Search bar ────────────────────────────────── */
	.search-bar {
		position: fixed; top: 1rem; left: 50%; transform: translateX(-50%);
		display: flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.5rem;
		background: var(--glass); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
		border: 1px solid var(--border); border-radius: 14px;
		box-shadow: var(--shadow-lg); z-index: 200; animation: searchIn 0.25s var(--ease);
	}
	@keyframes searchIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } }
	.search-bar input { all: unset; width: 200px; padding: 0.3rem 0.5rem; font-size: 0.75rem; color: var(--text); }
	.search-bar input::placeholder { color: var(--text-4); }
	.search-count { color: var(--text-3); font-size: 0.6rem; font-family: monospace; font-variant-numeric: tabular-nums; white-space: nowrap; }
	.search-nav {
		all: unset; cursor: pointer; width: 26px; height: 26px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 7px; color: var(--text-3); transition: all var(--dur) var(--ease);
	}
	.search-nav:hover { color: var(--text-2); background: var(--surface); }

	/* ── Zoom overlay ─────────────────────────────── */
	.zoom-overlay {
		all: unset; cursor: zoom-out;
		position: fixed; inset: 0; z-index: 500;
		background: rgba(0, 0, 0, 0.85);
		display: flex; align-items: center; justify-content: center;
		animation: fadeIn 0.3s var(--ease);
	}
	.zoom-img { max-width: 92vw; max-height: 92vh; object-fit: contain; border-radius: 8px; }
</style>
