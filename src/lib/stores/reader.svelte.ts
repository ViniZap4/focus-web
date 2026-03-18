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

class ReaderState {
	text = $state('');
	title = $state('');
	lines = $derived(this.text.split('\n').filter((l) => l.trim().length > 0));
	currentLine = $state(0);
	isReading = $state(false);
	mode = $state<'focus' | 'dynamic'>('focus');
	fontSize = $state(20);
	autoPlay = $state(false);
	autoPlaySpeed = $state(3000);

	private autoPlayInterval: ReturnType<typeof setInterval> | null = null;

	setText(title: string, text: string) {
		this.title = title;
		this.text = text;
		this.currentLine = 0;
		this.isReading = false;
		this.stopAutoPlay();
	}

	startReading() {
		this.currentLine = 0;
		this.isReading = true;
	}

	advance() {
		if (this.currentLine < this.lines.length - 1) {
			this.currentLine++;
		}
	}

	goBack() {
		if (this.currentLine > 0) {
			this.currentLine--;
		}
	}

	jumpTo(index: number) {
		if (index >= 0 && index < this.lines.length) {
			this.currentLine = index;
		}
	}

	toggleMode() {
		this.mode = this.mode === 'focus' ? 'dynamic' : 'focus';
	}

	toggleAutoPlay() {
		this.autoPlay = !this.autoPlay;
		if (this.autoPlay) {
			this.autoPlayInterval = setInterval(() => {
				if (this.currentLine < this.lines.length - 1) {
					this.advance();
				} else {
					this.stopAutoPlay();
				}
			}, this.autoPlaySpeed);
		} else {
			this.stopAutoPlay();
		}
	}

	stopAutoPlay() {
		this.autoPlay = false;
		if (this.autoPlayInterval) {
			clearInterval(this.autoPlayInterval);
			this.autoPlayInterval = null;
		}
	}

	reset() {
		this.text = '';
		this.title = '';
		this.currentLine = 0;
		this.isReading = false;
		this.stopAutoPlay();
	}

	get progress() {
		if (this.lines.length === 0) return 0;
		return ((this.currentLine + 1) / this.lines.length) * 100;
	}

	get isAtEnd() {
		return this.currentLine >= this.lines.length - 1;
	}

	get isAtStart() {
		return this.currentLine === 0;
	}
}

export const reader = new ReaderState();
