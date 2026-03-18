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

	totalWords = $derived(this.lines.reduce((sum, l) => sum + l.words.length, 0));

	currentLineIndex = $derived.by(() => {
		for (const line of this.lines) {
			for (const w of line.words) {
				if (w.globalIndex === this.currentWord) return w.lineIndex;
			}
		}
		return 0;
	});

	progress = $derived(this.totalWords > 0 ? ((this.currentWord + 1) / this.totalWords) * 100 : 0);
	isAtEnd = $derived(this.currentWord >= this.totalWords - 1);
	isAtStart = $derived(this.currentWord === 0);

	// Estimated time remaining
	etaMinutes = $derived.by(() => {
		const remaining = this.totalWords - this.currentWord;
		if (remaining <= 0 || this.settings.wpm <= 0) return 0;
		return Math.ceil(remaining / this.settings.wpm);
	});

	mediaCount = $derived(this.media.length);

	setText(title: string, text: string, media: MediaItem[] = [], lang?: string) {
		this.title = title;
		this.text = text;
		this.media = media;
		this.currentWord = 0;
		this.activeMedia = null;
		this.stop();

		// Detect language
		if (lang) {
			this.detectedLang = lang;
		} else if (this.settings.autoDetectLang && text.length > 0) {
			const result = detectLanguage(text);
			this.detectedLang = result.code;
			this.isRtl = result.isRtl;
		}

		// Auto-select voice for detected language
		if (this.settings.autoDetectLang && typeof window !== 'undefined') {
			const voices = window.speechSynthesis.getVoices();
			if (voices.length > 0 && !this.settings.voice) {
				const best = getBestVoice(voices, this.detectedLang);
				if (best) {
					this.settings.voice = best.name;
				}
			}
		}
	}

	advance() {
		if (this.currentWord < this.totalWords - 1) {
			this.currentWord++;
			this.checkMediaTrigger();
		} else {
			this.stop();
		}
	}

	goBack() {
		if (this.currentWord > 0) {
			this.currentWord--;
		}
	}

	jumpToWord(index: number) {
		if (index >= 0 && index < this.totalWords) {
			this.currentWord = index;
			this.checkMediaTrigger();
		}
	}

	jumpToPercent(pct: number) {
		const idx = Math.floor((pct / 100) * (this.totalWords - 1));
		this.jumpToWord(Math.max(0, Math.min(idx, this.totalWords - 1)));
	}

	restart() {
		this.stop();
		this.currentWord = 0;
	}

	private checkMediaTrigger() {
		const triggered = this.media.find((m) => m.triggerAtWord === this.currentWord);
		if (triggered) {
			this.activeMedia = triggered;
		}
	}

	dismissMedia() {
		this.activeMedia = null;
	}

	showMediaItem(item: MediaItem) {
		this.activeMedia = item;
	}

	play() {
		if (this.isPaused && this.isSpeaking) {
			window.speechSynthesis.resume();
			this.isPaused = false;
			this.isPlaying = true;
			return;
		}
		this.isPlaying = true;
		this.isPaused = false;
		this.speak();
		this.scheduleNext();
	}

	pause() {
		this.isPlaying = false;
		this.isPaused = true;
		if (this.playTimer) {
			clearTimeout(this.playTimer);
			this.playTimer = null;
		}
		if (this.isSpeaking) {
			window.speechSynthesis.pause();
		}
	}

	stop() {
		this.isPlaying = false;
		this.isSpeaking = false;
		this.isPaused = false;
		if (this.playTimer) {
			clearTimeout(this.playTimer);
			this.playTimer = null;
		}
		if (this.speechKeepAlive) {
			clearInterval(this.speechKeepAlive);
			this.speechKeepAlive = null;
		}
		if (typeof window !== 'undefined') {
			window.speechSynthesis.cancel();
		}
	}

	toggle() {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	private scheduleNext() {
		if (!this.isPlaying) return;
		const ms = (60 / this.settings.wpm) * 1000;
		this.playTimer = setTimeout(() => {
			if (!this.isPlaying) return;
			this.advance();
			if (!this.isAtEnd) {
				this.scheduleNext();
			}
		}, ms);
	}

	speak() {
		if (typeof window === 'undefined') return;
		window.speechSynthesis.cancel();

		const allWords = this.lines.flatMap((l) => l.words);
		const remaining = allWords.slice(this.currentWord).map((w) => w.text);
		if (remaining.length === 0) return;

		// Chunk text into sentences for better speech quality
		const chunks = chunkText(remaining.join(' '), 200);
		let chunkIndex = 0;
		let globalWordOffset = 0;
		const startWord = this.currentWord;

		const speakChunk = () => {
			if (chunkIndex >= chunks.length || !this.isPlaying) {
				this.isSpeaking = false;
				return;
			}

			const chunk = chunks[chunkIndex];
			const utterance = new SpeechSynthesisUtterance(chunk);

			utterance.rate = Math.max(0.3, Math.min(3, this.settings.wpm / 180));
			utterance.pitch = this.settings.speechPitch;
			utterance.lang = this.detectedLang;

			if (this.settings.voice) {
				const voices = window.speechSynthesis.getVoices();
				const found = voices.find((v) => v.name === this.settings.voice);
				if (found) utterance.voice = found;
			}

			const chunkStartOffset = globalWordOffset;

			utterance.onboundary = (e) => {
				if (e.name === 'word') {
					// Count words in the chunk up to charIndex
					const textBefore = chunk.slice(0, e.charIndex);
					const wordsBeforeCount = textBefore.split(/\s+/).filter((w) => w.length > 0).length;
					const newIdx = startWord + chunkStartOffset + wordsBeforeCount;
					if (newIdx < this.totalWords) {
						this.currentWord = newIdx;
						this.checkMediaTrigger();
					}
				}
			};

			utterance.onend = () => {
				globalWordOffset += chunk.split(/\s+/).filter((w) => w.length > 0).length;
				chunkIndex++;
				if (this.isPlaying) {
					speakChunk();
				} else {
					this.isSpeaking = false;
				}
			};

			utterance.onerror = () => {
				this.isSpeaking = false;
				this.isPlaying = false;
			};

			window.speechSynthesis.speak(utterance);
		};

		this.isSpeaking = true;

		// Chrome bug workaround: speech synthesis pauses after ~15s
		// Keep it alive with periodic resume calls
		this.speechKeepAlive = setInterval(() => {
			if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
				window.speechSynthesis.pause();
				window.speechSynthesis.resume();
			}
		}, 10000);

		speakChunk();
	}

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

/**
 * Split text into chunks at sentence boundaries for better speech quality.
 */
function chunkText(text: string, maxWords: number): string[] {
	const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
	const chunks: string[] = [];
	let current = '';
	let wordCount = 0;

	for (const sentence of sentences) {
		const sentenceWords = sentence.split(/\s+/).filter((w) => w.length > 0).length;
		if (wordCount + sentenceWords > maxWords && current) {
			chunks.push(current.trim());
			current = '';
			wordCount = 0;
		}
		current += sentence;
		wordCount += sentenceWords;
	}

	if (current.trim()) {
		chunks.push(current.trim());
	}

	return chunks;
}

export const reader = new ReaderState();
