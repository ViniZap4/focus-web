<script lang="ts">
	import { reader } from '$lib/stores';
	import { filterVoicesByLang } from '$lib/parsers';
	import { onMount } from 'svelte';

	let voices: SpeechSynthesisVoice[] = $state([]);
	let langVoices = $derived(filterVoicesByLang(voices, reader.detectedLang));

	const fonts = [
		{ label: 'Sans', value: 'Inter' },
		{ label: 'Serif', value: 'Georgia' },
		{ label: 'Mono', value: 'monospace' },
		{ label: 'System', value: 'system-ui' }
	];

	onMount(() => {
		function load() { voices = window.speechSynthesis.getVoices(); }
		load();
		window.speechSynthesis.onvoiceschanged = load;
	});

	function save() { reader.saveSettings(); }

	function changeVoice(name: string) {
		reader.settings.voice = name;
		save();
		if (reader.isSpeaking) {
			reader.stop();
			reader.play();
		}
	}

	function preview() {
		window.speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance('Focus, word by word.');
		u.rate = reader.settings.wpm / 180;
		u.pitch = reader.settings.speechPitch;
		u.lang = reader.detectedLang;
		if (reader.settings.voice) {
			const v = voices.find((v) => v.name === reader.settings.voice);
			if (v) u.voice = v;
		}
		window.speechSynthesis.speak(u);
	}
</script>

