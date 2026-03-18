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
// Word position is driven ONLY by the timer (or user input).
// Speech is audio-only — it plays alongside but does NOT move currentWord.
// This eliminates all sync bugs between speech boundary events and the timer.

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

	private timer: ReturnType<typeof setInterval> | null = null;
	private keepAlive: ReturnType<typeof setInterval> | null = null;

	// ── Derived ───────────────────────────────────────────────────────────

	lines = $derived.by((): LineToken[] => {
		const rawLines = this.text.split('\n').filter((l) => l.trim().length > 0);
		let gi = 0;
		return rawLines.map((line, li) => {
			const words = line.split(/\s+/).filter((w) => w.length > 0);
			return {
				lineIndex: li,
				words: words.map((w, wi) => ({
					text: w,
					globalIndex: gi++,
					lineIndex: li,
					wordInLine: wi
				}))
			};
		});
	});

	allWords = $derived(this.lines.flatMap((l) => l.words));
	totalWords = $derived(this.allWords.length);

	private lineOf = $derived.by(() => {
		const m: number[] = [];
		for (const w of this.allWords) m[w.globalIndex] = w.lineIndex;
		return m;
	});

	currentLineIndex = $derived(this.lineOf[this.currentWord] ?? 0);
	progress = $derived(this.totalWords > 0 ? ((this.currentWord + 1) / this.totalWords) * 100 : 0);
	isAtEnd = $derived(this.totalWords > 0 && this.currentWord >= this.totalWords - 1);
	isAtStart = $derived(this.currentWord <= 0);
	etaMinutes = $derived.by(() => {
		const r = this.totalWords - this.currentWord;
		return r > 0 && this.settings.wpm > 0 ? Math.ceil(r / this.settings.wpm) : 0;
	});
	mediaCount = $derived(this.media.length);

	// ── Load ──────────────────────────────────────────────────────────────

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

	// ── Navigation ────────────────────────────────────────────────────────

	advance() {
		if (this.currentWord < this.totalWords - 1) this.currentWord++;
		this.checkMedia();
	}

	goBack() {
		if (this.currentWord > 0) this.currentWord--;
	}

	jumpToWord(idx: number) {
		if (idx < 0 || idx >= this.totalWords || idx === this.currentWord) return;
		this.currentWord = idx;
		this.checkMedia();
		// Resync speech to new position
		if (this.isSpeaking) this.startSpeechFrom(idx);
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

	private checkMedia() {
		const t = this.media.find((m) => m.triggerAtWord === this.currentWord);
		if (t) this.activeMedia = t;
	}

	dismissMedia() {
		this.activeMedia = null;
	}
	showMediaItem(item: MediaItem) {
		this.activeMedia = item;
	}

	// ── Playback ──────────────────────────────────────────────────────────
	//
	// Timer is the SOLE driver of currentWord during playback.
	// Speech plays audio independently — no onboundary word tracking.

	play() {
		if (this.isPaused) {
			this.isPaused = false;
			this.isPlaying = true;
			if (this.isSpeaking && typeof window !== 'undefined') {
				window.speechSynthesis.resume();
			}
			this.startTimer();
			return;
		}

		this.isPlaying = true;
		this.isPaused = false;
		this.startTimer();
		this.startSpeechFrom(this.currentWord);
	}

	pause() {
		this.isPlaying = false;
		this.isPaused = true;
		this.stopTimer();
		if (this.isSpeaking && typeof window !== 'undefined') {
			window.speechSynthesis.pause();
		}
	}

	stop() {
		this.isPlaying = false;
		this.isSpeaking = false;
		this.isPaused = false;
		this.stopTimer();
		this.stopSpeech();
	}

	toggle() {
		this.isPlaying ? this.pause() : this.play();
	}

	restartSpeech() {
		if (!this.isPlaying) return;
		this.stopSpeech();
		this.startSpeechFrom(this.currentWord);
	}

	// ── Timer ─────────────────────────────────────────────────────────────

	private stopTimer() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	private startTimer() {
		this.stopTimer();
		if (!this.isPlaying) return;

		const ms = Math.max(50, (60 / this.settings.wpm) * 1000);
		this.timer = setInterval(() => {
			if (!this.isPlaying) {
				this.stopTimer();
				return;
			}
			if (this.currentWord < this.totalWords - 1) {
				this.currentWord++;
				this.checkMedia();
			} else {
				this.stop();
			}
		}, ms);
	}

	// ── Speech (audio only, does NOT move currentWord) ────────────────────

	private stopSpeech() {
		this.isSpeaking = false;
		if (this.keepAlive) {
			clearInterval(this.keepAlive);
			this.keepAlive = null;
		}
		if (typeof window !== 'undefined') window.speechSynthesis.cancel();
	}

	private startSpeechFrom(fromWord: number) {
		if (typeof window === 'undefined' || !window.speechSynthesis) return;

		this.stopSpeech();

		const words = this.allWords.slice(fromWord);
		if (words.length === 0) return;

		const text = words.map((w) => w.text).join(' ');
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.rate = Math.max(0.3, Math.min(3, this.settings.wpm / 180));
		utterance.pitch = this.settings.speechPitch;
		utterance.lang = this.detectedLang;

		if (this.settings.voice) {
			const voices = window.speechSynthesis.getVoices();
			const v = voices.find((v) => v.name === this.settings.voice);
			if (v) utterance.voice = v;
		}

		utterance.onend = () => {
			this.isSpeaking = false;
			if (this.keepAlive) {
				clearInterval(this.keepAlive);
				this.keepAlive = null;
			}
		};

		utterance.onerror = () => {
			this.isSpeaking = false;
			if (this.keepAlive) {
				clearInterval(this.keepAlive);
				this.keepAlive = null;
			}
		};

		this.isSpeaking = true;
		window.speechSynthesis.speak(utterance);

		// Chrome workaround: speech hangs after ~15s
		this.keepAlive = setInterval(() => {
			const ss = window.speechSynthesis;
			if (ss.speaking && !ss.paused) {
				ss.pause();
				ss.resume();
			}
		}, 10000);
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
