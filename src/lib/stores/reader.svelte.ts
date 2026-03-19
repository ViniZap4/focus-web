import { detectLanguage, getBestVoice } from '$lib/parsers/language';

export const sampleTexts: { title: string; lang: string; content: string; media?: MediaItem[] }[] = [
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
	},
	{
		title: 'The Web of Knowledge',
		lang: 'en',
		content: `The internet has transformed how we access information.
What once required a trip to the library now takes a single search query.
Images, videos, and interactive content are woven into every article.
Consider the structure of a well-organized document.
It starts with a clear introduction, followed by supporting evidence.
Tables summarize data. Charts reveal trends. Links connect ideas to their sources.
A photograph can convey what a thousand words cannot.
The golden ratio appears throughout nature, from sunflower seeds to galaxy spirals.
Video has become the dominant medium for learning complex topics.
From short tutorials to full lectures, moving images teach what static text struggles to explain.
Lists help organize information into digestible pieces.
First, they break down complex processes into steps.
Second, they highlight key points without burying them in paragraphs.
Third, they create visual breathing room on the page.
External resources extend the reach of any document.
Wikipedia alone contains over six million articles in English.
The best readers know when to follow a link and when to stay focused.
Data tells stories when presented clearly.
A simple table comparing features can guide a decision more effectively than pages of prose.
Reading in the modern age means navigating not just text but a rich landscape of media.
The skill is not just comprehension but curation — choosing what deserves your attention.
And that is what focus reading is about.`,
		media: [
			{
				type: 'image',
				src: 'data:image/svg+xml;base64,' +
					btoa(`<svg width="480" height="320" xmlns="http://www.w3.org/2000/svg">
						<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8d5b7"/><stop offset="100%" stop-color="#c9a96e"/></linearGradient></defs>
						<rect width="100%" height="100%" fill="url(#g)" rx="16"/>
						<circle cx="340" cy="100" r="50" fill="#f0e6d0" opacity="0.6"/>
						<path d="M120 280 Q200 120 280 200 Q360 280 440 180" fill="none" stroke="#8b7355" stroke-width="2" opacity="0.5"/>
						<text x="50%" y="55%" font-family="Georgia,serif" font-size="20" fill="#5a4a3a" text-anchor="middle">Golden Ratio in Nature</text>
					</svg>`),
				alt: 'The golden ratio spiral found in nature',
				triggerAtWord: 55
			},
			{
				type: 'table',
				rows: [
					['Medium', 'Strength', 'Best For'],
					['Text', 'Depth & nuance', 'Analysis, narrative'],
					['Image', 'Instant impact', 'Data viz, evidence'],
					['Video', 'Process & motion', 'Tutorials, demos'],
					['Audio', 'Passive learning', 'Commute, exercise']
				],
				triggerAtWord: 138
			},
			{
				type: 'video',
				src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				label: 'How Focus Reading Works',
				triggerAtWord: 68
			},
			{
				type: 'link',
				href: 'https://en.wikipedia.org/wiki/Speed_reading',
				label: 'Wikipedia: Speed Reading',
				triggerAtWord: 117
			},
			{
				type: 'image',
				src: 'data:image/svg+xml;base64,' +
					btoa(`<svg width="480" height="280" xmlns="http://www.w3.org/2000/svg">
						<rect width="100%" height="100%" fill="#1a1a2e" rx="16"/>
						<rect x="40" y="220" width="40" height="40" fill="#e94560" rx="4"/>
						<rect x="100" y="180" width="40" height="80" fill="#0f3460" rx="4"/>
						<rect x="160" y="140" width="40" height="120" fill="#e94560" rx="4"/>
						<rect x="220" y="100" width="40" height="160" fill="#0f3460" rx="4"/>
						<rect x="280" y="60" width="40" height="200" fill="#e94560" rx="4"/>
						<rect x="340" y="120" width="40" height="140" fill="#0f3460" rx="4"/>
						<rect x="400" y="80" width="40" height="180" fill="#e94560" rx="4"/>
						<text x="50%" y="30" font-family="sans-serif" font-size="14" fill="#eee" text-anchor="middle">Reading Trends Over Time</text>
					</svg>`),
				alt: 'Chart showing reading trends over time',
				triggerAtWord: 130
			}
		]
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
	type: 'image' | 'table' | 'video' | 'link';
	src?: string;
	alt?: string;
	rows?: string[][];
	href?: string;
	label?: string;
	triggerAtWord: number;
}

export interface Section {
	title: string;
	wordIndex: number;
	level: number;
}

