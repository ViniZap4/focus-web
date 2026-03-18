<script lang="ts">
	import { reader } from '$lib/stores';
</script>

<div
	class="toolbar fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 backdrop-blur-md bg-black/40 border-t border-white/5"
>
	<div class="flex items-center gap-4">
		<a
			href="/"
			class="text-white/50 hover:text-white/80 transition-colors text-sm no-underline"
		>
			&larr; Home
		</a>

		<span class="text-white/30 text-sm">{reader.title}</span>
	</div>

	<div class="flex items-center gap-3">
		<button
			class="tool-btn"
			onclick={() => reader.goBack()}
			disabled={reader.isAtStart}
			title="Previous line"
		>
			&#9650;
		</button>

		<button
			class="tool-btn"
			onclick={() => reader.toggleAutoPlay()}
			title={reader.autoPlay ? 'Pause' : 'Auto-play'}
		>
			{reader.autoPlay ? '&#9646;&#9646;' : '&#9654;'}
		</button>

		<button
			class="tool-btn"
			onclick={() => reader.advance()}
			disabled={reader.isAtEnd}
			title="Next line"
		>
			&#9660;
		</button>
	</div>

	<div class="flex items-center gap-4">
		<button
			class="tool-btn text-xs tracking-wide"
			onclick={() => reader.toggleMode()}
			title="Toggle reading mode"
		>
			{reader.mode === 'focus' ? 'focus' : 'dynamic'}
		</button>

		<div class="flex items-center gap-2">
			<button
				class="tool-btn text-xs"
				onclick={() => (reader.fontSize = Math.max(14, reader.fontSize - 2))}
				title="Decrease font size"
			>
				A-
			</button>
			<button
				class="tool-btn text-xs"
				onclick={() => (reader.fontSize = Math.min(32, reader.fontSize + 2))}
				title="Increase font size"
			>
				A+
			</button>
		</div>

		<div class="text-white/30 text-xs font-mono min-w-16 text-right">
			{reader.currentLine + 1}/{reader.lines.length}
		</div>
	</div>
</div>

<!-- Progress bar -->
<div class="fixed bottom-0 left-0 right-0 h-0.5 z-50">
	<div
		class="h-full bg-white/30 transition-all duration-500 ease-out"
		style="width: {reader.progress}%"
	></div>
</div>

<style>
	.tool-btn {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.6);
		padding: 0.35rem 0.7rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.75rem;
	}

	.tool-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.9);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.tool-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
