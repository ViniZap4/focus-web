<script lang="ts">
	import { reader } from '$lib/stores';
	import { onMount } from 'svelte';

	let voices: SpeechSynthesisVoice[] = $state([]);

	const fonts = [
		{ name: 'Inter', value: 'Inter' },
		{ name: 'Georgia', value: 'Georgia' },
		{ name: 'System', value: 'system-ui' },
		{ name: 'Mono', value: 'monospace' },
		{ name: 'Serif', value: 'serif' }
	];

	onMount(() => {
		function loadVoices() {
			voices = window.speechSynthesis.getVoices().sort((a, b) => {
				if (a.lang < b.lang) return -1;
				if (a.lang > b.lang) return 1;
				return a.name.localeCompare(b.name);
			});
		}
		loadVoices();
		window.speechSynthesis.onvoiceschanged = loadVoices;
	});

	function update() {
		reader.saveSettings();
	}

	function previewVoice() {
		window.speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance('Focus, word by word.');
		u.rate = reader.settings.wpm / 180;
		u.pitch = reader.settings.speechPitch;
		if (reader.settings.voice) {
			const v = voices.find((v) => v.name === reader.settings.voice);
			if (v) u.voice = v;
		}
		window.speechSynthesis.speak(u);
	}
</script>

{#if reader.showSettings}
	<button
		class="backdrop"
		aria-label="Close settings"
		onclick={() => reader.toggleSettings()}
	></button>

	<div class="panel">
		<!-- Header -->
		<div class="panel-head">
			<span>Settings</span>
			<button class="close" onclick={() => reader.toggleSettings()} aria-label="Close">&times;</button>
		</div>

		<!-- Typography section -->
		<div class="section">
			<span class="section-title">Typography</span>

			<div class="row">
				<label for="sf">Font</label>
				<div class="chips">
					{#each fonts as f}
						<button
							class="chip"
							class:active={reader.settings.fontFamily === f.value}
							style="font-family: {f.value}"
							onclick={() => {
								reader.settings.fontFamily = f.value;
								update();
							}}
						>
							{f.name}
						</button>
					{/each}
				</div>
			</div>

			<div class="row">
				<label for="ss">Size</label>
				<div class="slider-row">
					<input id="ss" type="range" min="18" max="64" step="2" bind:value={reader.settings.fontSize} oninput={update} />
					<span class="val">{reader.settings.fontSize}</span>
				</div>
			</div>

			<div class="row">
				<label for="sls">Spacing</label>
				<div class="slider-row">
					<input id="sls" type="range" min="-1" max="8" step="0.5" bind:value={reader.settings.letterSpacing} oninput={update} />
					<span class="val">{reader.settings.letterSpacing}</span>
				</div>
			</div>

			<div class="row">
				<label for="slh">Height</label>
				<div class="slider-row">
					<input id="slh" type="range" min="1.2" max="4" step="0.2" bind:value={reader.settings.lineHeight} oninput={update} />
					<span class="val">{reader.settings.lineHeight.toFixed(1)}</span>
				</div>
			</div>
		</div>

		<!-- Speech section -->
		<div class="section">
			<span class="section-title">Speech</span>

			<div class="row">
				<label for="swpm">Speed</label>
				<div class="slider-row">
					<input id="swpm" type="range" min="60" max="600" step="10" bind:value={reader.settings.wpm} oninput={update} />
					<span class="val">{reader.settings.wpm} wpm</span>
				</div>
			</div>

			<div class="row">
				<label for="sp">Pitch</label>
				<div class="slider-row">
					<input id="sp" type="range" min="0.5" max="2" step="0.1" bind:value={reader.settings.speechPitch} oninput={update} />
					<span class="val">{reader.settings.speechPitch.toFixed(1)}</span>
				</div>
			</div>

			<div class="row">
				<label for="sv">Voice</label>
				<div class="voice-row">
					<select id="sv" bind:value={reader.settings.voice} onchange={update}>
						<option value="">Default</option>
						{#each voices as voice}
							<option value={voice.name}>{voice.name} ({voice.lang})</option>
						{/each}
					</select>
					<button class="preview-btn" onclick={previewVoice} title="Preview voice">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
							<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Display section -->
		<div class="section">
			<span class="section-title">Display</span>
			<div class="row toggle-row">
				<label for="sss">Smooth scroll</label>
				<button
					id="sss"
					class="toggle"
					aria-label="Smooth scroll"
					class:on={reader.settings.smoothScroll}
					onclick={() => {
						reader.settings.smoothScroll = !reader.settings.smoothScroll;
						update();
					}}
					role="switch"
					aria-checked={reader.settings.smoothScroll}
				>
					<span class="toggle-thumb"></span>
				</button>
			</div>
			<div class="row toggle-row">
				<label for="sadl">Auto-detect language</label>
				<button
					id="sadl"
					class="toggle"
					aria-label="Auto-detect language"
					class:on={reader.settings.autoDetectLang}
					onclick={() => {
						reader.settings.autoDetectLang = !reader.settings.autoDetectLang;
						update();
					}}
					role="switch"
					aria-checked={reader.settings.autoDetectLang}
				>
					<span class="toggle-thumb"></span>
				</button>
			</div>
			{#if reader.detectedLang}
				<div class="row">
					<span class="lang-info">Detected: <strong>{reader.detectedLang}</strong></span>
				</div>
			{/if}
		</div>

		<!-- Keybinds -->
		<div class="section keybinds">
			<span class="section-title">Keys</span>
			<div class="kb-grid">
				<span class="kb"><kbd>→</kbd><kbd>j</kbd><kbd>spc</kbd></span><span class="kb-desc">next</span>
				<span class="kb"><kbd>←</kbd><kbd>k</kbd></span><span class="kb-desc">prev</span>
				<span class="kb"><kbd>↓</kbd></span><span class="kb-desc">next line</span>
				<span class="kb"><kbd>↑</kbd></span><span class="kb-desc">prev line</span>
				<span class="kb"><kbd>p</kbd></span><span class="kb-desc">play</span>
				<span class="kb"><kbd>s</kbd></span><span class="kb-desc">speak</span>
				<span class="kb"><kbd>esc</kbd></span><span class="kb-desc">close</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		all: unset;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		z-index: 200;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
	}

	.panel {
		position: fixed;
		right: 1.5rem;
		bottom: 5.5rem;
		width: min(85vw, 300px);
		max-height: 75vh;
		overflow-y: auto;
		scrollbar-width: none;
		background: rgba(20, 20, 20, 0.95);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 20px;
		padding: 1rem;
		z-index: 201;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
		animation: panelIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.panel::-webkit-scrollbar { display: none; }

	@keyframes panelIn {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.96);
		}
	}

	.panel-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		padding-bottom: 0.5rem;
	}

	.close {
		all: unset;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.2);
		font-size: 1.1rem;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s;
	}

	.close:hover {
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
	}

	.section {
		padding: 0.6rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.03);
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.section-title {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.row label {
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.65rem;
	}

	.chips {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.chip {
		all: unset;
		cursor: pointer;
		padding: 0.3rem 0.6rem;
		border-radius: 8px;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.04);
		transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.chip:hover {
		color: rgba(255, 255, 255, 0.6);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.chip.active {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.slider-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.slider-row input[type='range'] {
		flex: 1;
		accent-color: rgba(255, 255, 255, 0.4);
		height: 3px;
	}

	.val {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.6rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		min-width: 3rem;
		text-align: right;
	}

	.voice-row {
		display: flex;
		gap: 0.35rem;
	}

	.voice-row select {
		flex: 1;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.5);
		padding: 0.35rem 0.5rem;
		border-radius: 8px;
		font-size: 0.7rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.voice-row select:focus {
		border-color: rgba(255, 255, 255, 0.12);
	}

	.preview-btn {
		all: unset;
		cursor: pointer;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.25);
		border: 1px solid rgba(255, 255, 255, 0.05);
		transition: all 0.2s;
	}

	.preview-btn:hover {
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
	}

	.toggle-row {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	.toggle {
		all: unset;
		cursor: pointer;
		width: 36px;
		height: 20px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.06);
		position: relative;
		transition: background 0.3s;
	}

	.toggle.on {
		background: rgba(255, 255, 255, 0.2);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.toggle.on .toggle-thumb {
		left: 18px;
		background: white;
	}

	.keybinds {
		gap: 0.4rem;
	}

	.kb-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.2rem 0.6rem;
		align-items: center;
	}

	.kb {
		display: flex;
		gap: 0.2rem;
	}

	.kb kbd {
		background: rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.25);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.55rem;
	}

	.kb-desc {
		color: rgba(255, 255, 255, 0.12);
		font-size: 0.6rem;
	}

	.lang-info {
		color: rgba(255, 255, 255, 0.15);
		font-size: 0.6rem;
	}

	.lang-info strong {
		color: rgba(255, 255, 255, 0.3);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
