<script lang="ts">
	import { reader, THEMES } from '$lib/stores';
	import type { ThemeId } from '$lib/stores';
	import { filterVoicesByLang, detectLanguage } from '$lib/parsers';
	import { onMount } from 'svelte';

	let voices: SpeechSynthesisVoice[] = $state([]);
	let langVoices = $derived(filterVoicesByLang(voices, reader.detectedLang));

	const fonts = [
		{ l: 'Sans', v: 'Inter' },
		{ l: 'Serif', v: 'Georgia' },
		{ l: 'Mono', v: 'monospace' },
		{ l: 'Sys', v: 'system-ui' }
	];

	onMount(() => {
		function load() { voices = window.speechSynthesis.getVoices(); }
		load();
		window.speechSynthesis.onvoiceschanged = load;
	});

	function save() { reader.saveSettings(); }
	function saveLive() { save(); if (reader.isSpeaking) reader.restartSpeech(); }

	function setTheme(id: ThemeId) {
		reader.settings.theme = id;
		save();
		reader.applyTheme();
	}

	function changeVoice(name: string) {
		reader.settings.voice = name;
		save();
		if (reader.isSpeaking) reader.restartSpeech();
	}

	function preview() {
		window.speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance('Focus, word by word.');
		u.rate = reader.settings.wpm / 180;
		u.pitch = reader.settings.speechPitch;
		u.volume = reader.settings.speechVolume;
		u.lang = reader.detectedLang;
		if (reader.settings.voice) {
			const v = voices.find((v) => v.name === reader.settings.voice);
			if (v) u.voice = v;
		}
		window.speechSynthesis.speak(u);
	}
</script>

