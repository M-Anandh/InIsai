import { Track } from "@/types";
import { UserMusicAffinity } from "./user-music-profile";
import { normalizeArtistName } from "@/lib/music-matching";
import { CURATED_TRACKS } from "@/music/curated-data";
import { isTrackBlocked } from "@/config/blocklist";

export function scoreTrack(
  track: Track,
  affinity: UserMusicAffinity,
  recentTrackIds: Set<string>
): number {
  if (isTrackBlocked(track)) return -999;
  const hasPlayableMedia = Boolean(track.streamUrl || track.youtubeVideoId);
  if (!track.isPlayable || !hasPlayableMedia) return -100;

  let score = 20;

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

  // Skip penalty
  if (affinity.skippedTrackIds?.has(track.id)) {
    score -= 40;
  }

  // Repetition penalty
  if (recentTrackIds.has(track.id)) {
    score -= 30;
  }

  return score;
}

const SPAM_TRACK_REGEX = /(in-?isai artist|trending version|re-?upload|karaoke rip|tribute version)/i;

export function selectDynamicFeaturedTrack(
  candidates: Track[],
  affinity: UserMusicAffinity,
  history: Track[] = []
): Track | null {
  if (!candidates || candidates.length === 0) return null;
  const recentIds = new Set(history.slice(0, 3).map((t) => t.id));
  const validCandidates = candidates.filter(
    (t) => !isTrackBlocked(t) && !SPAM_TRACK_REGEX.test(t.title) && !SPAM_TRACK_REGEX.test(t.artist)
  );
  const pool = validCandidates;
  const scored = pool
    .map((track) => ({ track, score: scoreTrack(track, affinity, recentIds) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.track || candidates[0];
}

export function rankPersonalizedRecommendations(
  candidates: Track[],
  affinity: UserMusicAffinity,
  history: Track[] = [],
  limit: number = 10
): Track[] {
  if (!candidates || candidates.length === 0) return [];
  const recentIds = new Set(history.slice(0, 6).map((t) => t.id));
  const validCandidates = candidates.filter(
    (t) => !isTrackBlocked(t) && !SPAM_TRACK_REGEX.test(t.title) && !SPAM_TRACK_REGEX.test(t.artist)
  );
  const pool = validCandidates;

  const scored = pool
    .map((track) => ({ track, score: scoreTrack(track, affinity, recentIds) }))
    .sort((a, b) => b.score - a.score);

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

export interface GeneratedDailyMix {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  artworkUrl?: string;
  collageArtworks?: string[];
  tracks: Track[];
}

export function buildDailyMixes(
  candidates: Track[],
  affinity: UserMusicAffinity,
  history: Track[]
): GeneratedDailyMix[] {
  // Use candidate pool + curated fallback so mixes can always reach 25+ tracks deterministically
  const fullPool = [...candidates];
  const seenIds = new Set(fullPool.map((t) => t.id));
  for (const t of CURATED_TRACKS) {
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id);
      fullPool.push(t);
    }
  }

  const ranked = rankPersonalizedRecommendations(fullPool, affinity, history, 100);
  if (ranked.length < 5) return [];

  const topArtists = Object.entries(affinity.preferredArtists)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => normalizeArtistName(name));

  const timeTitle =
    affinity.timeBucket === "late_night"
      ? "Late-Night Velvet Mix"
      : affinity.timeBucket === "morning"
      ? "Morning Breeze Mix"
      : "Afternoon Focus Mix";

  const mixDefs = [
    {
      id: "daily-mix-1",
      title: "Daily Mix 1",
      subtitle: topArtists[0]
        ? `Inspired by ${topArtists[0]} & Tamil favorites`
        : "Your core melodies & chart toppers",
      gradient: "from-[#FF8A3D]/80 via-[#FF3D77]/70 to-[#7A5CFF]/80",
      sliceStart: 0,
    },
    {
      id: "daily-mix-2",
      title: "Daily Mix 2",
      subtitle: topArtists[1]
        ? `More around ${topArtists[1]} & modern hits`
        : "Cross-genre discovery blend",
      gradient: "from-[#7A5CFF]/80 via-indigo-600/75 to-cyan-600/80",
      sliceStart: 5,
    },
    {
      id: "daily-mix-3",
      title: timeTitle,
      subtitle: "Tuned for this time of day",
      gradient: "from-emerald-600/80 via-teal-600/75 to-indigo-800/85",
      sliceStart: 10,
    },
  ];

  return mixDefs.map((m) => {
    // Deterministic selection of 25 tracks
    const selected: Track[] = [];
    const usedIds = new Set<string>();

    // 1. Take starting from offset
    for (let i = m.sliceStart; i < ranked.length; i++) {
      const t = ranked[i];
      if (!usedIds.has(t.id)) {
        usedIds.add(t.id);
        selected.push(t);
        if (selected.length >= 25) break;
      }
    }

    // 2. If under 25, wrap around from beginning of ranked pool
    if (selected.length < 25) {
      for (const t of ranked) {
        if (!usedIds.has(t.id)) {
          usedIds.add(t.id);
          selected.push(t);
          if (selected.length >= 25) break;
        }
      }
    }

    // 3. Fallback to curated tracks if still under 25
    if (selected.length < 25) {
      for (const t of CURATED_TRACKS) {
        if (!usedIds.has(t.id)) {
          usedIds.add(t.id);
          selected.push(t);
          if (selected.length >= 25) break;
        }
      }
    }

    const collageArtworks = selected
      .slice(0, 4)
      .map((t) => t.artworkUrl)
      .filter(Boolean);

    return {
      id: m.id,
      title: m.title,
      subtitle: m.subtitle,
      gradient: m.gradient,
      artworkUrl: collageArtworks[0] || "",
      collageArtworks,
      tracks: selected,
    };
  });
}
