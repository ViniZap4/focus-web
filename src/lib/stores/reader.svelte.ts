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

// ─── Reader State ────────────────────────────────────────────────────────────

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

	// ── Derived data ──────────────────────────────────────────────────────

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

	/** Flat array of all words for O(1) access by globalIndex */
	allWords = $derived(this.lines.flatMap((l) => l.words));

	totalWords = $derived(this.allWords.length);

	/** O(1) line lookup: wordLineMap[globalIndex] = lineIndex */
	private wordLineMap = $derived.by(() => {
		const map: number[] = [];
		for (const w of this.allWords) {
			map[w.globalIndex] = w.lineIndex;
		}
		return map;
	});

	currentLineIndex = $derived(this.wordLineMap[this.currentWord] ?? 0);

	progress = $derived(
		this.totalWords > 0 ? ((this.currentWord + 1) / this.totalWords) * 100 : 0
	);
	isAtEnd = $derived(this.totalWords > 0 && this.currentWord >= this.totalWords - 1);
	isAtStart = $derived(this.currentWord === 0);

	etaMinutes = $derived.by(() => {
		const remaining = this.totalWords - this.currentWord;
		if (remaining <= 0 || this.settings.wpm <= 0) return 0;
		return Math.ceil(remaining / this.settings.wpm);
	});

	mediaCount = $derived(this.media.length);

	// ── Content loading ───────────────────────────────────────────────────

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
			const result = detectLanguage(text);
			this.detectedLang = result.code;
			this.isRtl = result.isRtl;
		}

		if (this.settings.autoDetectLang && typeof window !== 'undefined') {
			const voices = window.speechSynthesis.getVoices();
			if (voices.length > 0 && !this.settings.voice) {
				const best = getBestVoice(voices, this.detectedLang);
				if (best) this.settings.voice = best.name;
			}
		}
	}

	// ── Navigation (user-driven) ──────────────────────────────────────────
	//
	// These are called by user actions: keyboard, click, scrub.
	// If speech is active, they restart speech from the new position so
	// the audio stays in sync with the visual focus.

	advance() {
		if (this.currentWord >= this.totalWords - 1) return;
		this.currentWord++;
		this.checkMediaTrigger();
		if (this.isSpeaking) this.restartSpeechFromCurrent();
	}

	goBack() {
		if (this.currentWord <= 0) return;
		this.currentWord--;
		if (this.isSpeaking) this.restartSpeechFromCurrent();
	}

	jumpToWord(index: number) {
		if (index < 0 || index >= this.totalWords || index === this.currentWord) return;
		this.currentWord = index;
		this.checkMediaTrigger();
		if (this.isSpeaking) this.restartSpeechFromCurrent();
	}

	jumpToPercent(pct: number) {
		const maxIdx = Math.max(0, this.totalWords - 1);
		const idx = Math.round((pct / 100) * maxIdx);
		this.jumpToWord(Math.max(0, Math.min(idx, maxIdx)));
	}

	restart() {
		this.stop();
		this.currentWord = 0;
	}

	// ── Media ─────────────────────────────────────────────────────────────

	private checkMediaTrigger() {
		const triggered = this.media.find((m) => m.triggerAtWord === this.currentWord);
		if (triggered) this.activeMedia = triggered;
	}

	dismissMedia() {
		this.activeMedia = null;
	}

	showMediaItem(item: MediaItem) {
		this.activeMedia = item;
	}

	// ── Playback ──────────────────────────────────────────────────────────
	//
	// Architecture:
	// - play() tries speech first. Speech boundary events drive currentWord.
	// - If speech is unavailable, a WPM-based timer drives currentWord instead.
	// - Speech and timer NEVER run simultaneously.

	play() {
		// Resume from pause
		if (this.isPaused && this.isSpeaking) {
			if (typeof window !== 'undefined') window.speechSynthesis.resume();
			this.isPaused = false;
			this.isPlaying = true;
			return;
		}

		this.isPlaying = true;
		this.isPaused = false;
		this.clearTimer();

		// Try speech. If it starts, speech drives word position.
		this.startSpeech();

		// Fallback: if speech didn't start, use timer.
		if (!this.isSpeaking) {
			this.scheduleNext();
		}
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
		this.clearTimer();
		this.clearKeepAlive();
		if (typeof window !== 'undefined') {
			window.speechSynthesis.cancel();
		}
	}

	toggle() {
		if (this.isPlaying) this.pause();
		else this.play();
	}

	/** Restart speech with current settings (e.g. after voice change) */
	restartSpeech() {
		if (!this.isPlaying) return;
		this.stopSpeechOnly();
		this.startSpeech();
		if (!this.isSpeaking) this.scheduleNext();
	}

	// ── Timer (fallback when speech is unavailable) ───────────────────────

	private clearTimer() {
		if (this.playTimer) {
			clearTimeout(this.playTimer);
			this.playTimer = null;
		}
	}

	private scheduleNext() {
		this.clearTimer();
		if (!this.isPlaying || this.isSpeaking) return;
		const ms = (60 / this.settings.wpm) * 1000;
		this.playTimer = setTimeout(() => {
			if (!this.isPlaying || this.isSpeaking) return;
			if (this.currentWord < this.totalWords - 1) {
				this.currentWord++;
				this.checkMediaTrigger();
				this.scheduleNext();
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

	private stopSpeechOnly() {
		this.isSpeaking = false;
		this.clearKeepAlive();
		if (typeof window !== 'undefined') window.speechSynthesis.cancel();
	}

	private restartSpeechFromCurrent() {
		this.stopSpeechOnly();
		if (this.isPlaying) {
			this.startSpeech();
			if (!this.isSpeaking) this.scheduleNext();
		}
	}

	private startSpeech() {
		if (typeof window === 'undefined') return;
		if (!window.speechSynthesis) return;

		window.speechSynthesis.cancel();

		const wordsFromCurrent = this.allWords.slice(this.currentWord);
		if (wordsFromCurrent.length === 0) return;

		// Build the full text and a char-offset → globalIndex map.
		// This is the single source of truth for word tracking.
		const wordTexts = wordsFromCurrent.map((w) => w.text);
		const fullText = wordTexts.join(' ');

		// charOffsets[i] = character index where word i starts in fullText
		const charOffsets: number[] = [];
		let pos = 0;
		for (const wt of wordTexts) {
			charOffsets.push(pos);
			pos += wt.length + 1; // +1 for space separator
		}

		const baseGlobalIndex = this.currentWord;

		// Chunk into sentences for better speech quality.
		// But track the word offset for each chunk precisely.
		const chunks = buildChunks(fullText, charOffsets, 200);

		let chunkIdx = 0;

		const speakNextChunk = () => {
			if (chunkIdx >= chunks.length || !this.isPlaying) {
				this.isSpeaking = false;
				this.clearKeepAlive();
				// If still playing but speech ended, fall back to timer
				if (this.isPlaying && this.isAtEnd) this.stop();
				return;
			}

			const chunk = chunks[chunkIdx];
			const utterance = new SpeechSynthesisUtterance(chunk.text);
			utterance.rate = Math.max(0.3, Math.min(3, this.settings.wpm / 180));
			utterance.pitch = this.settings.speechPitch;
			utterance.lang = this.detectedLang;

			if (this.settings.voice) {
				const voices = window.speechSynthesis.getVoices();
				const found = voices.find((v) => v.name === this.settings.voice);
				if (found) utterance.voice = found;
			}

			utterance.onboundary = (e) => {
				if (e.name !== 'word' || !this.isPlaying) return;

				// e.charIndex is relative to this chunk's text.
				// Find which word in the chunk this corresponds to.
				const absCharIdx = e.charIndex;
				let wordInChunk = 0;
				for (let i = chunk.wordCharOffsets.length - 1; i >= 0; i--) {
					if (absCharIdx >= chunk.wordCharOffsets[i]) {
						wordInChunk = i;
						break;
					}
				}

				const globalIdx = baseGlobalIndex + chunk.firstWordOffset + wordInChunk;
				if (globalIdx >= 0 && globalIdx < this.totalWords) {
					// Direct assignment — no jumpToWord() to avoid restarting speech
					this.currentWord = globalIdx;
				}
			};

			utterance.onend = () => {
				chunkIdx++;
				if (this.isPlaying) {
					speakNextChunk();
				} else {
					this.isSpeaking = false;
					this.clearKeepAlive();
				}
			};

			utterance.onerror = () => {
				this.isSpeaking = false;
				this.clearKeepAlive();
				// Fall back to timer
				if (this.isPlaying) this.scheduleNext();
			};

			window.speechSynthesis.speak(utterance);
		};

		this.isSpeaking = true;

		// Chrome workaround: speech pauses after ~15s without interaction
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

		speakNextChunk();
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

// ─── Speech chunk builder ────────────────────────────────────────────────────
//
// Splits text into chunks at sentence boundaries while keeping a precise
// mapping from each chunk's local word positions to the global word array.

interface SpeechChunk {
	text: string;
	firstWordOffset: number; // index of this chunk's first word in the global word array
	wordCharOffsets: number[]; // char position of each word within this chunk
}

function buildChunks(
	fullText: string,
	globalCharOffsets: number[],
	maxWordsPerChunk: number
): SpeechChunk[] {
	const totalWords = globalCharOffsets.length;
	if (totalWords === 0) return [];

	// Find sentence boundaries (period, exclamation, question followed by space)
	const sentenceEnds: number[] = [];
	for (let i = 0; i < fullText.length - 1; i++) {
		if ('.!?'.includes(fullText[i]) && fullText[i + 1] === ' ') {
			sentenceEnds.push(i + 1); // position after the punctuation
		}
	}

	const chunks: SpeechChunk[] = [];
	let wordStart = 0;

	while (wordStart < totalWords) {
		let wordEnd = Math.min(wordStart + maxWordsPerChunk, totalWords);

		// Try to break at a sentence boundary
		if (wordEnd < totalWords) {
			const charStart = globalCharOffsets[wordStart];
			const charEnd = globalCharOffsets[wordEnd] ?? fullText.length;

			// Find the last sentence boundary within this range
			let bestBreak = -1;
			for (const se of sentenceEnds) {
				if (se > charStart && se <= charEnd) {
					// Find which word starts after this boundary
					for (let w = wordStart; w < wordEnd; w++) {
						if (globalCharOffsets[w] >= se) {
							bestBreak = w;
							break;
						}
					}
				}
			}
			if (bestBreak > wordStart) {
				wordEnd = bestBreak;
			}
		}

		// Extract chunk text
		const chunkCharStart = globalCharOffsets[wordStart];
		const chunkCharEnd =
			wordEnd < totalWords ? globalCharOffsets[wordEnd] - 1 : fullText.length;
		const chunkText = fullText.slice(chunkCharStart, chunkCharEnd).trim();

		// Build local char offsets for this chunk
		const localOffsets: number[] = [];
		for (let w = wordStart; w < wordEnd; w++) {
			localOffsets.push(globalCharOffsets[w] - chunkCharStart);
		}

		chunks.push({
			text: chunkText,
			firstWordOffset: wordStart,
			wordCharOffsets: localOffsets
		});

		wordStart = wordEnd;
	}

	return chunks;
}

export const reader = new ReaderState();
