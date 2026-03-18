export const sampleTexts = [
	{
		title: 'The Art of Focus',
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
		title: 'The Night Library',
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
		title: 'On Walking',
		content: `I went to the woods because I wished to live deliberately.
To front only the essential facts of life.
And see if I could not learn what it had to teach.
And not, when I came to die, discover that I had not lived.
I wanted to live deep and suck out all the marrow of life.
To live so sturdily and Spartan-like as to put to rout all that was not life.
To cut a broad swath and shave close.
To drive life into a corner, and reduce it to its lowest terms.
Simplicity, simplicity, simplicity.
Let your affairs be as two or three, and not a hundred or a thousand.
Instead of a million count half a dozen.
And keep your accounts on your thumb-nail.`
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
}

const DEFAULT_SETTINGS: ReaderSettings = {
	fontFamily: 'Inter',
	fontSize: 42,
	letterSpacing: 0.5,
	lineHeight: 2.4,
	wpm: 200,
	voice: '',
	speechPitch: 1,
	smoothScroll: true
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

	private playTimer: ReturnType<typeof setTimeout> | null = null;

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

	// Check for media triggers at current word
	currentMedia = $derived.by(() => {
		return this.media.filter(
			(m) => m.triggerAtWord >= this.currentWord - 5 && m.triggerAtWord <= this.currentWord + 5
		);
	});

	setText(title: string, text: string, media: MediaItem[] = []) {
		this.title = title;
		this.text = text;
		this.media = media;
		this.currentWord = 0;
		this.activeMedia = null;
		this.stop();
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
			// Resume speech
			window.speechSynthesis.resume();
			this.isPaused = false;
			this.isPlaying = true;
			return;
		}
		this.isPlaying = true;
		this.isPaused = false;
		this.scheduleNext();
		this.speak();
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

		// Split into sentences for better speech
		const fullText = remaining.join(' ');
		const utterance = new SpeechSynthesisUtterance(fullText);

		// Map WPM to speech rate (180 wpm is roughly rate 1.0)
		utterance.rate = Math.max(0.3, Math.min(3, this.settings.wpm / 180));
		utterance.pitch = this.settings.speechPitch;

		if (this.settings.voice) {
			const voices = window.speechSynthesis.getVoices();
			const found = voices.find((v) => v.name === this.settings.voice);
			if (found) utterance.voice = found;
		}

		const startWord = this.currentWord;
		let wordOffset = 0;

		utterance.onboundary = (e) => {
			if (e.name === 'word') {
				const newIdx = startWord + wordOffset;
				if (newIdx < this.totalWords) {
					this.currentWord = newIdx;
					this.checkMediaTrigger();
				}
				wordOffset++;
			}
		};

		utterance.onend = () => {
			this.isSpeaking = false;
			this.isPlaying = false;
			this.isPaused = false;
		};

		utterance.onpause = () => {
			this.isPaused = true;
		};

		utterance.onresume = () => {
			this.isPaused = false;
		};

		this.isSpeaking = true;
		window.speechSynthesis.speak(utterance);
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
	}
}

export const reader = new ReaderState();
