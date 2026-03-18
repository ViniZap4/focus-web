<script lang="ts">
	import { reader } from '$lib/stores';
	import { onMount } from 'svelte';

	let voices: SpeechSynthesisVoice[] = $state([]);

	const fonts = [
		'Inter',
		'Georgia',
		'Merriweather',
		'system-ui',
		'monospace',
		'serif'
	];

	onMount(() => {
		function loadVoices() {
			voices = window.speechSynthesis.getVoices();
		}
		loadVoices();
		window.speechSynthesis.onvoiceschanged = loadVoices;
	});

	function update() {
		reader.saveSettings();
	}
</script>

{#if reader.showSettings}
	<!-- Backdrop -->
	<button class="backdrop" aria-label="Close settings" onclick={() => reader.toggleSettings()}></button>

	<div class="settings-panel">
		<div class="panel-header">
			<span>Settings</span>
			<button class="close-btn" onclick={() => reader.toggleSettings()}>&times;</button>
		</div>

		<!-- Font Family -->
		<div class="setting-row">
			<label for="s-font">Font</label>
			<select
				id="s-font"
				bind:value={reader.settings.fontFamily}
				onchange={update}
			>
				{#each fonts as font}
					<option value={font} style="font-family: {font}">{font}</option>
				{/each}
			</select>
		</div>

		<!-- Font Size -->
		<div class="setting-row">
			<label for="s-size">Size</label>
			<div class="range-row">
				<input
					id="s-size"
					type="range"
					min="18"
					max="64"
					step="2"
					bind:value={reader.settings.fontSize}
					oninput={update}
				/>
				<span class="range-val">{reader.settings.fontSize}px</span>
			</div>
		</div>

		<!-- Letter Spacing -->
		<div class="setting-row">
			<label for="s-ls">Letter spacing</label>
			<div class="range-row">
				<input
					id="s-ls"
					type="range"
					min="-1"
					max="8"
					step="0.5"
					bind:value={reader.settings.letterSpacing}
					oninput={update}
				/>
				<span class="range-val">{reader.settings.letterSpacing}px</span>
			</div>
		</div>

		<!-- Line Height -->
		<div class="setting-row">
			<label for="s-lh">Line height</label>
			<div class="range-row">
				<input
					id="s-lh"
					type="range"
					min="1.2"
					max="4"
					step="0.2"
					bind:value={reader.settings.lineHeight}
					oninput={update}
				/>
				<span class="range-val">{reader.settings.lineHeight.toFixed(1)}</span>
			</div>
		</div>

		<!-- Speed (WPM) -->
		<div class="setting-row">
			<label for="s-speed">Speed</label>
			<div class="range-row">
				<input
					id="s-speed"
					type="range"
					min="60"
					max="600"
					step="10"
					bind:value={reader.settings.wpm}
					oninput={update}
				/>
				<span class="range-val">{reader.settings.wpm} wpm</span>
			</div>
		</div>

		<!-- Voice -->
		<div class="setting-row">
			<label for="s-voice">Voice</label>
			<select
				id="s-voice"
				bind:value={reader.settings.voice}
				onchange={update}
			>
				<option value="">Default</option>
				{#each voices as voice}
					<option value={voice.name}>{voice.name}</option>
				{/each}
			</select>
		</div>

		<!-- Keybinds hint -->
		<div class="keybinds">
			<span class="keybinds-title">Keybinds</span>
			<div class="kb-row"><kbd>&rarr;</kbd><kbd>j</kbd><kbd>space</kbd> next word</div>
			<div class="kb-row"><kbd>&larr;</kbd><kbd>k</kbd> previous word</div>
			<div class="kb-row"><kbd>&darr;</kbd> next line</div>
			<div class="kb-row"><kbd>&uarr;</kbd> previous line</div>
			<div class="kb-row"><kbd>p</kbd> play / pause</div>
			<div class="kb-row"><kbd>s</kbd> speak</div>
			<div class="kb-row"><kbd>esc</kbd> settings</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		all: unset;
		position: fixed;
		inset: 0;
		z-index: 200;
	}

	.settings-panel {
		position: fixed;
		right: 1.5rem;
		bottom: 5.5rem;
		width: min(85vw, 320px);
		background: rgba(25, 25, 25, 0.95);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
		padding: 1.25rem;
		z-index: 201;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.8rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.close-btn {
		all: unset;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.3);
		font-size: 1.2rem;
		padding: 0.2rem;
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: rgba(255, 255, 255, 0.7);
	}

	.setting-row {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.setting-row label {
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.setting-row select {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.7);
		padding: 0.4rem 0.6rem;
		border-radius: 8px;
		font-size: 0.8rem;
		outline: none;
	}

	.setting-row select:focus {
		border-color: rgba(255, 255, 255, 0.15);
	}

	.range-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.range-row input[type="range"] {
		flex: 1;
		accent-color: rgba(255, 255, 255, 0.5);
		height: 4px;
	}

	.range-val {
		color: rgba(255, 255, 255, 0.35);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
		min-width: 4rem;
		text-align: right;
		font-family: monospace;
	}

	.keybinds {
		border-top: 1px solid rgba(255, 255, 255, 0.04);
		padding-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.keybinds-title {
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 0.2rem;
	}

	.kb-row {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.7rem;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.kb-row kbd {
		background: rgba(255, 255, 255, 0.05);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.65rem;
	}
</style>
