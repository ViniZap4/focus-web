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
		color: rgba(255, 255, 255, 0.08);
	}

	.msg {
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.85rem;
	}

	a {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.75rem;
		text-decoration: none;
		margin-top: 1rem;
		transition: color 0.2s;
	}

	a:hover {
		color: rgba(255, 255, 255, 0.6);
	}
</style>
