import { LyricsLine } from "@/types";

/**
 * Parses LRC formatted string into an array of time-synchronized lyrics lines.
 * Supported format: [mm:ss.xx] or [mm:ss.xxx] text
 */
export function parseLrc(lrcText: string): LyricsLine[] {
  if (!lrcText) return [];

  const lines = lrcText.split("\n");
  const parsedLines: LyricsLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata tags like [ti:Title], [ar:Artist], etc.
    if (/^\[(ti|ar|al|by|offset|length):/i.test(trimmed)) {
      continue;
    }

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length > 0) {
      // Extract text after the last timestamp
      const text = trimmed.replace(timeRegex, "").trim();

      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const millis = match[3]
          ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10)
          : 0;
        const totalSeconds = minutes * 60 + seconds + millis / 1000;

        parsedLines.push({
          time: totalSeconds,
          text: text || "♫",
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
