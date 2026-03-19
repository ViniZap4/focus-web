<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="error">
	<span class="code">{page.status}</span>
	<span class="msg">{page.error?.message}</span>
	<a href="/">&larr; home</a>
</div>

<style>
	.error {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.code {
		font-size: 4rem;
		font-weight: 100;
		color: var(--text-5);
	}

	.msg {
		color: var(--text-3);
		font-size: 0.85rem;
	}

	a {
		color: var(--text-4);
		font-size: 0.75rem;
		text-decoration: none;
		margin-top: 1rem;
		transition: color var(--dur) var(--ease);
	}

	a:hover {
		color: var(--text-2);
	}
</style>
