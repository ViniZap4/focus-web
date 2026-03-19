<script lang="ts">
	import { reader } from '$lib/stores';

	let viewport: HTMLDivElement | undefined = $state();
	let cursorEl: HTMLDivElement | undefined = $state();
	let raf = 0;

	const hasInlineImage = $derived(reader.activeMedia?.type === 'image' && reader.activeMedia?.src);

	$effect(() => {
		void reader.currentWord;
		void reader.focusCount;

		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			if (!viewport || !cursorEl) return;

			// Find all active words to compute bounding box
			const actives = viewport.querySelectorAll('[data-focus]') as NodeListOf<HTMLElement>;
			if (actives.length === 0) return;

			const vRect = viewport.getBoundingClientRect();
			const first = actives[0].getBoundingClientRect();
			const last = actives[actives.length - 1].getBoundingClientRect();

			// Scroll: center the first active word
			const delta = first.top + first.height / 2 - (vRect.top + vRect.height / 2);
			viewport.scrollTo({
				top: viewport.scrollTop + delta,
				behavior: reader.isPlaying ? 'instant' : 'smooth'
			});

			// Cursor pill: wrap all focused words
			const pad = 8;
			const minLeft = Math.min(first.left, last.left);
			const maxRight = Math.max(first.right, last.right);
			const minTop = Math.min(first.top, last.top);
			const maxBottom = Math.max(first.bottom, last.bottom);

			const docTop = minTop - vRect.top + viewport.scrollTop;
			const docLeft = minLeft - vRect.left + viewport.scrollLeft;

			cursorEl.style.transform = `translate(${docLeft - pad}px, ${docTop - pad}px)`;
			cursorEl.style.width = `${maxRight - minLeft + pad * 2}px`;
			cursorEl.style.height = `${maxBottom - minTop + pad * 2}px`;
			cursorEl.style.opacity = '1';
		});
	});

	function ld(lineIndex: number): number {
		return Math.abs(lineIndex - reader.currentLineIndex);
	}

	function lineOpacity(lineIndex: number): number {
		const d = ld(lineIndex);
		if (d === 0) return 1;
		if (d === 1) return 0.45;
		if (d === 2) return 0.2;
		if (d === 3) return 0.08;
		return 0;
	}
</script>

<div class="reader-layout" class:has-image={hasInlineImage}>
	{#if hasInlineImage}
		<div class="image-panel">
			<button class="inline-img-wrap" onclick={() => reader.dismissMedia()}>
				<img src={reader.activeMedia?.src} alt={reader.activeMedia?.alt || 'Content image'} />
			</button>
			{#if reader.activeMedia?.alt}
				<span class="img-caption">{reader.activeMedia.alt}</span>
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
			<div
				class="line"
				style="opacity:{lineOpacity(line.lineIndex)};{ld(line.lineIndex) > 3 ? 'pointer-events:none' : ''}"
			>
				{#each line.words as w (w.globalIndex)}
					{@const d = w.globalIndex - reader.currentWord}
					{@const isFocused = d >= 0 && d < reader.focusCount}
					{@const isNear = !isFocused && d >= -4 && d <= reader.focusCount + 3}
					<button
						class="w"
						class:active={isFocused}
						class:primary={d === 0}
						class:near={isNear}
						class:dim={!isFocused && !isNear}
						data-focus={isFocused ? '' : undefined}
						onclick={() => {
							reader.jumpToWord(w.globalIndex);
							const m = reader.media.find((x) => x.triggerAtWord === w.globalIndex);
							if (m) reader.showMediaItem(m);
						}}
					>
						{w.text}
					</button>
				{/each}
			</div>
		{/each}

		<div class="pad"></div>
	</div>
</div>

<div class="mask mask-top" class:shifted={hasInlineImage}></div>
<div class="mask mask-bottom" class:shifted={hasInlineImage}></div>

<style>
	.reader-layout {
		position: fixed;
		inset: 0;
		display: flex;
		transition: all var(--dur-slow) var(--ease);
	}

	/* ── Inline image ────────────────────────────────── */
	.image-panel {
		flex: 0 0 45%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		animation: slideIn 0.5s var(--ease);
	}

	@keyframes slideIn {
		from { opacity: 0; transform: translateX(-2rem); }
	}

	.inline-img-wrap {
		all: unset;
		cursor: pointer;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--border);
		transition: transform var(--dur) var(--ease);
		max-width: 90%;
		max-height: 70vh;
	}

	.inline-img-wrap:hover { transform: scale(1.01); }
	.inline-img-wrap:active { transform: scale(0.99); }

	.inline-img-wrap img {
		display: block;
		max-width: 100%;
		max-height: 70vh;
		object-fit: contain;
	}

	.img-caption {
		margin-top: 0.75rem;
		color: var(--text-3);
		font-size: 0.7rem;
		text-align: center;
	}

	/* ── Viewport ────────────────────────────────────── */
	.vp {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 2rem;
		background: var(--bg);
		position: relative;
		transition: background-color var(--dur-slow) var(--ease);
	}
	.vp::-webkit-scrollbar { display: none; }

	.pad { flex: 0 0 50vh; }

	/* ── Cursor ───────────────────────────────────────── */
	.cursor {
		position: absolute;
		top: 0;
		left: 0;
		border-radius: 14px;
		background: var(--surface);
		border: 1.5px solid var(--border);
		pointer-events: none;
		z-index: 1;
		opacity: 0;
		will-change: transform, width, height;
		transition:
			transform 0.28s var(--ease),
			width 0.28s var(--ease),
			height 0.28s var(--ease),
			opacity 0.2s ease,
			background var(--dur-slow) var(--ease),
			border-color var(--dur-slow) var(--ease);
	}

	/* ── Lines ────────────────────────────────────────── */
	.line {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.3em;
		padding: 0.15em 0;
		max-width: 65vw;
		z-index: 2;
		transition: opacity 0.4s var(--ease);
	}

	.has-image .line { max-width: 90%; }

	/* ── Words ────────────────────────────────────────── */
	.w {
		all: unset;
		cursor: pointer;
		padding: 0.06em 0.1em;
		border-radius: 6px;
		z-index: 2;
		color: var(--text-5);
		transition:
			color 0.2s var(--ease),
			transform 0.2s var(--ease);
	}

	/* Primary word (the exact current one) */
	.w.primary {
		color: var(--text);
		transform: scale(1.04);
	}

	/* All focused words (phrase window) */
	.w.active {
		color: var(--text);
	}

	.w.near { color: var(--text-3); }
	.w.dim { color: var(--text-5); }

	.w:hover:not(.active) {
		color: var(--text-2);
		transition-duration: 0.08s;
	}

	/* ── Gradient masks ───────────────────────────────── */
	.mask {
		position: fixed;
		right: 0;
		height: 28vh;
		pointer-events: none;
		z-index: 50;
		left: 0;
		transition:
			left var(--dur-slow) var(--ease),
			background var(--dur-slow) var(--ease);
	}

	.mask.shifted { left: 45%; }

	.mask-top {
		top: 0;
		background: linear-gradient(to bottom, var(--bg) 10%, var(--bg-t) 100%);
	}
	.mask-bottom {
		bottom: 0;
		background: linear-gradient(to top, var(--bg) 10%, var(--bg-t) 100%);
	}
</style>
