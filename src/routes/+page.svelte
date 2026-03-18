<script lang="ts">
	import { goto } from '$app/navigation';
	import { reader, sampleTexts } from '$lib/stores';

	let customText = $state('');
	let customTitle = $state('');

	function select(sample: (typeof sampleTexts)[number]) {
		reader.setText(sample.title, sample.content);
		goto('/reader');
	}

	function start() {
		if (!customText.trim()) return;
		reader.setText(customTitle.trim() || 'Untitled', customText);
		goto('/reader');
	}
</script>

<div class="home">
	<header>
		<h1>Focus</h1>
		<p>word by word</p>
	</header>

	<section class="texts">
		{#each sampleTexts as sample}
			<button class="text-card" onclick={() => select(sample)}>
				<span class="card-title">{sample.title}</span>
				<span class="card-preview">{sample.content.split('\n')[0]}</span>
			</button>
		{/each}
	</section>

	<div class="divider">
		<span>or</span>
	</div>

	<section class="custom">
		<input
			type="text"
			placeholder="title"
			bind:value={customTitle}
		/>
		<textarea
			placeholder="paste your text here..."
			bind:value={customText}
			rows="5"
		></textarea>
		<button
			class="start-btn"
			onclick={start}
			disabled={!customText.trim()}
		>
			read &rarr;
		</button>
	</section>
</div>

<style>
	.home {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		gap: 3rem;
		max-width: 480px;
		margin: 0 auto;
	}

	header {
		text-align: center;
	}

	header h1 {
		font-size: 3.5rem;
		font-weight: 200;
		letter-spacing: -0.03em;
		color: rgba(255, 255, 255, 0.9);
		margin: 0;
	}

	header p {
		color: rgba(255, 255, 255, 0.15);
		font-size: 0.8rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		margin: 0.5rem 0 0;
	}

	.texts {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.text-card {
		all: unset;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 1.25rem;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.03);
		background: rgba(255, 255, 255, 0.01);
		transition: all 0.3s ease;
	}

	.text-card:hover {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.card-title {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.95rem;
		font-weight: 400;
	}

	.card-preview {
		color: rgba(255, 255, 255, 0.15);
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.divider {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.04);
	}

	.divider span {
		color: rgba(255, 255, 255, 0.1);
		font-size: 0.7rem;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.custom {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.custom input,
	.custom textarea {
		all: unset;
		width: 100%;
		padding: 0.75rem 1rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.custom input::placeholder,
	.custom textarea::placeholder {
		color: rgba(255, 255, 255, 0.1);
	}

	.custom input:focus,
	.custom textarea:focus {
		border-color: rgba(255, 255, 255, 0.1);
	}

	.custom textarea {
		resize: none;
		line-height: 1.6;
	}

	.start-btn {
		all: unset;
		cursor: pointer;
		align-self: flex-end;
		padding: 0.55rem 1.5rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.8rem;
		letter-spacing: 0.05em;
		transition: all 0.3s;
	}

	.start-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.9);
	}

	.start-btn:disabled {
		opacity: 0.2;
		cursor: not-allowed;
	}
</style>
