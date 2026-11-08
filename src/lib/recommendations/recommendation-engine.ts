import { Track } from "@/types";
import { UserMusicAffinity } from "./user-music-profile";

export function scoreTrack(
  track: Track,
  affinity: UserMusicAffinity,
  recentTrackIds: Set<string>
): number {
  if (!track.isPlayable || !track.streamUrl) return -100;

  let score = 20; // Base score for valid playable track

  // High resolution artwork bonus
  if (track.artworkUrl && !track.artworkUrl.includes("placeholder")) {
    score += 10;
  }

  // Language affinity score
  if (track.language) {
    const langKey = track.language.toLowerCase();
    const langScore = affinity.preferredLanguages[langKey] || 0;
    score += langScore * 3;
  }

  // Artist affinity score
  if (track.artist) {
    const artistKey = track.artist.toLowerCase();
    for (const [knownArtist, artistScore] of Object.entries(affinity.preferredArtists)) {
      if (artistKey.includes(knownArtist) || knownArtist.includes(artistKey)) {
        score += artistScore * 4;
      }
    }
  }

  // Genre affinity score
  if (track.genre) {
    const genreKey = track.genre.toLowerCase();
    const genreScore = affinity.preferredGenres[genreKey] || 0;
    score += genreScore * 2;
  }

  // Repetition penalty: if played recently, penalize to promote discovery
  if (recentTrackIds.has(track.id)) {
    score -= 30;
  }

  return score;
}

export function selectDynamicFeaturedTrack(
  candidates: Track[],
  affinity: UserMusicAffinity,
  history: Track[] = []
): Track | null {
  if (!candidates || candidates.length === 0) return null;

  const recentIds = new Set(history.slice(0, 3).map((t) => t.id));

  const scored = candidates.map((track) => ({
    track,
    score: scoreTrack(track, affinity, recentIds),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.track || candidates[0];
}

export function rankPersonalizedRecommendations(
  candidates: Track[],
  affinity: UserMusicAffinity,
  history: Track[] = [],
  limit: number = 8
): Track[] {
  if (!candidates || candidates.length === 0) return [];

  const recentIds = new Set(history.slice(0, 5).map((t) => t.id));

  const scored = candidates.map((track) => ({
    track,
    score: scoreTrack(track, affinity, recentIds),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Filter duplicates
  const seenIds = new Set<string>();
  const results: Track[] = [];

  for (const item of scored) {
    if (!seenIds.has(item.track.id)) {
      seenIds.add(item.track.id);
      results.push(item.track);
      if (results.length >= limit) break;
    }
  }

  return results;
}

