<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { reader } from '$lib/stores';
	import '../app.css';

	let { children } = $props();

	$effect(() => {
		void reader.settings.theme;
		reader.applyTheme();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
