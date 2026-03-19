<script lang="ts">
	import { goto } from '$app/navigation';
	import { reader, sampleTexts, THEMES } from '$lib/stores';
	import type { ThemeId, ReadingSession } from '$lib/stores';
	import { parseFile, SUPPORTED_EXTENSIONS } from '$lib/parsers';
	import { onMount } from 'svelte';

	let customText = $state('');
	let dragOver = $state(false);
	let parsing = $state(false);
	let parseProgress = $state(0);
	let error = $state('');
	let textEl = $state<HTMLTextAreaElement>();
	let ready = $state(false);
	let history = $state<ReadingSession[]>([]);

	onMount(() => {
		requestAnimationFrame(() => { ready = true; });
		history = reader.loadHistory();
	});

	function formatTimeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function start() {
		if (!customText.trim()) return;
		reader.setText('Untitled', customText);
		goto('/reader');
	}

	function select(sample: (typeof sampleTexts)[number]) {
		reader.setText(sample.title, sample.content, sample.media ?? [], sample.lang);
		goto('/reader');
	}

	async function handleFile(file: File) {
		error = '';
		parsing = true;
		parseProgress = 0;
		try {
			const result = await parseFile(file, (pct) => {
				parseProgress = pct;
			});
			reader.fileName = file.name;
			reader.setText(result.title, result.text, result.media, result.detectedLang, result.sections);
			goto('/reader');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to parse file';
		} finally {
			parsing = false;
			parseProgress = 0;
		}
	}

	function triggerUpload() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = SUPPORTED_EXTENSIONS.join(',');
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) handleFile(file);
		};
		input.click();
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) handleFile(file);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			start();
		}
	}

	function autoResize() {
		if (!textEl) return;
		textEl.style.height = '36px';
		textEl.style.height = Math.min(textEl.scrollHeight, 180) + 'px';
	}

	function setTheme(id: ThemeId) {
		reader.settings.theme = id;
		reader.saveSettings();
		reader.applyTheme();
	}
</script>

<div
	class="home"
	class:ready
	class:drag-over={dragOver}
	role="region"
	aria-label="File drop zone"
	ondrop={onDrop}
	ondragover={onDragOver}
	ondragleave={() => (dragOver = false)}
