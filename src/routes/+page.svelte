<script lang="ts">
	import { goto } from '$app/navigation';
	import { PageView } from '../blocks/Views/Page';
	import { Header } from '../blocks/Navigation/Header';
	import { reader, sampleTexts } from '$lib/stores';

	let customText = $state('');
	let customTitle = $state('');

	function selectSample(sample: (typeof sampleTexts)[number]) {
		reader.setText(sample.title, sample.content);
		goto('/reader');
	}

	function startCustom() {
		if (!customText.trim()) return;
		reader.setText(customTitle.trim() || 'Custom Text', customText);
		goto('/reader');
	}
</script>

<PageView>
	<div class="flex flex-col items-center w-full max-w-2xl mx-auto px-6 gap-12 py-12">
		<Header title="Focus" subtitle="read with intention, one line at a time" />

		<!-- Sample texts -->
		<section class="w-full">
			<h2 class="text-sm uppercase tracking-widest text-white/30 mb-4">Choose a text</h2>
			<div class="flex flex-col gap-3">
				{#each sampleTexts as sample}
					<button
						class="sample-card text-left w-full px-5 py-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 cursor-pointer"
						onclick={() => selectSample(sample)}
					>
						<h3 class="text-white/80 font-medium text-base">{sample.title}</h3>
						<p class="text-white/30 text-sm mt-1 line-clamp-1">
							{sample.content.split('\n')[0]}
						</p>
					</button>
				{/each}
			</div>
		</section>

		<!-- Divider -->
		<div class="w-full flex items-center gap-4">
			<div class="flex-1 h-px bg-white/5"></div>
			<span class="text-white/20 text-xs uppercase tracking-widest">or paste your own</span>
			<div class="flex-1 h-px bg-white/5"></div>
		</div>

		<!-- Custom text input -->
		<section class="w-full flex flex-col gap-3">
			<input
				type="text"
				placeholder="Title (optional)"
				bind:value={customTitle}
				class="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/5 text-white/80 placeholder:text-white/20 outline-none focus:border-white/15 transition-colors text-sm"
			/>
			<textarea
				placeholder="Paste your text here..."
				bind:value={customText}
				rows="6"
				class="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/5 text-white/80 placeholder:text-white/20 outline-none focus:border-white/15 transition-colors text-sm resize-none leading-relaxed"
			></textarea>
			<button
				class="self-end px-6 py-2.5 rounded-lg bg-white/10 text-white/80 text-sm border border-white/10 hover:bg-white/15 hover:text-white transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
				onclick={startCustom}
				disabled={!customText.trim()}
			>
				Start Reading &rarr;
			</button>
		</section>

		<!-- Keyboard hint -->
		<footer class="text-white/15 text-xs text-center">
			<p>use <kbd class="px-1.5 py-0.5 rounded bg-white/5 font-mono">&darr;</kbd> <kbd class="px-1.5 py-0.5 rounded bg-white/5 font-mono">space</kbd> <kbd class="px-1.5 py-0.5 rounded bg-white/5 font-mono">j/k</kbd> to navigate while reading</p>
		</footer>
	</div>
</PageView>
