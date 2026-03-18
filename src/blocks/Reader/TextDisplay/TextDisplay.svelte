<script lang="ts">
	import { reader } from '$lib/stores';
	import { FocusLine } from '../FocusLine';

	function isNear(index: number): boolean {
		const distance = Math.abs(index - reader.currentLine);
		return distance >= 1 && distance <= 2;
	}

	function isVisible(index: number): boolean {
		if (reader.mode === 'focus') return true;
		return index <= reader.currentLine;
	}

	function handleKeydown(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowDown':
			case ' ':
			case 'j':
				e.preventDefault();
				reader.advance();
				break;
			case 'ArrowUp':
			case 'k':
				e.preventDefault();
				reader.goBack();
				break;
			case 'Home':
				e.preventDefault();
				reader.jumpTo(0);
				break;
			case 'End':
				e.preventDefault();
				reader.jumpTo(reader.lines.length - 1);
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="text-display relative flex flex-col items-center w-full max-w-3xl mx-auto px-6 py-12">
	{#each reader.lines as line, i}
		<FocusLine
			text={line}
			isActive={i === reader.currentLine}
			isNear={isNear(i)}
			isVisible={isVisible(i)}
			index={i}
			mode={reader.mode}
			fontSize={reader.fontSize}
			onclick={() => reader.jumpTo(i)}
		/>
	{/each}

	{#if reader.isAtEnd}
		<div class="mt-12 text-center opacity-60 text-sm tracking-widest uppercase">
			end of text
		</div>
	{/if}
</div>