export type ThemeId = 'auto' | 'light' | 'dark' | 'sepia' | 'midnight';

export const THEMES: { id: ThemeId; label: string; preview: string }[] = [
	{ id: 'auto', label: 'Auto', preview: 'linear-gradient(160deg, #e8e8e8 40%, #3a3a3a 60%)' },
	{ id: 'light', label: 'Light', preview: '#f5f5f5' },
	{ id: 'dark', label: 'Dark', preview: '#222222' },
	{ id: 'sepia', label: 'Sepia', preview: '#ece5d5' },
	{ id: 'midnight', label: 'Night', preview: '#14142a' }
];

export interface ReaderSettings {
	theme: ThemeId;
	fontFamily: string;
	fontSize: number;
	letterSpacing: number;
	lineHeight: number;
	textAlign: 'center' | 'left';
	maxLineWidth: number;
	wordGap: number;
	wpm: number;
	voice: string;
	speechPitch: number;
	speechVolume: number;
	smoothScroll: boolean;
	autoDetectLang: boolean;
	pauseOnMedia: boolean;
	bionicReading: boolean;
	bionicStrength: number;
	sentencePause: number;
}

export interface ReadingSession {
	title: string;
	fileName: string;
	currentWord: number;
	totalWords: number;
	lastRead: number;
	textHash: string;
}