<div class="sb">
	<!-- Theme -->
	<div class="s">
		<div class="themes">
			{#each THEMES as t}
				<button class="tc" class:on={reader.settings.theme === t.id} onclick={() => setTheme(t.id)}>
					<span class="tc-sw" style="background:{t.preview}"></span>
					<span class="tc-nm">{t.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Font + Align -->
	<div class="s">
		<div class="g2">
			<div>
				<span class="lb">Font</span>
				<div class="ch">{#each fonts as f}<button class="c" class:on={reader.settings.fontFamily === f.v} style="font-family:{f.v}" onclick={() => { reader.settings.fontFamily = f.v; save(); }}>{f.l}</button>{/each}</div>
			</div>
			<div>
				<span class="lb">Align</span>
				<div class="ch">
					<button class="c" class:on={reader.settings.textAlign === 'center'} onclick={() => { reader.settings.textAlign = 'center'; save(); }}>Center</button>
					<button class="c" class:on={reader.settings.textAlign === 'left'} onclick={() => { reader.settings.textAlign = 'left'; save(); }}>Left</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Size + Height + Width + Gap -->
	<div class="s">
		<div class="g2">
			<div class="sl"><div class="sh"><span class="sn">Size</span><span class="sv">{reader.settings.fontSize}px</span></div><input type="range" min="20" max="64" step="2" bind:value={reader.settings.fontSize} oninput={save} /></div>
			<div class="sl"><div class="sh"><span class="sn">Height</span><span class="sv">{reader.settings.lineHeight.toFixed(1)}</span></div><input type="range" min="1.4" max="4" step="0.2" bind:value={reader.settings.lineHeight} oninput={save} /></div>
		</div>
		<div class="g2">
			<div class="sl"><div class="sh"><span class="sn">Width</span><span class="sv">{reader.settings.maxLineWidth}%</span></div><input type="range" min="40" max="100" step="5" bind:value={reader.settings.maxLineWidth} oninput={save} /></div>
			<div class="sl"><div class="sh"><span class="sn">Gap</span><span class="sv">{reader.settings.wordGap.toFixed(2)}</span></div><input type="range" min="0" max="1" step="0.05" bind:value={reader.settings.wordGap} oninput={save} /></div>
		</div>
	</div>

	<!-- Speed + Pitch + Volume -->
	<div class="s">
		<div class="g2">
			<div class="sl"><div class="sh"><span class="sn">Speed</span><span class="sv">{reader.settings.wpm} wpm</span></div><input type="range" min="60" max="600" step="10" bind:value={reader.settings.wpm} oninput={saveLive} /></div>
			<div class="sl"><div class="sh"><span class="sn">Pitch</span><span class="sv">{reader.settings.speechPitch.toFixed(1)}</span></div><input type="range" min="0.5" max="2" step="0.1" bind:value={reader.settings.speechPitch} oninput={saveLive} /></div>
		</div>
		<div class="sl"><div class="sh"><span class="sn">Volume</span><span class="sv">{Math.round(reader.settings.speechVolume * 100)}%</span></div><input type="range" min="0" max="1" step="0.05" bind:value={reader.settings.speechVolume} oninput={saveLive} /></div>
	</div>

	<!-- Voice -->
	<div class="s">
		<span class="lb">Voice ({reader.detectedLang})</span>
		<div class="vr">
			<select value={reader.settings.voice} onchange={(e) => changeVoice((e.target as HTMLSelectElement).value)}>
				<option value="">Auto</option>
				{#each langVoices as v}<option value={v.name}>{v.name}</option>{/each}
				{#if voices.length > langVoices.length}
					<optgroup label="Other">{#each voices.filter(v => !langVoices.includes(v)) as v}<option value={v.name}>{v.name} ({v.lang})</option>{/each}</optgroup>
				{/if}
			</select>
			<button class="vp" onclick={preview} title="Preview"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></button>
		</div>
	</div>

	<!-- Reading mode -->
	<div class="s">
		<span class="lb">Mode</span>
		<div class="mg">
			<button class="mc" class:on={reader.settings.readingMode === 'scroll'} onclick={() => { reader.settings.readingMode = 'scroll'; save(); }}>Scroll</button>
			<button class="mc" class:on={reader.settings.readingMode === 'rsvp'} onclick={() => { reader.settings.readingMode = 'rsvp'; save(); }}>RSVP</button>
			<button class="mc" class:on={reader.settings.readingMode === 'paragraph'} onclick={() => { reader.settings.readingMode = 'paragraph'; save(); }}>Para</button>
			<button class="mc" class:on={reader.settings.readingMode === 'highlight'} onclick={() => { reader.settings.readingMode = 'highlight'; save(); }}>Highlight</button>
		</div>
	</div>

	<!-- Media display -->
	<div class="s">
		<span class="lb">Media</span>
		<div class="ch">
			<button class="c" class:on={reader.settings.mediaDisplay === 'inline'} onclick={() => { reader.settings.mediaDisplay = 'inline'; save(); }}>Side</button>
			<button class="c" class:on={reader.settings.mediaDisplay === 'modal'} onclick={() => { reader.settings.mediaDisplay = 'modal'; save(); }}>Modal</button>
		</div>
	</div>

	<!-- Toggles -->
	<div class="s nb">
		<label class="tr"><span>Bionic reading</span><button class="tg" class:on={reader.settings.bionicReading} onclick={() => { reader.settings.bionicReading = !reader.settings.bionicReading; save(); }}><span class="td"></span></button></label>
		<label class="tr"><span>Zen mode</span><button class="tg" class:on={reader.settings.zenMode} onclick={() => { reader.settings.zenMode = !reader.settings.zenMode; save(); }}><span class="td"></span></button></label>
		<label class="tr"><span>Dyslexia font</span><button class="tg" class:on={reader.settings.dyslexiaFont} onclick={() => { reader.settings.dyslexiaFont = !reader.settings.dyslexiaFont; save(); }}><span class="td"></span></button></label>
		<label class="tr"><span>Speed ramp</span><button class="tg" class:on={reader.settings.speedRamp} onclick={() => { reader.settings.speedRamp = !reader.settings.speedRamp; save(); }}><span class="td"></span></button></label>
		<label class="tr"><span>Pause on interact</span><button class="tg" class:on={reader.settings.pauseOnMedia} onclick={() => { reader.settings.pauseOnMedia = !reader.settings.pauseOnMedia; save(); }}><span class="td"></span></button></label>
		<label class="tr"><span>Smooth scroll</span><button class="tg" class:on={reader.settings.smoothScroll} onclick={() => { reader.settings.smoothScroll = !reader.settings.smoothScroll; save(); }}><span class="td"></span></button></label>
		<label class="tr"><span>Auto language</span><button class="tg" class:on={reader.settings.autoDetectLang} onclick={() => { reader.settings.autoDetectLang = !reader.settings.autoDetectLang; save(); }}><span class="td"></span></button></label>
	</div>
</div>

<style>
	.sb { display: flex; flex-direction: column; gap: 0.8rem; }

	.s {
		display: flex; flex-direction: column; gap: 0.5rem;
		padding-bottom: 0.7rem;
		border-bottom: 1px solid var(--border);
	}
	.s.nb { border-bottom: none; padding-bottom: 0; }

	.lb { color: var(--text-2); font-size: 0.78rem; font-weight: 600; margin-bottom: 0.1rem; }

	/* ── Themes ── */
	.themes { display: flex; gap: 0.3rem; flex-wrap: wrap; }
	.tc {
		all: unset; cursor: pointer;
		display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
		padding: 0.4rem 0.3rem; border-radius: 10px;
		border: 1.5px solid transparent;
		transition: all var(--dur) var(--ease);
		flex: 1; min-width: 40px;
	}
	.tc:hover { background: var(--surface); }
	.tc:active { transform: scale(0.95); }
	.tc.on { border-color: var(--text-3); background: var(--surface-h); }
	.tc-sw { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border-h); }
	.tc.on .tc-sw { border-color: var(--text-3); }
	.tc-nm { font-size: 0.58rem; color: var(--text-4); font-weight: 500; }
	.tc.on .tc-nm { color: var(--text-2); }

	/* ── Grid ── */
	.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }

	/* ── Chips ── */
	.ch { display: flex; gap: 0.3rem; flex-wrap: wrap; }
	.c {
		all: unset; cursor: pointer;
		padding: 0.4rem 0.7rem; border-radius: 8px;
		font-size: 0.78rem; color: var(--text-3);
		border: 1px solid var(--border);
		transition: all var(--dur) var(--ease);
	}
	.c:hover { color: var(--text-2); border-color: var(--border-h); background: var(--surface); }
	.c:active { transform: scale(0.95); }
	.c.on { color: var(--text); background: var(--surface-h); border-color: var(--border-h); }

	/* ── Sliders ── */
	.sl { display: flex; flex-direction: column; gap: 0.35rem; }
	.sh { display: flex; justify-content: space-between; align-items: baseline; }
	.sn { color: var(--text-2); font-size: 0.75rem; font-weight: 500; }
	.sv { color: var(--text-3); font-size: 0.68rem; font-family: monospace; font-variant-numeric: tabular-nums; }
	.sl input[type='range'] { width: 100%; accent-color: var(--text-3); height: 5px; }

	/* ── Voice ── */
	.vr { display: flex; gap: 0.35rem; }
	.vr select {
		flex: 1; background: var(--surface); border: 1px solid var(--border);
		color: var(--text-2); padding: 0.45rem 0.6rem; border-radius: 9px;
		font-size: 0.78rem; outline: none;
	}
	.vp {
		all: unset; cursor: pointer;
		width: 36px; height: 36px;
		display: flex; align-items: center; justify-content: center;
		border-radius: 9px; color: var(--text-3);
		border: 1px solid var(--border);
		transition: all var(--dur) var(--ease);
	}
	.vp:hover { color: var(--text-2); background: var(--surface); }
	.vp:active { transform: scale(0.93); }

	/* ── Mode grid ── */
	.mg { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; }
	.mc {
		all: unset; cursor: pointer; text-align: center;
		padding: 0.5rem 0.3rem; border-radius: 9px;
		font-size: 0.75rem; font-weight: 500;
		color: var(--text-3);
		border: 1.5px solid var(--border);
		transition: all var(--dur) var(--ease);
	}
	.mc:hover { border-color: var(--border-h); background: var(--surface); }
	.mc:active { transform: scale(0.97); }
	.mc.on { border-color: var(--text-3); background: var(--surface-h); color: var(--text); }

	/* ── Toggles ── */
	.tr {
		display: flex; align-items: center; justify-content: space-between;
		padding: 0.3rem 0;
		color: var(--text-2); font-size: 0.78rem;
		cursor: default;
	}
	.tg {
		all: unset; cursor: pointer;
		width: 36px; height: 20px; border-radius: 10px;
		background: var(--surface-h); position: relative;
		transition: background var(--dur) var(--ease);
	}
	.tg.on { background: var(--text-3); }
	.td {
		position: absolute; top: 3px; left: 3px;
		width: 14px; height: 14px; border-radius: 50%;
		background: var(--glass);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
		transition: all var(--dur) var(--ease);
	}
	.tg.on .td { left: 19px; background: var(--bg); }
</style>
