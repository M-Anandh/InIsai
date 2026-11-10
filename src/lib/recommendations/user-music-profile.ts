import { Track, UserProfile } from "@/types";
import { ComputedTasteSummary } from "@/lib/personalization/signal-tracker";

export interface UserMusicAffinity {
  preferredLanguages: Record<string, number>;
  preferredArtists: Record<string, number>;
  preferredGenres: Record<string, number>;
  skippedTrackIds: Set<string>;
  timeBucket: "morning" | "afternoon" | "evening" | "late_night";
  totalPlays: number;
}

export function buildUserMusicProfile(
  user: UserProfile | null,
  history: Track[],
  likedTracks: Track[],
  signalSummary?: ComputedTasteSummary | null
): UserMusicAffinity {
  const preferredLanguages: Record<string, number> = {};
  const preferredArtists: Record<string, number> = {};
  const preferredGenres: Record<string, number> = {};

  // Baseline user language preference
  const baseLang = user?.preferredLanguage || "Tamil";
  preferredLanguages[baseLang.toLowerCase()] = 10;

  // Integrate IndexedDB time-decayed taste signals if present
  if (signalSummary) {
    for (const a of signalSummary.topArtists) {
      const k = a.name.toLowerCase();
      preferredArtists[k] = (preferredArtists[k] || 0) + a.score;
    }
    for (const l of signalSummary.topLanguages) {
      const k = l.name.toLowerCase();
      preferredLanguages[k] = (preferredLanguages[k] || 0) + l.score;
    }
    for (const g of signalSummary.topGenres) {
      const k = g.name.toLowerCase();
      preferredGenres[k] = (preferredGenres[k] || 0) + g.score;
    }
  }

  // Process liked tracks
  for (const track of likedTracks) {
    if (track.language) {
      const l = track.language.toLowerCase();
      preferredLanguages[l] = (preferredLanguages[l] || 0) + 5;
    }
    if (track.artist) {
      const a = track.artist.toLowerCase();
      preferredArtists[a] = (preferredArtists[a] || 0) + 5;
    }
    if (track.genre) {
      const g = track.genre.toLowerCase();
      preferredGenres[g] = (preferredGenres[g] || 0) + 4;
    }
  }

  // Process listening history (recency weighting)
  const historyLimit = Math.min(history.length, 40);
  for (let i = 0; i < historyLimit; i++) {
    const track = history[i];
    const weight = Math.max(1, 3 - Math.floor(i / 10));

    if (track.language) {
      const l = track.language.toLowerCase();
      preferredLanguages[l] = (preferredLanguages[l] || 0) + weight;
    }
    if (track.artist) {
      const a = track.artist.toLowerCase();
      preferredArtists[a] = (preferredArtists[a] || 0) + weight;
    }
    if (track.genre) {
      const g = track.genre.toLowerCase();
      preferredGenres[g] = (preferredGenres[g] || 0) + weight;
    }
  }

  return {
    preferredLanguages,
    preferredArtists,
    preferredGenres,
    skippedTrackIds: signalSummary?.skippedTrackIds || new Set(),
    timeBucket: signalSummary?.timeBucket || "evening",
    totalPlays: history.length + (signalSummary?.signalCount || 0),
  };
}
