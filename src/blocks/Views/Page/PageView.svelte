<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children: Snippet;
	}

	let { children, ...rest }: Props = $props();
</script>

<div class="flex items-center justify-center w-screen h-screen overscroll-x-none overflow-y-auto" {...rest}>
	{@render children()}
</div>
