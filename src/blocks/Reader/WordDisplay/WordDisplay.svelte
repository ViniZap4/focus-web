<script lang="ts">
	import { reader } from '$lib/stores';

	let viewport: HTMLDivElement | undefined = $state();
	let cursorEl: HTMLDivElement | undefined = $state();
	let raf = 0;

	$effect(() => {
		void reader.currentWord;

		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			if (!viewport) return;

			const el = viewport.querySelector('[data-active]') as HTMLElement | null;
			if (!el) return;

			const vRect = viewport.getBoundingClientRect();
			const wRect = el.getBoundingClientRect();

			// ── Scroll: center active word ────────────────────────
			const delta = wRect.top + wRect.height / 2 - (vRect.top + vRect.height / 2);
			viewport.scrollTo({
				top: viewport.scrollTop + delta,
				behavior: reader.isPlaying ? 'instant' : 'smooth'
			});

			// ── Cursor: position in document-flow space ──────────
			// wRect is visual, add scrollTop to get absolute position
			if (cursorEl) {
				const pad = 8;
				const docTop = wRect.top - vRect.top + viewport.scrollTop;
				const docLeft = wRect.left - vRect.left + viewport.scrollLeft;

				cursorEl.style.transform = `translate(${docLeft - pad}px, ${docTop - pad}px)`;
				cursorEl.style.width = `${wRect.width + pad * 2}px`;
				cursorEl.style.height = `${wRect.height + pad * 2}px`;
				cursorEl.style.opacity = '1';
			}
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

<div
	bind:this={viewport}
	class="vp"
	style="font-family:'{reader.settings.fontFamily}',system-ui,sans-serif;font-size:{reader.settings.fontSize}px;letter-spacing:{reader.settings.letterSpacing}px;line-height:{reader.settings.lineHeight}"
>
	<!-- Cursor pill -->
	<div bind:this={cursorEl} class="cursor"></div>

	<div class="pad"></div>

	{#each reader.lines as line (line.lineIndex)}
		<div
			class="line"
			style="opacity:{lineOpacity(line.lineIndex)};{ld(line.lineIndex) > 3 ? 'pointer-events:none' : ''}"
		>
			{#each line.words as w (w.globalIndex)}
				{@const d = w.globalIndex - reader.currentWord}
				<button
					class="w"
					class:active={d === 0}
					class:near={d !== 0 && d >= -4 && d <= 4}
					class:dim={d < -4 || d > 4}
					data-active={d === 0 ? '' : undefined}
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

<!-- Gradient masks -->
<div class="mask mask-top"></div>
<div class="mask mask-bottom"></div>

<style>
	.vp {
		position: fixed;
		inset: 0;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 2rem;
		background: #1a1a1a;
	}
	.vp::-webkit-scrollbar { display: none; }

	.pad { flex: 0 0 50vh; }

	/* ── Cursor ───────────────────────────────────────── */
	.cursor {
		position: absolute;
		top: 0;
		left: 0;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.035);
		border: 1.5px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 0 24px rgba(255, 255, 255, 0.02);
		pointer-events: none;
		z-index: 1;
		opacity: 0;
		will-change: transform, width, height;
		transition:
			transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
			width 0.32s cubic-bezier(0.16, 1, 0.3, 1),
			height 0.32s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.25s ease;
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
		transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* ── Words ────────────────────────────────────────── */
	.w {
		all: unset;
		cursor: pointer;
		padding: 0.06em 0.1em;
		border-radius: 6px;
		z-index: 2;
		color: rgba(255, 255, 255, 0.06);
		transition:
			color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.w.active {
		color: white;
		transform: scale(1.05);
	}

	.w.near {
		color: rgba(255, 255, 255, 0.28);
	}

	.w.dim {
		color: rgba(255, 255, 255, 0.06);
	}

	.w:hover:not(.active) {
		color: rgba(255, 255, 255, 0.4);
		transition-duration: 0.1s;
	}

	/* ── Gradient masks ───────────────────────────────── */
	.mask {
		position: fixed;
		left: 0;
		right: 0;
		height: 28vh;
		pointer-events: none;
		z-index: 50;
	}
	.mask-top {
		top: 0;
		background: linear-gradient(to bottom, #1a1a1a 10%, transparent 100%);
	}
	.mask-bottom {
		bottom: 0;
		background: linear-gradient(to top, #1a1a1a 10%, transparent 100%);
	}
</style>
