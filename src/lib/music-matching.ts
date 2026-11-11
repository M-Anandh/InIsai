/**
 * Music matching, normalization, and duration utilities
 * Ensures cross-provider equivalence, artist clean-up, and formatted duration.
 */
import { Track } from "@/types";

const ARTIST_NAME_MAP: Record<string, string> = {
  imaginedragons: "Imagine Dragons",
  "imagine dragons": "Imagine Dragons",
  anirudhravichander: "Anirudh Ravichander",
  "anirudh ravichander": "Anirudh Ravichander",
  arrahman: "A. R. Rahman",
  "a r rahman": "A. R. Rahman",
  "a.r. rahman": "A. R. Rahman",
  ilaiyaraaja: "Ilaiyaraaja",
  ilayaraja: "Ilaiyaraaja",
  spbalasubrahmanyam: "S. P. Balasubrahmanyam",
  "s. p. balasubrahmanyam": "S. P. Balasubrahmanyam",
  "s.p.balasubrahmanyam": "S. P. Balasubrahmanyam",
  yuvanshankarraja: "Yuvan Shankar Raja",
  "yuvan shankar raja": "Yuvan Shankar Raja",
  harrisjayaraj: "Harris Jayaraj",
  "harris jayaraj": "Harris Jayaraj",
  sid_sriram: "Sid Sriram",
  sidsriram: "Sid Sriram",
  "sid sriram": "Sid Sriram",
  anirudh: "Anirudh Ravichander",
  rahman: "A. R. Rahman",
  alanwalker: "Alan Walker",
  "alan walker": "Alan Walker",
};

/**
 * Normalizes artist name, fixing concatenated or unspaced tags (e.g., "imaginedragons" -> "Imagine Dragons")
 */
export function normalizeArtistName(name?: string): string {
  if (!name) return "Unknown Artist";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  if (ARTIST_NAME_MAP[lower]) {
    return ARTIST_NAME_MAP[lower];
  }
  // Remove trailing " - Topic", " VEVO", etc.
  const cleaned = trimmed
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/\s+VEVO$/i, "")
    .replace(/\s+Official$/i, "");
  return cleaned || "Unknown Artist";
}

/**
 * Normalizes title for comparison: strips featured artists, punctuation, brackets, remaster tags
 */
export function normalizeSongTitle(title?: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/\(from\s+[^)]+\)/gi, "")
    .replace(/\[from\s+[^\]]+\]/gi, "")
    .replace(/\(feat\.[^)]+\)/gi, "")
    .replace(/\[feat\.[^\]]+\]/gi, "")
    .replace(/\(official[^)]*\)/gi, "")
    .replace(/\[official[^\]]*\]/gi, "")
    .replace(/\(audio[^)]*\)/gi, "")
    .replace(/\[audio[^\]]*\]/gi, "")
    .replace(/\(video[^)]*\)/gi, "")
    .replace(/\(lyrics[^)]*\)/gi, "")
    .replace(/\(trending\s+version\)/gi, "")
    .replace(/\(remastered[^)]*\)/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Extracts primary artist identifier
 */
export function getPrimaryArtist(artist?: string): string {
  if (!artist) return "";
  const first = artist.split(/[,&/•|]/)[0] || artist;
  return normalizeArtistName(first).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Checks if two tracks are equivalent:
 * 1. Exact track ID match
 * 2. Or same normalized title + primary artist + duration within ±3 seconds
 */
export function areTracksEquivalent(a: Track, b: Track): boolean {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  if (a.sourceId && b.sourceId && a.sourceId === b.sourceId) return true;
  if (a.youtubeVideoId && b.youtubeVideoId && a.youtubeVideoId === b.youtubeVideoId) return true;

  const titleA = normalizeSongTitle(a.title);
  const titleB = normalizeSongTitle(b.title);
  if (!titleA || !titleB || titleA !== titleB) return false;

  const artistA = getPrimaryArtist(a.artist);
  const artistB = getPrimaryArtist(b.artist);
  if (artistA && artistB && artistA !== artistB) {
    // If one contains the other, allow match
    if (!artistA.includes(artistB) && !artistB.includes(artistA)) {
      return false;
    }
  }

  // Duration match within ±3 seconds (if both durations are valid)
  if (a.duration > 0 && b.duration > 0) {
    if (Math.abs(a.duration - b.duration) > 3) {
      return false;
    }
  }

  return true;
}

/**
 * Formats seconds into "X hr Y min" or "X min Y sec"
 */
export function formatTotalDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 min";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs} hr ${mins > 0 ? `${mins} min` : ""}`.trim();
  }
  if (mins > 0) {
    return `${mins} min ${secs > 0 && mins < 10 ? `${secs} sec` : ""}`.trim();
  }
  return `${secs} sec`;
}

