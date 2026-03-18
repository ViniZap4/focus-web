<script lang="ts">
	import { page } from '$app/state';
	import { PageView } from '../blocks/Views/Page';
</script>

<PageView>
	<div class="flex flex-col items-center gap-4 text-center">
		<h1 class="text-6xl font-light text-white/20">{page.status}</h1>
		<p class="text-white/40 text-sm">{page.error?.message}</p>
		<a
			href="/"
			class="mt-4 text-white/50 hover:text-white/80 transition-colors text-sm no-underline"
		>
			&larr; Back to home
		</a>
	</div>
</PageView>
