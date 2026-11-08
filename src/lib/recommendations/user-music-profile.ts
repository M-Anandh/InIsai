import { Track, UserProfile } from "@/types";

export interface UserMusicAffinity {
  preferredLanguages: Record<string, number>;
  preferredArtists: Record<string, number>;
  preferredGenres: Record<string, number>;
  totalPlays: number;
}

export function buildUserMusicProfile(
  user: UserProfile | null,
  history: Track[],
  likedTracks: Track[]
): UserMusicAffinity {
  const preferredLanguages: Record<string, number> = {};
  const preferredArtists: Record<string, number> = {};
  const preferredGenres: Record<string, number> = {};

  // Baseline user language preference
  const baseLang = user?.preferredLanguage || "Tamil";
  preferredLanguages[baseLang.toLowerCase()] = 10;

  // Process liked tracks (high affinity multiplier: +5 per like)
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
  const historyLimit = Math.min(history.length, 30);
  for (let i = 0; i < historyLimit; i++) {
    const track = history[i];
    // Weight decaying from +3 for most recent to +1
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
    totalPlays: history.length,
  };
}

