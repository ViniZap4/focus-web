import { detectLanguage, getBestVoice } from '$lib/parsers/language';

export const sampleTexts = [
	{
		title: 'The Art of Focus',
		lang: 'en',
		content: `In a world saturated with distractions, the ability to focus has become a rare and valuable skill.
Every notification, every buzz, every flash of light pulls our attention in a different direction.
But deep within, there is a quiet place where words become worlds.
When you read with intention, each sentence carries weight.
Each paragraph unfolds like a landscape you are walking through.
The noise fades. The screen narrows. Only the words remain.
This is focus reading — the practice of giving your full attention to one line at a time.
Not skimming. Not scanning. But truly absorbing.
Let each word land before moving to the next.
Feel the rhythm of the language as it moves through you.
In this space, reading becomes meditation.
And in that stillness, understanding blooms.`
	},
	{
		title: 'A Arte do Foco',
		lang: 'pt-BR',
		content: `Em um mundo saturado de distrações, a capacidade de focar se tornou uma habilidade rara e valiosa.
Cada notificação, cada vibração, cada flash de luz puxa nossa atenção em uma direção diferente.
Mas lá no fundo, existe um lugar silencioso onde palavras se tornam mundos.
Quando você lê com intenção, cada frase carrega peso.
Cada parágrafo se desdobra como uma paisagem pela qual você está caminhando.
O barulho desaparece. A tela se estreita. Apenas as palavras permanecem.
Isso é leitura focada — a prática de dar sua atenção total a uma linha por vez.
Sem passar os olhos. Sem escanear. Mas verdadeiramente absorvendo.
Deixe cada palavra pousar antes de seguir para a próxima.
Sinta o ritmo da linguagem enquanto ela se move através de você.
Neste espaço, a leitura se torna meditação.
E nessa quietude, a compreensão floresce.`
	},
	{
		title: 'La Biblioteca Nocturna',
		lang: 'es',
		content: `Ella encontró la puerta a medianoche, escondida detrás de la vieja estantería.
No debería haber estado allí — la pared era de ladrillo sólido esa misma mañana.
Pero ahora estaba ligeramente entreabierta, con luz cálida derramándose por la rendija.
La empujó y entró en una biblioteca que se extendía más allá de la vista.
Los estantes se alzaban como paredes de catedral, desapareciendo en la oscuridad.
Los libros flotaban entre los pasillos, a la deriva como medusas luminosas.
Cada uno pulsaba con un brillo suave — algunos dorados, algunos azules, algunos violeta profundo.
Extendió la mano hacia uno y este se posó en sus manos voluntariamente.
En el momento en que lo abrió, las palabras se elevaron de la página.
Giraron a su alrededor como luciérnagas, formando imágenes en el aire.
Vio montañas. Vio océanos. Vio rostros que nunca había conocido.
Y comprendió — estas no eran solo historias.
Eran memorias de mundos que habían sido olvidados.`
	},
	{
		title: 'The Night Library',
		lang: 'en',
		content: `She found the door at midnight, hidden behind the old bookshelf.
It shouldn't have been there — the wall was solid brick just that morning.
But now it stood slightly ajar, warm light spilling through the crack.
She pushed it open and stepped into a library that stretched beyond sight.
Shelves rose like cathedral walls, disappearing into darkness above.
Books floated between the aisles, drifting like luminous jellyfish.
Each one pulsed with a soft glow — some gold, some blue, some deep violet.
She reached for one and it settled into her hands willingly.
The moment she opened it, the words lifted off the page.
They swirled around her like fireflies, forming images in the air.
She saw mountains. She saw oceans. She saw faces she had never known.
And she understood — these were not just stories.
They were memories of worlds that had been forgotten.
And now, through her reading, they could live again.`
	}
];

export interface WordToken {
	text: string;
	globalIndex: number;
	lineIndex: number;
	wordInLine: number;
}

export interface LineToken {
	words: WordToken[];
	lineIndex: number;
}