>
	<header class="stagger" style="transition-delay:0ms">
		<h1>Focus</h1>
	</header>

	<div class="input-bar stagger" style="transition-delay:100ms">
		<button class="upload-btn" onclick={triggerUpload} disabled={parsing} title="Upload file">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
				<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
				<polyline points="17 8 12 3 7 8" />
				<line x1="12" y1="3" x2="12" y2="15" />
			</svg>
			<span>Upload</span>
		</button>

		<div class="input-wrap">
			<textarea
				bind:this={textEl}
				placeholder="Paste text here..."
				bind:value={customText}
				oninput={autoResize}
				onkeydown={onKeydown}
				rows="1"
			></textarea>
		</div>

		<button
			class="go-btn"
			onclick={start}
			disabled={!customText.trim() || parsing}
			title="Start reading"
		>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
			</svg>
		</button>
	</div>

	{#if error}
		<p class="error-msg">{error}</p>
	{/if}

	{#if parsing}
		<div class="parsing">
			<div class="spinner"></div>
			<span>Parsing{parseProgress > 0 ? ` ${Math.round(parseProgress)}%` : '...'}</span>
		</div>
	{/if}

	<div class="samples stagger" style="transition-delay:180ms">
		{#each sampleTexts as sample, i}
			<button
				class="sample stagger"
				style="transition-delay:{220 + i * 50}ms"
				onclick={() => select(sample)}
			>
				<span class="sample-lang">{sample.lang}</span>
				{sample.title}
			</button>
		{/each}
	</div>

	{#if history.length > 0}
		<div class="history stagger" style="transition-delay:350ms">
			<span class="history-label">Continue reading</span>
			<div class="history-list">
				{#each history.slice(0, 3) as session}
					<button class="history-item" onclick={() => { /* TODO: would need stored text to resume */ }}>
						<span class="hi-title">{session.title}</span>
						<span class="hi-meta">
							{Math.round((session.currentWord / session.totalWords) * 100)}%
							· {formatTimeAgo(session.lastRead)}
						</span>
						<div class="hi-bar">
							<div class="hi-fill" style="width:{(session.currentWord / session.totalWords) * 100}%"></div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="home-bar stagger" style="transition-delay:400ms">
		<div class="theme-row">
			{#each THEMES as t}
				<button
					class="theme-btn"
					class:on={reader.settings.theme === t.id}
					onclick={() => setTheme(t.id)}
					title={t.label}
				>
					<span class="theme-swatch" style="background:{t.preview}"></span>
					<span class="theme-label">{t.label}</span>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.home {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		gap: 1.5rem;
		width: 100%;
		transition: background var(--dur-slow) var(--ease);
	}

	.home.drag-over {
		background: var(--surface);
	}

	/* ── Stagger entry ─────────────────────────────── */
	.stagger {
		opacity: 0;
		transform: translateY(18px) scale(0.98);
		transition:
			opacity 0.7s var(--ease),
			transform 0.7s var(--ease);
	}

	.ready .stagger {
		opacity: 1;
		transform: translateY(0) scale(1);
	}

	/* ── Title ──────────────────────────────────────── */
	header h1 {
		font-size: clamp(3.5rem, 10vw, 6rem);
		font-weight: 400;
		letter-spacing: -0.03em;
		color: var(--text);
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		transition: color var(--dur-slow) var(--ease);
	}

	/* ── Input bar ─────────────────────────────────── */
	.input-bar {
		display: flex;
		align-items: flex-end;
		gap: 0.3rem;
		padding: 0.35rem;
		border-radius: 16px;
		border: 1px solid var(--border);
		background: var(--surface);
		width: 100%;
		max-width: 520px;
		transition:
			border-color var(--dur) var(--ease),
			background-color var(--dur-slow) var(--ease),
			box-shadow var(--dur) var(--ease);
	}

	.input-bar:focus-within {
		border-color: var(--border-h);
		box-shadow: var(--shadow-sm);
	}

	.upload-btn {
		all: unset;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 0.7rem;
		border-radius: 12px;
		background: var(--surface-h);
		color: var(--text-2);
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		flex-shrink: 0;
		transition: all var(--dur) var(--ease);
	}

	.upload-btn:hover:not(:disabled) {
		background: var(--surface-a);
		color: var(--text);
		transform: scale(1.03);
	}

	.upload-btn:active:not(:disabled) { transform: scale(0.96); }
	.upload-btn:disabled { opacity: 0.3; cursor: not-allowed; }

	.input-wrap {
		flex: 1;
		min-width: 0;
	}

	.input-wrap textarea {
		all: unset;
		display: block;
		width: 100%;
		padding: 0.5rem 0.6rem;
		font-size: 0.85rem;
		color: var(--text);
		line-height: 1.5;
		resize: none;
		overflow: hidden;
		height: 36px;
		max-height: 180px;
		box-sizing: border-box;
		transition: color var(--dur-slow) var(--ease);
	}

	.input-wrap textarea::placeholder {
		color: var(--text-4);
		transition: color var(--dur-slow) var(--ease);
	}

	.go-btn {
		all: unset;
		cursor: pointer;
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: var(--surface-h);
		color: var(--text-2);
		flex-shrink: 0;
		transition: all var(--dur) var(--ease);
	}

	.go-btn:hover:not(:disabled) {
		background: var(--surface-a);
		color: var(--text);
		transform: scale(1.06);
	}

	.go-btn:active:not(:disabled) { transform: scale(0.93); }
	.go-btn:disabled { opacity: 0.12; cursor: not-allowed; }

	/* ── Samples ───────────────────────────────────── */
	.samples {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
		max-width: 520px;
	}

	.sample {
		all: unset;
		cursor: pointer;
		padding: 0.4rem 0.9rem;
		border-radius: 20px;
		border: 1px solid var(--border);
		color: var(--text-3);
		font-size: 0.75rem;
		transition: all var(--dur) var(--ease);
	}

	.sample:hover {
		color: var(--text-2);
		border-color: var(--border-h);
		background: var(--surface);
		transform: translateY(-2px);
	}

	.sample:active { transform: translateY(0) scale(0.96); }

	.sample-lang {
		font-size: 0.5rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-4);
		background: var(--surface);
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
		margin-right: 0.25rem;
		transition: all var(--dur-slow) var(--ease);
	}

	/* ── Theme bar ─────────────────────────────────── */
	.home-bar {
		display: flex;
		align-items: center;
		padding: 0.3rem 0.35rem;
		border-radius: 14px;
		border: 1px solid var(--border);
		background: var(--surface);
		transition:
			background-color var(--dur-slow) var(--ease),
			border-color var(--dur-slow) var(--ease);
	}

	.theme-row {
		display: flex;
		gap: 0.2rem;
		align-items: center;
	}

	.theme-btn {
		all: unset;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.45rem 0.25rem 0.25rem;
		border-radius: 9px;
		border: 1.5px solid transparent;
		transition: all var(--dur) var(--ease);
	}

	.theme-btn:hover {
		background: var(--surface-h);
	}

	.theme-btn:active { transform: scale(0.95); }

	.theme-btn.on {
		border-color: var(--text-3);
		background: var(--surface-h);
	}

	.theme-swatch {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 1.5px solid var(--border-h);
		flex-shrink: 0;
		transition: border-color var(--dur-slow) var(--ease);
	}

	.theme-btn.on .theme-swatch {
		border-color: var(--text-3);
	}

	.theme-label {
		font-size: 0.58rem;
		color: var(--text-4);
		font-weight: 500;
		transition: color var(--dur-slow) var(--ease);
	}

	.theme-btn.on .theme-label { color: var(--text-2); }

	/* ── History ───────────────────────────────────── */
	.history {
		width: 100%;
		max-width: 520px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.history-label {
		font-size: 0.6rem;
		color: var(--text-4);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 500;
		padding-left: 0.2rem;
	}

	.history-list { display: flex; gap: 0.4rem; }

	.history-item {
		all: unset;
		cursor: pointer;
		flex: 1;
		padding: 0.55rem 0.7rem;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		transition: all var(--dur) var(--ease);
		overflow: hidden;
	}

	.history-item:hover {
		border-color: var(--border-h);
		background: var(--surface-h);
		transform: translateY(-1px);
	}

	.history-item:active { transform: scale(0.98); }

	.hi-title {
		font-size: 0.7rem;
		color: var(--text-2);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hi-meta {
		font-size: 0.55rem;
		color: var(--text-4);
		font-variant-numeric: tabular-nums;
	}

	.hi-bar {
		height: 2px;
		border-radius: 1px;
		background: var(--surface-h);
		margin-top: 0.1rem;
	}

	.hi-fill {
		height: 100%;
		border-radius: 1px;
		background: var(--text-3);
		transition: width var(--dur) var(--ease);
	}

	/* ── Feedback ──────────────────────────────────── */
	.error-msg {
		color: var(--error);
		font-size: 0.75rem;
		margin: 0;
	}

	.parsing {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-3);
		font-size: 0.75rem;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 1.5px solid var(--border);
		border-top-color: var(--text-3);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
