/**
 * Lightweight language detection based on Unicode ranges and common word patterns.
 * Returns a BCP-47 language tag.
 */

interface LangProfile {
	code: string;
	name: string;
	patterns: RegExp[];
	unicodeRanges?: [number, number][];
}

const PROFILES: LangProfile[] = [
	{
		code: 'zh',
		name: 'Chinese',
		patterns: [],
		unicodeRanges: [
			[0x4e00, 0x9fff], // CJK Unified
			[0x3400, 0x4dbf] // CJK Extension A
		]
	},
	{
		code: 'ja',
		name: 'Japanese',
		patterns: [],
		unicodeRanges: [
			[0x3040, 0x309f], // Hiragana
			[0x30a0, 0x30ff] // Katakana
		]
	},
	{
		code: 'ko',
		name: 'Korean',
		patterns: [],
		unicodeRanges: [
			[0xac00, 0xd7af], // Hangul Syllables
			[0x1100, 0x11ff] // Hangul Jamo
		]
	},
	{
		code: 'ar',
		name: 'Arabic',
		patterns: [],
		unicodeRanges: [
			[0x0600, 0x06ff],
			[0x0750, 0x077f]
		]
	},
	{
		code: 'he',
		name: 'Hebrew',
		patterns: [],
		unicodeRanges: [[0x0590, 0x05ff]]
	},
	{
		code: 'hi',
		name: 'Hindi',
		patterns: [],
		unicodeRanges: [[0x0900, 0x097f]]
	},
	{
		code: 'ru',
		name: 'Russian',
		patterns: [/\b(и|в|не|на|что|он|как|это|но|она|было|его|все)\b/i],
		unicodeRanges: [[0x0400, 0x04ff]]
	},
	{
		code: 'pt-BR',
		name: 'Portuguese',
		patterns: [
			/\b(não|uma|com|para|que|como|mais|sobre|também|quando|ainda|muito|pode|isso)\b/i,
			/\b(são|está|até|então|depois|porque|entre|foi|ser|ter|fazer)\b/i,
			/[ãõçê]/i
		]
	},
	{
		code: 'es',
		name: 'Spanish',
		patterns: [
			/\b(el|la|los|las|un|una|del|que|en|por|con|para|como|pero|más|este|esta|ese|esa)\b/i,
			/[ñ¿¡]/
		]
	},
	{
		code: 'fr',
		name: 'French',
		patterns: [
			/\b(le|la|les|un|une|des|du|de|et|est|en|que|qui|dans|pour|pas|sur|avec|ce|il)\b/i,
			/[àâéèêëîïôùûüÿç]/i
		]
	},
	{
		code: 'de',
		name: 'German',
		patterns: [
			/\b(der|die|das|und|ist|ein|eine|nicht|ich|du|er|sie|es|wir|mit|auf|für|den|dem)\b/i,
			/[äöüß]/i
		]
	},
	{
		code: 'it',
		name: 'Italian',
		patterns: [
			/\b(il|lo|la|le|un|una|di|del|che|è|non|con|per|sono|come|questo|anche|più|ma)\b/i,
			/[àèéìòù]/i
		]
	},
	{
		code: 'en',
		name: 'English',
		patterns: [
			/\b(the|and|is|in|it|of|to|was|for|that|with|this|but|not|are|from|they|have|had)\b/i
		]
	}
];

const RTL_CODES = new Set(['ar', 'he', 'fa', 'ur']);

export interface LanguageResult {
	code: string;
	name: string;
	confidence: number;
	isRtl: boolean;
}

export function detectLanguage(text: string): LanguageResult {
	const sample = text.slice(0, 5000);
	const scores = new Map<string, number>();

	for (const profile of PROFILES) {
		let score = 0;

		// Check Unicode ranges
		if (profile.unicodeRanges) {
			let rangeCount = 0;
			for (const char of sample) {
				const cp = char.codePointAt(0) || 0;
				for (const [start, end] of profile.unicodeRanges) {
					if (cp >= start && cp <= end) {
						rangeCount++;
						break;
					}
				}
			}
			score += (rangeCount / sample.length) * 100;
		}

		// Check word patterns
		for (const pattern of profile.patterns) {
			const matches = sample.match(new RegExp(pattern, 'gi'));
			if (matches) {
				score += matches.length * 2;
			}
		}

		if (score > 0) {
			scores.set(profile.code, score);
		}
	}

	// Find best match
	let bestCode = 'en';
	let bestScore = 0;
	for (const [code, score] of scores) {
		if (score > bestScore) {
			bestCode = code;
			bestScore = score;
		}
	}

	const profile = PROFILES.find((p) => p.code === bestCode) || PROFILES[PROFILES.length - 1];
	const maxPossibleScore = 100;
	const confidence = Math.min(1, bestScore / maxPossibleScore);

	return {
		code: profile.code,
		name: profile.name,
		confidence,
		isRtl: RTL_CODES.has(profile.code)
	};
}

/**
 * Filter speech synthesis voices by language code.
 */
export function filterVoicesByLang(
	voices: SpeechSynthesisVoice[],
	langCode: string
): SpeechSynthesisVoice[] {
	const baseLang = langCode.split('-')[0].toLowerCase();
	return voices.filter((v) => {
		const voiceLang = v.lang.split('-')[0].toLowerCase();
		return voiceLang === baseLang;
	});
}

/**
 * Get the best default voice for a language.
 */
export function getBestVoice(
	voices: SpeechSynthesisVoice[],
	langCode: string
): SpeechSynthesisVoice | null {
	const filtered = filterVoicesByLang(voices, langCode);
	if (filtered.length === 0) return null;

	// Prefer default voices, then local voices
	const defaultVoice = filtered.find((v) => v.default);
	if (defaultVoice) return defaultVoice;

	const localVoice = filtered.find((v) => v.localService);
	if (localVoice) return localVoice;

	return filtered[0];
}