export interface MediaItem {
	type: 'image' | 'table';
	src?: string;
	alt?: string;
	rows?: string[][];
	triggerAtWord: number;
}

export interface ReaderSettings {
	fontFamily: string;
	fontSize: number;
	letterSpacing: number;
	lineHeight: number;
	wpm: number;
	voice: string;
	speechPitch: number;
	smoothScroll: boolean;
	autoDetectLang: boolean;
}

const DEFAULT_SETTINGS: ReaderSettings = {
	fontFamily: 'Inter',
	fontSize: 42,
	letterSpacing: 0.5,
	lineHeight: 2.4,
	wpm: 200,
	voice: '',
	speechPitch: 1,
	smoothScroll: true,
	autoDetectLang: true
};

function loadSettings(): ReaderSettings {
	if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
	try {
		const saved = localStorage.getItem('focus-settings');
		if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
	} catch {
		/* empty */
	}
	return { ...DEFAULT_SETTINGS };
}

// ─── Reader ──────────────────────────────────────────────────────────────────
//
// Playback architecture:
//
//   Timer ALWAYS runs during playback as the heartbeat.
//   Speech runs alongside (when available) and fires onboundary events.
//
//   When speech fires onboundary:
//     → It sets currentWord directly and records a timestamp.
//
//   When timer fires:
//     → If speech recently updated the word (within 1 interval), skip.
//     → Otherwise, advance the word by 1.
//
//   This means:
//     • Speech available + onboundary works → speech drives, timer defers.
//     • Speech available but onboundary broken → timer takes over smoothly.
//     • Speech unavailable → timer drives everything.
//     • No stuck words. No dual-advancement. Always progresses.

class ReaderState {
	text = $state('');
	title = $state('');
	currentWord = $state(0);
	isPlaying = $state(false);
	isSpeaking = $state(false);
	isPaused = $state(false);
	showSettings = $state(false);
	settings = $state<ReaderSettings>(loadSettings());
	media = $state<MediaItem[]>([]);
	activeMedia = $state<MediaItem | null>(null);
	fileName = $state('');
	detectedLang = $state('en');
	isRtl = $state(false);
	parseProgress = $state(0);
	isParsing = $state(false);

	private playTimer: ReturnType<typeof setTimeout> | null = null;
	private speechKeepAlive: ReturnType<typeof setInterval> | null = null;
	private lastBoundaryTime = 0; // timestamp of last speech boundary event

	// ── Derived ───────────────────────────────────────────────────────────

	lines = $derived.by((): LineToken[] => {
		const rawLines = this.text.split('\n').filter((l) => l.trim().length > 0);
		let globalIdx = 0;
		return rawLines.map((line, lineIdx) => {
			const words = line.split(/\s+/).filter((w) => w.length > 0);
			const tokens: WordToken[] = words.map((w, wIdx) => ({
				text: w,
				globalIndex: globalIdx++,
				lineIndex: lineIdx,
				wordInLine: wIdx
			}));
			return { words: tokens, lineIndex: lineIdx };
		});
	});

	allWords = $derived(this.lines.flatMap((l) => l.words));
	totalWords = $derived(this.allWords.length);

	private wordLineMap = $derived.by(() => {
		const arr: number[] = [];
		for (const w of this.allWords) arr[w.globalIndex] = w.lineIndex;
		return arr;
	});

	currentLineIndex = $derived(this.wordLineMap[this.currentWord] ?? 0);
	progress = $derived(this.totalWords > 0 ? ((this.currentWord + 1) / this.totalWords) * 100 : 0);
	isAtEnd = $derived(this.totalWords > 0 && this.currentWord >= this.totalWords - 1);
	isAtStart = $derived(this.currentWord === 0);
	etaMinutes = $derived.by(() => {
		const r = this.totalWords - this.currentWord;
		return r > 0 && this.settings.wpm > 0 ? Math.ceil(r / this.settings.wpm) : 0;
	});
	mediaCount = $derived(this.media.length);

	// ── Load content ──────────────────────────────────────────────────────

