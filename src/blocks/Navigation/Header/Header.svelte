<script lang="ts">
	interface Props {
		title?: string;
		subtitle?: string;
	}

	let { title = 'Focus', subtitle = '' }: Props = $props();
</script>

<header class="w-full px-6 py-8">
	<h1 class="text-4xl font-light tracking-tight text-white/90">{title}</h1>
	{#if subtitle}
		<p class="mt-2 text-sm text-white/40 tracking-wide">{subtitle}</p>
	{/if}
</header>
