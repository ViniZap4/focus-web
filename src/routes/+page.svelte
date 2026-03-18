<script lang="ts">
	import { goto } from '$app/navigation';
	import { reader, sampleTexts } from '$lib/stores';
	import { parseFile, SUPPORTED_EXTENSIONS } from '$lib/parsers';
	import { onMount } from 'svelte';

	let customText = $state('');
	let dragOver = $state(false);
	let parsing = $state(false);
	let parseProgress = $state(0);
	let error = $state('');
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	function select(sample: (typeof sampleTexts)[number]) {
		reader.setText(sample.title, sample.content, [], sample.lang);
		goto('/reader');
	}

	function start() {
		if (!customText.trim()) return;
		reader.setText('Untitled', customText);
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
			reader.setText(result.title, result.text, result.media, result.detectedLang);
			goto('/reader');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to parse file';
		} finally {
			parsing = false;
			parseProgress = 0;
		}
	}

	function onFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleFile(file);
		input.value = '';
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

	function triggerUpload(accept: string) {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = accept;
		input.onchange = (e) => onFileInput(e);
		input.click();
	}
</script>

<div class="home" class:mounted>
	<!-- Title -->
	<header class="fade-in" style="animation-delay: 0ms">
		<h1>Focus</h1>
	</header>

	<!-- Input area -->
	<div
		class="input-area fade-in"
		style="animation-delay: 80ms"
		class:drag-over={dragOver}
		role="region"
		ondrop={onDrop}
		ondragover={onDragOver}
		ondragleave={() => (dragOver = false)}
	>
		<textarea
			placeholder="paste text here or drop a file..."
			bind:value={customText}
			rows="4"
		></textarea>

		<div class="input-actions">
			<div class="upload-btns">
				<button
					class="upload-btn"
					title="Upload PDF"
					onclick={() => triggerUpload('.pdf')}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="9" y1="15" x2="15" y2="15" />
					</svg>
					<span>pdf</span>
				</button>

				<button
					class="upload-btn"
					title="Upload EPUB"
					onclick={() => triggerUpload('.epub')}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
						<path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
					</svg>
					<span>epub</span>
				</button>

				<button
					class="upload-btn"
					title="Upload text file"
					onclick={() => triggerUpload('.txt,.md,.html')}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="16" y1="13" x2="8" y2="13" />
						<line x1="16" y1="17" x2="8" y2="17" />
					</svg>
					<span>txt</span>
				</button>
			</div>

			<button class="go-btn" onclick={start} disabled={!customText.trim() || parsing}>
				{parsing ? '...' : '→'}
			</button>
		</div>
	</div>

	{#if error}
		<p class="error-msg fade-in">{error}</p>
	{/if}

	{#if parsing}
		<div class="parsing fade-in">
			<div class="spinner"></div>
			<span>parsing... {parseProgress > 0 ? `${Math.round(parseProgress)}%` : ''}</span>
		</div>
	{/if}

	<!-- Samples -->
	<div class="samples fade-in" style="animation-delay: 160ms">
		{#each sampleTexts as sample, i}
			<button
				class="sample fade-in"
				style="animation-delay: {200 + i * 60}ms"
				onclick={() => select(sample)}
			>
				<span class="sample-lang">{sample.lang}</span>
				{sample.title}
			</button>
		{/each}
	</div>

	<!-- Footer hint -->
	<footer class="fade-in" style="animation-delay: 400ms">
		{SUPPORTED_EXTENSIONS.join('  ')}
	</footer>
</div>

<style>
	.home {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		gap: 2rem;
		max-width: 520px;
		margin: 0 auto;
	}

	.fade-in {
		opacity: 0;
		transform: translateY(12px);
		animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes fadeUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	header h1 {
		font-size: 3rem;
		font-weight: 100;
		letter-spacing: -0.04em;
		color: rgba(255, 255, 255, 0.85);
		margin: 0;
	}

	.input-area {
		width: 100%;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.04);
		background: rgba(255, 255, 255, 0.015);
		overflow: hidden;
		transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.input-area:focus-within {
		border-color: rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.025);
	}

	.input-area.drag-over {
		border-color: rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.04);
		transform: scale(1.01);
	}

	textarea {
		all: unset;
		display: block;
		width: 100%;
		padding: 1.2rem 1.2rem 0.8rem;
		font-size: 0.9rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.7);
		resize: none;
		box-sizing: border-box;
	}

	textarea::placeholder {
		color: rgba(255, 255, 255, 0.12);
	}

	.input-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0.8rem;
		border-top: 1px solid rgba(255, 255, 255, 0.02);
	}

	.upload-btns {
		display: flex;
		gap: 0.25rem;
	}

	.upload-btn {
		all: unset;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.65rem;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.7rem;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.upload-btn:hover {
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.04);
	}

	.go-btn {
		all: unset;
		cursor: pointer;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.5);
		font-size: 1.1rem;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.go-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
		color: white;
		transform: scale(1.05);
	}

	.go-btn:disabled {
		opacity: 0.15;
		cursor: not-allowed;
	}

	.error-msg {
		color: rgba(255, 120, 120, 0.7);
		font-size: 0.75rem;
		margin: 0;
	}

	.parsing {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.75rem;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 1.5px solid rgba(255, 255, 255, 0.1);
		border-top-color: rgba(255, 255, 255, 0.4);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.samples {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.sample {
		all: unset;
		cursor: pointer;
		padding: 0.45rem 1rem;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.78rem;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.sample:hover {
		color: rgba(255, 255, 255, 0.7);
		border-color: rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		transform: translateY(-1px);
	}

	.sample-lang {
		font-size: 0.55rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.03);
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
		margin-right: 0.3rem;
	}

	footer {
		color: rgba(255, 255, 255, 0.06);
		font-size: 0.65rem;
		letter-spacing: 0.15em;
		font-family: monospace;
	}
</style>
