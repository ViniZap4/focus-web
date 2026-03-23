# Focus

**Read with intention, one word at a time.**

Focus is a distraction-free, customizable reading app built for speed readers, researchers, and anyone who wants to deeply engage with text. Upload PDFs, EPUBs, or paste text — then read in the mode that suits you best.

## Features

### 4 Reading Modes

- **Scroll** — traditional scrolling with highlighted active words and context lines
- **RSVP** — rapid serial visual presentation, one word at a time at adjustable WPM
- **Paragraph** — centers the current sentence with surrounding context
- **Highlight** — book-like scrollable view with color-coded line proximity

### File Support

- **PDF** — full text extraction with heading detection and embedded images/tables
- **EPUB** — e-book support with metadata, chapter hierarchy, and media
- **Text** — `.txt`, `.md`, `.html`, `.htm`, `.xhtml`, `.rtf`

### Text-to-Speech

- Browser-native speech synthesis with language-aware voice selection
- Configurable rate (60–600 WPM), pitch, and volume
- Automatic fallback to timer-based playback if speech boundaries aren't available

### Accessibility

- **Dyslexia font** (OpenDyslexic)
- **Bionic reading** — bolds the first part of words with adjustable strength
- **Speed ramp** — gradually accelerates to your target WPM
- Full keyboard navigation

### Themes

6 built-in themes: Light, Dark, Sepia, Midnight, OLED, and Auto (system preference)

### More

- Reading history with progress tracking
- Bookmarks
- In-document search
- Section/chapter navigator with auto-detection
- Embedded media (images, tables, YouTube videos, links)
- Zen mode for fully distraction-free reading
- Extensive keyboard shortcuts

## Getting Started

```sh
npm install
npm run dev
```

## Building

```sh
npm run build
npm run preview
```

## Tech Stack

- [SvelteKit](https://svelte.dev) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [PDF.js](https://mozilla.github.io/pdf.js/) for PDF parsing
- [JSZip](https://stuk.github.io/jszip/) for EPUB parsing
- [Motion](https://motion.dev) for animations