	setText(title: string, text: string, media: MediaItem[] = [], lang?: string) {
		this.stop();
		this.title = title;
		this.text = text;
		this.media = media;
		this.currentWord = 0;
		this.activeMedia = null;

		if (lang) {
			this.detectedLang = lang;
			this.isRtl = false;
		} else if (this.settings.autoDetectLang && text.length > 0) {
			const r = detectLanguage(text);
			this.detectedLang = r.code;
			this.isRtl = r.isRtl;
		}

		if (this.settings.autoDetectLang && typeof window !== 'undefined') {
			const voices = window.speechSynthesis.getVoices();
			if (voices.length > 0 && !this.settings.voice) {
				const best = getBestVoice(voices, this.detectedLang);
				if (best) this.settings.voice = best.name;
			}
		}
	}

	// ── User navigation ───────────────────────────────────────────────────
	//
	// Every user action that moves the word also restarts speech from that
	// position (if speech is running), so audio stays in sync.

	advance() {
		if (this.currentWord >= this.totalWords - 1) return;
		this.currentWord++;
		this.checkMediaTrigger();
		if (this.isSpeaking) this.seekSpeech();
	}

	goBack() {
		if (this.currentWord <= 0) return;
		this.currentWord--;
		if (this.isSpeaking) this.seekSpeech();
	}

	jumpToWord(index: number) {
		if (index < 0 || index >= this.totalWords || index === this.currentWord) return;
		this.currentWord = index;
		this.checkMediaTrigger();
		if (this.isSpeaking) this.seekSpeech();
	}

	jumpToPercent(pct: number) {
		const max = Math.max(0, this.totalWords - 1);
		this.jumpToWord(Math.round((pct / 100) * max));
	}

	restart() {
		this.stop();
		this.currentWord = 0;
	}

	// ── Media ─────────────────────────────────────────────────────────────

	private checkMediaTrigger() {
		const t = this.media.find((m) => m.triggerAtWord === this.currentWord);
		if (t) this.activeMedia = t;
	}

	dismissMedia() {
		this.activeMedia = null;
	}
	showMediaItem(item: MediaItem) {
		this.activeMedia = item;
	}

	// ── Playback control ──────────────────────────────────────────────────

	play() {
		if (this.isPaused && this.isSpeaking) {
			if (typeof window !== 'undefined') window.speechSynthesis.resume();
			this.isPaused = false;
			this.isPlaying = true;
			this.startTimer();
			return;
		}

		this.isPlaying = true;
		this.isPaused = false;
		this.lastBoundaryTime = 0;

		this.startSpeech();
		this.startTimer(); // always start — defers to speech when boundary fires
	}

	pause() {
		this.isPlaying = false;
		this.isPaused = true;
		this.clearTimer();
		if (this.isSpeaking && typeof window !== 'undefined') {
			window.speechSynthesis.pause();
		}
	}

	stop() {
		this.isPlaying = false;
		this.isSpeaking = false;
		this.isPaused = false;
		this.lastBoundaryTime = 0;
		this.clearTimer();
		this.clearKeepAlive();
		if (typeof window !== 'undefined') window.speechSynthesis.cancel();
	}

	toggle() {
		this.isPlaying ? this.pause() : this.play();
	}

	restartSpeech() {
		if (!this.isPlaying) return;
		this.cancelSpeech();
		this.lastBoundaryTime = 0;
		this.startSpeech();
	}

	// ── Timer ─────────────────────────────────────────────────────────────
	//
	// Runs every WPM interval. If speech boundary fired recently,
	// the timer skips its tick (lets speech drive). Otherwise advances.

	private clearTimer() {
		if (this.playTimer) {
			clearTimeout(this.playTimer);
			this.playTimer = null;
		}
	}

	private startTimer() {
		this.clearTimer();
		if (!this.isPlaying) return;

		const ms = (60 / this.settings.wpm) * 1000;

		this.playTimer = setTimeout(() => {
			if (!this.isPlaying) return;

			// Defer to speech if it updated recently
			const elapsed = Date.now() - this.lastBoundaryTime;
			if (this.isSpeaking && this.lastBoundaryTime > 0 && elapsed < ms * 0.9) {
				this.startTimer();
				return;
			}

			// Advance word
			if (this.currentWord < this.totalWords - 1) {
				this.currentWord++;
				this.checkMediaTrigger();
				this.startTimer();
			} else {
				this.stop();
			}
		}, ms);
	}

