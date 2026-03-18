<script lang="ts">
	import { reader } from '$lib/stores';

	let container: HTMLDivElement | undefined = $state();
	let cursor: HTMLDivElement | undefined = $state();
	let raf = 0;

	// Scroll active word to center + position the cursor indicator
	$effect(() => {
		void reader.currentWord;

		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			if (!container) return;

			const el = container.querySelector('[data-active]') as HTMLElement | null;
			if (!el) return;

			// Center scroll
			const cRect = container.getBoundingClientRect();
			const eRect = el.getBoundingClientRect();
			const delta = eRect.top + eRect.height / 2 - (cRect.top + cRect.height / 2);

			container.scrollTo({
				top: container.scrollTop + delta,
				behavior: reader.isPlaying ? 'instant' : 'smooth'
			});

			// Move cursor indicator to follow active word
			if (cursor) {
				const pad = 6;
				cursor.style.top = `${el.offsetTop - pad}px`;
				cursor.style.left = `${el.offsetLeft - pad}px`;
				cursor.style.width = `${el.offsetWidth + pad * 2}px`;
				cursor.style.height = `${el.offsetHeight + pad * 2}px`;
				cursor.style.opacity = '1';
			}
		});
	});

	// Classify lines by distance from active line
	function lineDist(lineIndex: number): number {
		return Math.abs(lineIndex - reader.currentLineIndex);
	}
</script>

<div
	bind:this={container}
	class="reader-viewport"
	style="font-family:'{reader.settings.fontFamily}',system-ui,sans-serif;font-size:{reader.settings.fontSize}px;letter-spacing:{reader.settings.letterSpacing}px;line-height:{reader.settings.lineHeight}"
>
	<!-- Cursor: rounded pill that follows the active word -->
	<div bind:this={cursor} class="cursor"></div>

	<div class="pad"></div>

	{#each reader.lines as line (line.lineIndex)}
		{@const ld = lineDist(line.lineIndex)}
		<div
			class="line"
			class:hide={ld > 3}
			style={ld <= 3 ? `opacity:${ld === 0 ? 1 : ld === 1 ? 0.5 : ld === 2 ? 0.25 : 0.1}` : ''}
		>
			{#each line.words as w (w.globalIndex)}
				{@const d = w.globalIndex - reader.currentWord}
				<button
					class="word"
					class:active={d === 0}
					class:near={d !== 0 && d >= -3 && d <= 3}
					class:past={d < -3}
					class:future={d > 3}
					data-active={d === 0 ? '' : undefined}
					onclick={() => {
						reader.jumpToWord(w.globalIndex);
						const m = reader.media.find((m) => m.triggerAtWord === w.globalIndex);
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

<!-- Top + bottom gradient masks -->
<div class="gradient-top"></div>
<div class="gradient-bottom"></div>

<style>
	.reader-viewport {
		position: fixed;
		inset: 0;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: 0 2rem;
		background: #1a1a1a;
	}
	.reader-viewport::-webkit-scrollbar { display: none; }

	.pad { flex: 0 0 50vh; }

	/* ── Cursor indicator ─────────────────────────────────── */
	.cursor {
		position: absolute;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		pointer-events: none;
		z-index: 1;
		opacity: 0;
		transition:
			top 0.35s cubic-bezier(0.16, 1, 0.3, 1),
			left 0.35s cubic-bezier(0.16, 1, 0.3, 1),
			width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
			height 0.35s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.3s ease;
	}

	/* ── Lines ────────────────────────────────────────────── */
	.line {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.3em;
		padding: 0.15em 0;
		max-width: 70vw;
		position: relative;
		z-index: 2;
		transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.line.hide {
		opacity: 0.03 !important;
	}

	/* ── Words ────────────────────────────────────────────── */
	.word {
		all: unset;
		cursor: pointer;
		padding: 0.04em 0.08em;
		border-radius: 6px;
		position: relative;
		z-index: 2;
		color: rgba(255, 255, 255, 0.06);
		transition:
			color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.word.active {
		color: white;
		transform: scale(1.06);
	}

	.word.near {
		color: rgba(255, 255, 255, 0.3);
	}

	.word.past {
		color: rgba(255, 255, 255, 0.1);
	}

	.word.future {
		color: rgba(255, 255, 255, 0.06);
	}

	.word:hover:not(.active) {
		color: rgba(255, 255, 255, 0.4);
		transition-duration: 0.1s;
	}

	/* ── Gradient masks ───────────────────────────────────── */
	.gradient-top,
	.gradient-bottom {
		position: fixed;
		left: 0;
		right: 0;
		height: 25vh;
		pointer-events: none;
		z-index: 50;
	}

	.gradient-top {
		top: 0;
		background: linear-gradient(to bottom, #1a1a1a 0%, transparent 100%);
	}

	.gradient-bottom {
		bottom: 0;
		background: linear-gradient(to top, #1a1a1a 0%, transparent 100%);
	}
</style>
