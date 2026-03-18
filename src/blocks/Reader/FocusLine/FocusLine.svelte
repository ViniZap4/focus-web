<script lang="ts">
	interface Props {
		text: string;
		isActive: boolean;
		isNear: boolean;
		isVisible: boolean;
		index: number;
		mode: 'focus' | 'dynamic';
		fontSize: number;
		onclick: () => void;
	}

	let { text, isActive, isNear, isVisible, index, mode, fontSize, onclick }: Props = $props();
</script>

<button
	class="focus-line w-full text-left transition-all duration-500 ease-out cursor-pointer px-4 py-2 rounded-lg border-none bg-transparent"
	class:active={isActive}
	class:near={isNear}
	class:hidden-line={!isVisible && mode === 'dynamic'}
	style="font-size: {fontSize}px;"
	{onclick}
>
	<span class="line-number mr-4 text-xs font-mono select-none opacity-30">{index + 1}</span>
	<span class="line-text">{text}</span>
</button>

<style>
	.focus-line {
		opacity: 0.15;
		transform: scale(0.98);
		filter: blur(1px);
		line-height: 1.8;
	}

	.focus-line.active {
		opacity: 1;
		transform: scale(1);
		filter: blur(0);
		color: white;
		font-weight: 500;
	}

	.focus-line.near {
		opacity: 0.4;
		transform: scale(0.99);
		filter: blur(0);
	}

	.focus-line.hidden-line {
		opacity: 0;
		height: 0;
		padding: 0;
		overflow: hidden;
	}

	.focus-line:hover:not(.active) {
		opacity: 0.6;
	}
</style>
