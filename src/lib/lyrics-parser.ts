import { LyricsLine, LyricsWord } from "@/types";

/**
 * Parses LRC formatted string into time-synchronized lines, supporting
 * optional enhanced word tags (<mm:ss.xx>word) and smooth fallback interpolation.
 */
export function parseLrc(lrcText: string): LyricsLine[] {
  if (!lrcText) return [];

  const lines = lrcText.split("\n");
  const parsedLines: LyricsLine[] = [];
  const lineTimeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  const wordTimeRegex = /<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>([^<]*)/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata tags like [ti:Title], [ar:Artist], etc.
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) {
      continue;
    }

    const matches = [...trimmed.matchAll(lineTimeRegex)];
    if (matches.length > 0) {
      const contentAfterLineTags = trimmed.replace(lineTimeRegex, "").trim();

      // Check for enhanced LRC word-level tags (<mm:ss.xx>...)
      const wordMatches = [...contentAfterLineTags.matchAll(wordTimeRegex)];
      let explicitWords: LyricsWord[] | undefined;

      if (wordMatches.length > 0) {
        explicitWords = wordMatches.map((wm) => {
          const min = parseInt(wm[1], 10);
          const sec = parseInt(wm[2], 10);
          const ms = wm[3] ? parseInt(wm[3].padEnd(3, "0").slice(0, 3), 10) : 0;
          return {
            time: min * 60 + sec + ms / 1000,
            text: wm[4].trim(),
          };
        }).filter((w) => w.text.length > 0);
      }

      const plainText = contentAfterLineTags.replace(/<\d{2}:\d{2}(?:\.\d{2,3})?>/g, "").trim();

      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const millis = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0;
        const totalSeconds = minutes * 60 + seconds + millis / 1000;

        parsedLines.push({
          time: totalSeconds,
          text: plainText || "♫",
          words: explicitWords && explicitWords.length > 0 ? explicitWords : undefined,
        });
      }
    }
  }

  return parsedLines.sort((a, b) => a.time - b.time);
}

/**
 * Finds the index of the active lyrics line based on current playback time in seconds.
 */
export function getActiveLyricsIndex(
  lyrics: LyricsLine[],
  currentTime: number,
  offsetSeconds: number = 0
): number {
  if (!lyrics || lyrics.length === 0) return -1;
  const targetTime = currentTime + offsetSeconds;

  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= targetTime) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return activeIndex;
}

/**
 * Detects whether text contains Tamil Unicode script characters.
 */
export function hasTamilScript(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Lightweight phonetic ISO-15919 inspired Tamil script transliterator for learners & quick sing-along.
 */
export function transliterateTamil(text: string): string {
  if (!hasTamilScript(text)) return text;

  const vowels: Record<string, string> = {
    "அ": "a", "ஆ": "aa", "இ": "i", "ஈ": "ee", "உ": "u", "ஊ": "oo",
    "எ": "e", "ஏ": "ae", "ஐ": "ai", "ஒ": "o", "ஓ": "oo", "ஔ": "au", "ஃ": "k",
  };
  const consonants: Record<string, string> = {
    "க": "k", "ங": "ng", "ச": "ch", "ஞ": "nj", "ட": "t", "ண": "n",
    "த": "th", "ந": "nh", "ப": "p", "ம": "m", "ய": "y", "ர": "r",
    "ல": "l", "வ": "v", "ழ": "zh", "ள": "l", "ற": "rr", "ன": "n",
    "ஜ": "j", "ஷ": "sh", "ஸ": "s", "ஹ": "h",
  };
  const vowelSigns: Record<string, string> = {
    "ா": "aa", "ி": "i", "ீ": "ee", "ு": "u", "ூ": "oo",
    "ெ": "e", "ே": "ae", "ை": "ai", "ொ": "o", "ோ": "oo", "ௌ": "au", "்": "",
  };

  let out = "";
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (vowels[ch]) {
      out += vowels[ch];
    } else if (consonants[ch]) {
      const next = chars[i + 1];
      if (next && vowelSigns[next] !== undefined) {
        out += consonants[ch] + vowelSigns[next];
        i++;
      } else {
        out += consonants[ch] + "a";
      }
    } else if (vowelSigns[ch] !== undefined) {
      out += vowelSigns[ch];
    } else {
      out += ch;
    }
  }
  return out;
}
