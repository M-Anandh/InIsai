export const BLOCKED_TITLES: string[] = [
  "vande mataram",
  "vande maataram",
  "vandemataram",
  "maa tujhe salaam",
  "vande mataram (maa tujhe salaam)",
  "vande mataram (trending version)",
  "vande mataram cover",
];

export const SPAM_ARTIST_PATTERNS: RegExp[] = [
  /in-?isai artist/i,
  /unknown artist/i,
  /popular artist/i,
];

export const SPAM_TITLE_PATTERNS: RegExp[] = [
  /\btrending version\b/i,
  /\bkaraoke rip\b/i,
  /\btribute version\b/i,
  /\bre-?upload\b/i,
  /\bcover version 202\b/i,
];

function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks whether a track or song title matches any blocked song on curated/recommended surfaces.
 */
export function isTitleBlocked(title?: string): boolean {
  if (!title) return false;
  const normalized = normalizeText(title);
  return BLOCKED_TITLES.some((blocked) => {
    const normBlocked = normalizeText(blocked);
    return normalized === normBlocked || normalized.includes(normBlocked);
  });
}

/**
 * Comprehensive check for curated & recommended surfaces.
 * Filters out blocked titles, spam artists (e.g. "InIsai Artist"), and spam title versions.
 */
export function isTrackBlocked(track: { title?: string; artist?: string }): boolean {
  if (!track) return false;
  if (isTitleBlocked(track.title)) return true;

  if (track.artist && SPAM_ARTIST_PATTERNS.some((rx) => rx.test(track.artist!))) {
    return true;
  }

  if (track.title && SPAM_TITLE_PATTERNS.some((rx) => rx.test(track.title!))) {
    return true;
  }

  return false;
}