{#if reader.showSettings}
	<button class="backdrop" aria-label="Close" onclick={() => reader.toggleSettings()}></button>

	<div class="panel">
		<div class="head">
			<span>Settings</span>
			<button class="x" aria-label="Close" onclick={() => reader.toggleSettings()}>&times;</button>
		</div>

		<!-- Font row -->
		<div class="row">
			<div class="chips">
				{#each fonts as f}
					<button
						class="chip"
						class:on={reader.settings.fontFamily === f.value}
						style="font-family: {f.value}"
						onclick={() => { reader.settings.fontFamily = f.value; save(); }}
					>{f.label}</button>
				{/each}
			</div>
		</div>

		<!-- Size + Height -->
		<div class="row dual">
			<div class="slider-col">
				<label for="sz">Size</label>
				<div class="s-row">
					<input id="sz" type="range" min="20" max="64" step="2" bind:value={reader.settings.fontSize} oninput={save} />
					<span class="v">{reader.settings.fontSize}</span>
				</div>
			</div>
			<div class="slider-col">
				<label for="lh">Height</label>
				<div class="s-row">
					<input id="lh" type="range" min="1.4" max="4" step="0.2" bind:value={reader.settings.lineHeight} oninput={save} />
					<span class="v">{reader.settings.lineHeight.toFixed(1)}</span>
				</div>
			</div>
		</div>

		<!-- Spacing + Speed -->
		<div class="row dual">
			<div class="slider-col">
				<label for="ls">Spacing</label>
				<div class="s-row">
					<input id="ls" type="range" min="-1" max="6" step="0.5" bind:value={reader.settings.letterSpacing} oninput={save} />
					<span class="v">{reader.settings.letterSpacing}</span>
				</div>
			</div>
			<div class="slider-col">
				<label for="wpm">WPM</label>
				<div class="s-row">
					<input id="wpm" type="range" min="60" max="600" step="10" bind:value={reader.settings.wpm} oninput={save} />
					<span class="v">{reader.settings.wpm}</span>
				</div>
			</div>
		</div>

		<div class="divider"></div>

		<!-- Voice -->
		<div class="row">
			<div class="voice-pick">
				<select
					value={reader.settings.voice}
					onchange={(e) => changeVoice((e.target as HTMLSelectElement).value)}
				>
					<option value="">Auto ({reader.detectedLang})</option>
					{#if langVoices.length > 0}
						{#each langVoices as v}
							<option value={v.name}>{v.name}</option>
						{/each}
					{/if}
					{#if voices.length > langVoices.length}
						<optgroup label="Other">
							{#each voices.filter(v => !langVoices.includes(v)) as v}
								<option value={v.name}>{v.name} ({v.lang})</option>
							{/each}
						</optgroup>
					{/if}
				</select>
				<button class="play-voice" onclick={preview} title="Preview">
					<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
						<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Pitch -->
		<div class="row">
			<div class="s-row">
				<label for="pi" class="inline-label">Pitch</label>
				<input id="pi" type="range" min="0.5" max="2" step="0.1" bind:value={reader.settings.speechPitch} oninput={save} />
				<span class="v">{reader.settings.speechPitch.toFixed(1)}</span>
			</div>
		</div>

		<div class="divider"></div>

		<!-- Toggles -->
		<div class="row toggles">
			<label>Smooth scroll
				<button
					class="tog" class:on={reader.settings.smoothScroll}
					aria-label="Smooth scroll"
					onclick={() => { reader.settings.smoothScroll = !reader.settings.smoothScroll; save(); }}
				><span class="dot"></span></button>
			</label>
			<label>Auto-detect lang
				<button
					class="tog" class:on={reader.settings.autoDetectLang}
					aria-label="Auto-detect language"
					onclick={() => { reader.settings.autoDetectLang = !reader.settings.autoDetectLang; save(); }}
				><span class="dot"></span></button>
			</label>
		</div>

		<!-- Keys -->
		<div class="keys">
			<span><kbd>→</kbd> <kbd>j</kbd> <kbd>spc</kbd> next</span>
			<span><kbd>←</kbd> <kbd>k</kbd> prev</span>
			<span><kbd>↓↑</kbd> line</span>
			<span><kbd>p</kbd> play</span>
			<span><kbd>s</kbd> speak</span>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		all: unset;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.05);
		z-index: 200;
		animation: fadeIn 0.15s ease;
	}
	@keyframes fadeIn { from { opacity: 0; } }

	.panel {
		position: fixed;
		right: 1.25rem;
		bottom: 5rem;
		width: min(88vw, 320px);
		max-height: 70vh;
		overflow-y: auto;
		scrollbar-width: none;
		background: rgba(255, 255, 255, 0.97);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 18px;
		padding: 0.85rem;
		z-index: 201;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.08);
		animation: panelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.panel::-webkit-scrollbar { display: none; }
	@keyframes panelIn { from { opacity: 0; transform: translateY(10px) scale(0.97); } }

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: rgba(0, 0, 0, 0.35);
		font-size: 0.65rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}
	.x {
		all: unset; cursor: pointer;
		color: rgba(0, 0, 0, 0.2); font-size: 1rem;
		width: 22px; height: 22px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 7px; transition: all 0.2s;
	}
	.x:hover { color: rgba(0, 0, 0, 0.5); background: rgba(0, 0, 0, 0.04); }

	.row { display: flex; flex-direction: column; gap: 0.25rem; }

	.dual {
		flex-direction: row;
		gap: 0.6rem;
	}
	.slider-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.slider-col label, .inline-label {
		color: rgba(0, 0, 0, 0.25);
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.s-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.s-row input[type='range'] {
		flex: 1;
		accent-color: rgba(0, 0, 0, 0.3);
		height: 3px;
	}
	.v {
		color: rgba(0, 0, 0, 0.2);
		font-size: 0.55rem;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		min-width: 2rem;
		text-align: right;
	}

	.chips { display: flex; gap: 0.2rem; }
	.chip {
		all: unset; cursor: pointer;
		padding: 0.25rem 0.55rem;
		border-radius: 7px;
		font-size: 0.65rem;
		color: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(0, 0, 0, 0.04);
		transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.chip:hover { color: rgba(0, 0, 0, 0.5); border-color: rgba(0, 0, 0, 0.1); }
	.chip.on { color: rgba(0, 0, 0, 0.7); background: rgba(0, 0, 0, 0.05); border-color: rgba(0, 0, 0, 0.1); }

	.divider {
		height: 1px;
		background: rgba(0, 0, 0, 0.04);
		margin: 0.1rem 0;
	}

	.voice-pick {
		display: flex;
		gap: 0.3rem;
	}
	.voice-pick select {
		flex: 1;
		background: rgba(0, 0, 0, 0.02);
		border: 1px solid rgba(0, 0, 0, 0.06);
		color: rgba(0, 0, 0, 0.45);
		padding: 0.3rem 0.5rem;
		border-radius: 8px;
		font-size: 0.65rem;
		outline: none;
	}
	.voice-pick select:focus { border-color: rgba(0, 0, 0, 0.12); }

	.play-voice {
		all: unset; cursor: pointer;
		width: 28px; height: 28px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 8px;
		color: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(0, 0, 0, 0.05);
		transition: all 0.2s;
	}
	.play-voice:hover { color: rgba(0, 0, 0, 0.5); background: rgba(0, 0, 0, 0.03); }

	.toggles {
		flex-direction: column;
		gap: 0.4rem;
	}
	.toggles label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: rgba(0, 0, 0, 0.3);
		font-size: 0.6rem;
	}
	.tog {
		all: unset; cursor: pointer;
		width: 32px; height: 18px;
		border-radius: 9px;
		background: rgba(0, 0, 0, 0.06);
		position: relative;
		transition: background 0.3s;
	}
	.tog.on { background: rgba(0, 0, 0, 0.2); }
	.dot {
		position: absolute;
		top: 2px; left: 2px;
		width: 14px; height: 14px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.3);
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.tog.on .dot { left: 16px; background: #1a1a1a; }

	.keys {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 0.6rem;
		padding-top: 0.2rem;
	}
	.keys span {
		color: rgba(0, 0, 0, 0.12);
		font-size: 0.55rem;
		white-space: nowrap;
	}
	.keys kbd {
		background: rgba(0, 0, 0, 0.04);
		color: rgba(0, 0, 0, 0.25);
		padding: 0.05rem 0.25rem;
		border-radius: 3px;
		font-family: monospace;
		font-size: 0.5rem;
	}
</style>