	// ── Speech ────────────────────────────────────────────────────────────

	private clearKeepAlive() {
		if (this.speechKeepAlive) {
			clearInterval(this.speechKeepAlive);
			this.speechKeepAlive = null;
		}
	}

	private cancelSpeech() {
		this.isSpeaking = false;
		this.clearKeepAlive();
		if (typeof window !== 'undefined') window.speechSynthesis.cancel();
	}

	/** Seek: cancel current speech, restart from currentWord */
	private seekSpeech() {
		this.cancelSpeech();
		this.lastBoundaryTime = 0;
		if (this.isPlaying) this.startSpeech();
	}

	private startSpeech() {
		if (typeof window === 'undefined' || !window.speechSynthesis) return;

		window.speechSynthesis.cancel();

		const words = this.allWords.slice(this.currentWord);
		if (words.length === 0) return;

		const baseIdx = this.currentWord;
		const wordTexts = words.map((w) => w.text);
		const text = wordTexts.join(' ');

		// Build charOffset→wordIndex map: charStarts[i] = char position of word i
		const charStarts: number[] = [];
		let pos = 0;
		for (const wt of wordTexts) {
			charStarts.push(pos);
			pos += wt.length + 1;
		}

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.rate = Math.max(0.3, Math.min(3, this.settings.wpm / 180));
		utterance.pitch = this.settings.speechPitch;
		utterance.lang = this.detectedLang;

		if (this.settings.voice) {
			const voices = window.speechSynthesis.getVoices();
			const v = voices.find((v) => v.name === this.settings.voice);
			if (v) utterance.voice = v;
		}

		utterance.onboundary = (e) => {
			if (e.name !== 'word' || !this.isPlaying) return;

			// Binary search: find largest i where charStarts[i] <= e.charIndex
			let lo = 0;
			let hi = charStarts.length - 1;
			let wordIdx = 0;
			while (lo <= hi) {
				const mid = (lo + hi) >> 1;
				if (charStarts[mid] <= e.charIndex) {
					wordIdx = mid;
					lo = mid + 1;
				} else {
					hi = mid - 1;
				}
			}

			const globalIdx = baseIdx + wordIdx;
			if (globalIdx >= 0 && globalIdx < this.totalWords) {
				this.currentWord = globalIdx;
				this.lastBoundaryTime = Date.now();
			}
		};

		utterance.onend = () => {
			this.isSpeaking = false;
			this.clearKeepAlive();
			// Timer is still running — it'll either advance remaining words or stop
		};

		utterance.onerror = () => {
			this.isSpeaking = false;
			this.clearKeepAlive();
			// Timer continues as fallback
		};

		this.isSpeaking = true;

		// Chrome workaround: speech hangs after ~15s
		this.clearKeepAlive();
		this.speechKeepAlive = setInterval(() => {
			if (
				typeof window !== 'undefined' &&
				window.speechSynthesis.speaking &&
				!window.speechSynthesis.paused
			) {
				window.speechSynthesis.pause();
				window.speechSynthesis.resume();
			}
		}, 10000);

		window.speechSynthesis.speak(utterance);
	}

	// ── Settings ──────────────────────────────────────────────────────────

	saveSettings() {
		if (typeof window === 'undefined') return;
		localStorage.setItem('focus-settings', JSON.stringify(this.settings));
	}

	toggleSettings() {
		this.showSettings = !this.showSettings;
	}

	reset() {
		this.stop();
		this.text = '';
		this.title = '';
		this.currentWord = 0;
		this.media = [];
		this.activeMedia = null;
		this.fileName = '';
		this.parseProgress = 0;
		this.isParsing = false;
	}
}

export const reader = new ReaderState();
