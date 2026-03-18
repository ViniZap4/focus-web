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

export interface ReaderSettings {
	fontFamily: string;
	fontSize: number;
	letterSpacing: number;
	lineHeight: number;
	wpm: number;
	voice: string;
}

const DEFAULT_SETTINGS: ReaderSettings = {
	fontFamily: 'Inter',
	fontSize: 36,
	letterSpacing: 0,
	lineHeight: 2.2,
	wpm: 200,
	voice: ''
};

function loadSettings(): ReaderSettings {
	if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
	try {
		const saved = localStorage.getItem('focus-settings');
		if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
	} catch {}
	return { ...DEFAULT_SETTINGS };
}

class ReaderState {
	text = $state('');
	title = $state('');
	currentWord = $state(0);
	isPlaying = $state(false);
	isSpeaking = $state(false);
	showSettings = $state(false);
	settings = $state<ReaderSettings>(loadSettings());

	private speechUtterance: SpeechSynthesisUtterance | null = null;
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

	setText(title: string, text: string) {
		this.title = title;
		this.text = text;
		this.currentWord = 0;
		this.stop();
	}

	advance() {
		if (this.currentWord < this.totalWords - 1) {
			this.currentWord++;
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
		}
	}

	play() {
		this.isPlaying = true;
		this.scheduleNext();
		this.speak();
	}

	stop() {
		this.isPlaying = false;
		this.isSpeaking = false;
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
			this.stop();
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

		const utterance = new SpeechSynthesisUtterance(remaining.join(' '));
		utterance.rate = this.settings.wpm / 180;

		if (this.settings.voice) {
			const voices = window.speechSynthesis.getVoices();
			const found = voices.find((v) => v.name === this.settings.voice);
			if (found) utterance.voice = found;
		}

		const startWord = this.currentWord;
		let wordOffset = 0;

		utterance.onboundary = (e) => {
			if (e.name === 'word') {
				this.currentWord = startWord + wordOffset;
				wordOffset++;
			}
		};

		utterance.onend = () => {
			this.isSpeaking = false;
			this.isPlaying = false;
		};

		this.isSpeaking = true;
		this.speechUtterance = utterance;
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
	}
}

export const reader = new ReaderState();
