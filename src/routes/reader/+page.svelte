<script lang="ts">
	import { goto } from '$app/navigation';
	import { reader } from '$lib/stores';
	import { TextDisplay } from '../../blocks/Reader/TextDisplay';
	import { Toolbar } from '../../blocks/Reader/Toolbar';
	import { onMount } from 'svelte';

	onMount(() => {
		if (!reader.text) {
			goto('/');
			return;
		}
		reader.startReading();
	});
</script>

{#if reader.isReading}
	<div class="reader-container min-h-screen bg-[#242424] pb-20">
		<TextDisplay />
		<Toolbar />
	</div>
{/if}