const DEFAULT_SETTINGS: ReaderSettings = {
	theme: 'auto',
	fontFamily: 'Inter',
	fontSize: 42,
	letterSpacing: 0.5,
	lineHeight: 2.4,
	textAlign: 'center',
	maxLineWidth: 65,
	wordGap: 0.3,
	wpm: 180,
	voice: '',
	speechPitch: 1,
	speechVolume: 0.85,
	smoothScroll: true,
	autoDetectLang: true,
	pauseOnMedia: true,
	bionicReading: false,
	bionicStrength: 0.5,
	sentencePause: 0.3
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

// ─── Playback modes ──────────────────────────────────────────────────────────
//
// SPEECH mode (default when speech is available):
//   Speech plays audio. onboundary fires a simple COUNTER — each "word"
//   boundary increments the counter. currentWord = startWord + counter.
//   No charIndex mapping. If onboundary doesn't fire within 1.5s,
//   automatically falls back to TIMER mode.
//
// TIMER mode (fallback):
//   setInterval at WPM rate advances currentWord.
//   No speech involvement.
//
// Only ONE mode runs at a time. Never both.

class ReaderState {
	text = $state('');
	title = $state('');
	currentWord = $state(0);
	isPlaying = $state(false);
	isSpeaking = $state(false);
	isPaused = $state(false);
	showSettings = $state(false);
	showSections = $state(false);
	settings = $state<ReaderSettings>(loadSettings());
	media = $state<MediaItem[]>([]);
	activeMedia = $state<MediaItem | null>(null);
	fileName = $state('');
	detectedLang = $state('en');
	isRtl = $state(false);
	parseProgress = $state(0);
	isParsing = $state(false);
	parsedSections = $state<Section[]>([]);

	private timer: ReturnType<typeof setInterval> | null = null;
	private keepAlive: ReturnType<typeof setInterval> | null = null;
	private fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
	private speechGen = 0; // generation counter to ignore stale events

	// ── Derived ───────────────────────────────────────────────────────────

	lines = $derived.by((): LineToken[] => {
		const rawLines = this.text.split('\n').filter((l) => l.trim().length > 0);
		let gi = 0;
		return rawLines.map((line, li) => ({
			lineIndex: li,
			words: line
				.split(/\s+/)
				.filter((w) => w.length > 0)
				.map((w, wi) => ({ text: w, globalIndex: gi++, lineIndex: li, wordInLine: wi }))
		}));
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

	// How many words to highlight as "active" — wider during playback,
	// but never crosses a line boundary
	focusCount = $derived.by(() => {
		if (!this.isPlaying) return 1;
		const wanted = Math.max(2, Math.min(4, Math.ceil(this.settings.wpm / 180)));
		// Find how many words remain on the current line from currentWord
		const line = this.lines[this.currentLineIndex];
		if (!line) return 1;
		const posInLine = this.currentWord - line.words[0].globalIndex;
		const remaining = line.words.length - posInLine;
		return Math.min(wanted, remaining);
	});

	sections = $derived.by((): Section[] => {
		// Prefer sections from parser (EPUB headings, PDF heading detection)
		if (this.parsedSections.length > 0) return this.parsedSections;

		// Fallback: auto-detect from text structure
		const rawLines = this.text.split('\n');
		const sections: Section[] = [];
		let gi = 0;
		let prevWasEmpty = true;

		for (const line of rawLines) {
			const trimmed = line.trim();
			if (trimmed.length === 0) {
				prevWasEmpty = true;
				continue;
			}

			const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

			if (prevWasEmpty && words.length > 0) {
				const preview = words.slice(0, 8).join(' ');
				sections.push({
					title: preview + (words.length > 8 ? '...' : ''),
					wordIndex: gi,
					level: 0
				});
			}

			gi += words.length;
			prevWasEmpty = false;
		}

		return sections;
	});

	currentSectionIndex = $derived.by(() => {
		let idx = 0;
		for (let i = 0; i < this.sections.length; i++) {
			if (this.sections[i].wordIndex <= this.currentWord) idx = i;
			else break;
		}
		return idx;
	});

	// ── Load ──────────────────────────────────────────────────────────────

	setText(title: string, text: string, media: MediaItem[] = [], lang?: string, sections?: Section[]) {
		this.stop();
		this.title = title;
		this.text = text;
		this.media = media;
		this.parsedSections = sections ?? [];
		this.currentWord = 0;
		this.lastCheckedWord = 0;
		this.activeMedia = null;

		const prevLang = this.detectedLang;

		if (lang) {
			this.detectedLang = lang;
			this.isRtl = false;
		} else if (this.settings.autoDetectLang && text.length > 0) {
			const r = detectLanguage(text);
			this.detectedLang = r.code;
			this.isRtl = r.isRtl;
		}

		// Pick the best voice for the detected language
		if (typeof window !== 'undefined') {
			const langChanged = this.detectedLang !== prevLang;
			const pickVoice = () => {
				const voices = window.speechSynthesis.getVoices();
				if (voices.length > 0 && (langChanged || !this.settings.voice)) {
					const best = getBestVoice(voices, this.detectedLang);
					if (best) this.settings.voice = best.name;
				}
			};
			pickVoice();
			// Voices may load async — listen for them
			if (window.speechSynthesis.getVoices().length === 0) {
				window.speechSynthesis.addEventListener('voiceschanged', pickVoice, { once: true });
			}
		}
	}

	// ── Navigation (user-driven, always works) ────────────────────────────

	advance() {
		if (this.currentWord < this.totalWords - 1) {
			this.currentWord++;
			this.checkMedia();
		}
	}

	goBack() {
		if (this.currentWord > 0) this.currentWord--;
	}

	jumpToWord(idx: number) {
		if (idx < 0 || idx >= this.totalWords || idx === this.currentWord) return;
		this.currentWord = idx;
		this.checkMedia();
		if (this.isSpeaking && this.isPlaying) {
			// Restart speech from new position
			this.startSpeechMode(idx);
		}
	}

	jumpToPercent(pct: number) {
		const max = Math.max(0, this.totalWords - 1);
		this.jumpToWord(Math.round((pct / 100) * max));
	}

	restart() {
		this.stop();
		this.currentWord = 0;
		this.lastCheckedWord = 0;
	}

	// ── Media ─────────────────────────────────────────────────────────────

	private lastCheckedWord = 0;

	private checkMedia() {
		// Range-based check so media triggers even if timer skips a word
		const t = this.media.find(
			(m) => m.triggerAtWord > this.lastCheckedWord && m.triggerAtWord <= this.currentWord
		);
		this.lastCheckedWord = this.currentWord;
		if (t) this.activeMedia = t;
	}

	dismissMedia() {
		this.activeMedia = null;
	}

	showMediaItem(item: MediaItem) {
		this.activeMedia = item;
	}

	// Pause when the user actively interacts with media (click image, open link, etc.)
	interactMedia() {
		if (this.settings.pauseOnMedia && this.isPlaying) {
			this.pause();
		}
	}

	// ── Playback control ──────────────────────────────────────────────────

	play() {
		if (this.isPaused) {
			this.isPaused = false;
			this.isPlaying = true;
			if (this.isSpeaking && typeof window !== 'undefined') {
				window.speechSynthesis.resume();
			} else {
				this.startTimerMode();
			}
			return;
		}

		this.isPlaying = true;
		this.isPaused = false;

		// Try speech mode. Falls back to timer if onboundary doesn't fire.
		this.startSpeechMode(this.currentWord);
	}

	pause() {
		this.isPlaying = false;
		this.isPaused = true;
		this.stopTimer();
		this.clearFallback();
		if (this.isSpeaking && typeof window !== 'undefined') {
			window.speechSynthesis.pause();
		}
		this.saveProgress();
	}

	stop() {
		this.isPlaying = false;
		this.isSpeaking = false;
		this.isPaused = false;
		this.stopTimer();
		this.stopSpeech();
		this.clearFallback();
		this.saveProgress();
	}

	toggle() {
		this.isPlaying ? this.pause() : this.play();
	}

	restartSpeech() {
		if (!this.isPlaying) return;
		this.startSpeechMode(this.currentWord);
	}

	// ── Speech mode ───────────────────────────────────────────────────────
	//
	// Uses charIndex from onboundary to find which of OUR words the
	// speech engine is currently on. Forward-only guard prevents drift.
	// Falls back to timer if onboundary never fires.

	private static SPEECH_CHUNK = 150;

	// Natural speech rate multipliers per language base code
	// Languages with longer words or more syllables per word need slower rates
	private static LANG_RATE: Record<string, number> = {
		en: 1.0,
		es: 0.95,
		fr: 0.95,
		de: 0.88,
		it: 0.95,
		pt: 0.92,
		ru: 0.85,
		ja: 0.8,
		zh: 0.75,
		ko: 0.82,
		ar: 0.85,
		he: 0.88,
		hi: 0.85
	};

	private startSpeechMode(fromWord: number) {
		this.stopTimer();
		this.stopSpeech();
		this.clearFallback();

		if (typeof window === 'undefined' || !window.speechSynthesis) {
			this.startTimerMode();
			return;
		}

		// Only speak a chunk, not the entire book
		const chunkEnd = Math.min(fromWord + ReaderState.SPEECH_CHUNK, this.totalWords);
		const words = this.allWords.slice(fromWord, chunkEnd);
		if (words.length === 0) {
			this.stop();
			return;
		}

		this.speechGen++;
		const gen = this.speechGen;
		const baseWord = fromWord;
		let gotFirstBoundary = false;

		const wordTexts = words.map((w) => w.text);
		const text = wordTexts.join(' ');

		const charStarts: number[] = [];
		let pos = 0;
		for (const wt of wordTexts) {
			charStarts.push(pos);
			pos += wt.length + 1;
		}

		const utterance = new SpeechSynthesisUtterance(text);
		const baseLang = this.detectedLang.split('-')[0];
		const langRate = ReaderState.LANG_RATE[baseLang] ?? 1.0;
		// Use logarithmic scaling for more natural feel at extreme WPM values
		// 180 wpm = rate 1.0, 360 wpm = rate 1.7 (not 2.0), 60 wpm = rate 0.5
		const rawRate = this.settings.wpm / 180;
		const smoothRate = rawRate <= 1 ? rawRate : 1 + Math.log2(rawRate);
		utterance.rate = Math.max(0.3, Math.min(2.5, smoothRate * langRate));
		utterance.pitch = this.settings.speechPitch;
		utterance.volume = this.settings.speechVolume;
		utterance.lang = this.detectedLang;

		const voices = window.speechSynthesis.getVoices();
		if (this.settings.voice) {
			const v = voices.find((v) => v.name === this.settings.voice);
			if (v) utterance.voice = v;
		} else if (voices.length > 0) {
			const best = getBestVoice(voices, this.detectedLang);
			if (best) utterance.voice = best;
		}

		utterance.onboundary = (e) => {
			if (gen !== this.speechGen || e.name !== 'word' || !this.isPlaying) return;

			if (!gotFirstBoundary) {
				gotFirstBoundary = true;
				this.clearFallback();
			}

			const searchFrom = Math.max(0, this.currentWord - baseWord);
			let bestIdx = searchFrom;
			let bestDist = Math.abs(charStarts[searchFrom] - e.charIndex);

			for (let i = searchFrom + 1; i < charStarts.length; i++) {
				const dist = Math.abs(charStarts[i] - e.charIndex);
				if (dist < bestDist) {
					bestDist = dist;
					bestIdx = i;
				}
				if (charStarts[i] > e.charIndex + 10) break;
			}

			const target = baseWord + bestIdx;
			if (target >= this.currentWord && target < this.totalWords) {
				this.currentWord = target;
				this.checkMedia();
			}
		};

		utterance.onend = () => {
			if (gen !== this.speechGen) return;
			this.clearKeepAlive();
			// Chain next chunk if there's more text
			if (this.isPlaying && this.currentWord < this.totalWords - 1) {
				const nextWord = Math.min(baseWord + words.length, this.totalWords - 1);
				if (nextWord > this.currentWord) this.currentWord = nextWord;
				this.startSpeechMode(this.currentWord);
			} else {
				this.isSpeaking = false;
				this.stop();
			}
		};

		utterance.onerror = () => {
			if (gen !== this.speechGen) return;
			this.isSpeaking = false;
			this.clearKeepAlive();
			if (this.isPlaying) this.startTimerMode();
		};

		this.isSpeaking = true;
		window.speechSynthesis.speak(utterance);

		this.clearKeepAlive();
		this.keepAlive = setInterval(() => {
			const ss = window.speechSynthesis;
			if (ss.speaking && !ss.paused) {
				ss.pause();
				ss.resume();
			}
		}, 10000);

		this.fallbackTimeout = setTimeout(() => {
			if (gen !== this.speechGen) return;
			if (!gotFirstBoundary && this.isPlaying) {
				this.startTimerMode();
			}
		}, 1500);
	}

	// ── Timer mode (fallback) ─────────────────────────────────────────────

	private startTimerMode() {
		this.stopTimer();
		if (!this.isPlaying) return;

		const tick = () => {
			if (!this.isPlaying) {
				this.stopTimer();
				return;
			}
			if (this.currentWord < this.totalWords - 1) {
				this.currentWord++;
				this.checkMedia();

				// Sentence pause: extra delay after punctuation
				const word = this.allWords[this.currentWord]?.text || '';
				const isPunctuation = /[.!?;:]$/.test(word);
				if (isPunctuation && this.settings.sentencePause > 0) {
					this.stopTimer();
					this.timer = setTimeout(() => {
						if (this.isPlaying) this.startTimerMode();
					}, this.settings.sentencePause * 1000) as unknown as ReturnType<typeof setInterval>;
					return;
				}
			} else {
				this.stop();
			}
		};

		const ms = Math.max(50, (60 / this.settings.wpm) * 1000);
		this.timer = setInterval(tick, ms);
	}

	// ── Cleanup helpers ───────────────────────────────────────────────────

	private stopTimer() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	private clearKeepAlive() {
		if (this.keepAlive) {
			clearInterval(this.keepAlive);
			this.keepAlive = null;
		}
	}

	private clearFallback() {
		if (this.fallbackTimeout) {
			clearTimeout(this.fallbackTimeout);
			this.fallbackTimeout = null;
		}
	}

	private stopSpeech() {
		this.isSpeaking = false;
		this.clearKeepAlive();
		this.speechGen++; // invalidate any pending events
		if (typeof window !== 'undefined') window.speechSynthesis.cancel();
	}

	// ── Settings ──────────────────────────────────────────────────────────

	private saveTimer: ReturnType<typeof setTimeout> | null = null;

	saveSettings() {
		if (typeof window === 'undefined') return;
		if (this.saveTimer) clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => {
			localStorage.setItem('focus-settings', JSON.stringify(this.settings));
		}, 300);
	}

	applyTheme() {
		if (typeof document === 'undefined') return;
		document.documentElement.setAttribute('data-theme', this.settings.theme);
	}

	toggleSettings() {
		this.showSettings = !this.showSettings;
		if (this.showSettings) this.showSections = false;
	}

	toggleSections() {
		this.showSections = !this.showSections;
		if (this.showSections) this.showSettings = false;
	}

	// ── Reading History ───────────────────────────────────────────────────

	saveProgress() {
		if (!this.text || typeof window === 'undefined') return;
		const hash = this.text.slice(0, 100);
		const sessions: ReadingSession[] = JSON.parse(localStorage.getItem('focus-history') || '[]');
		const existing = sessions.findIndex((s) => s.textHash === hash);
		const session: ReadingSession = {
			title: this.title || 'Untitled',
			fileName: this.fileName,
			currentWord: this.currentWord,
			totalWords: this.totalWords,
			lastRead: Date.now(),
			textHash: hash
		};
		if (existing >= 0) sessions[existing] = session;
		else sessions.unshift(session);
		localStorage.setItem('focus-history', JSON.stringify(sessions.slice(0, 20)));
	}

	loadHistory(): ReadingSession[] {
		if (typeof window === 'undefined') return [];
		try {
			return JSON.parse(localStorage.getItem('focus-history') || '[]');
		} catch {
			return [];
		}
	}

	reset() {
		this.saveProgress();
		this.stop();
		this.text = '';
		this.title = '';
		this.currentWord = 0;
		this.lastCheckedWord = 0;
		this.media = [];
		this.activeMedia = null;
		this.fileName = '';
		this.parseProgress = 0;
		this.isParsing = false;
		this.parsedSections = [];
	}
}

export const reader = new ReaderState();
