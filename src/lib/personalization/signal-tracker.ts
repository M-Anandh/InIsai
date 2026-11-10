import { get, set, del } from "idb-keyval";
import { Track } from "@/types";

export type ListeningSignalType = "play" | "completion" | "skip" | "like" | "repeat" | "search";

export interface ListeningSignal {
  id: string;
  type: ListeningSignalType;
  timestamp: number; // ms epoch
  hourOfDay: number; // 0-23
  trackId?: string;
  youtubeVideoId?: string;
  title?: string;
  artist?: string;
  language?: string;
  genre?: string;
  query?: string;
}

const SIGNALS_KEY = "inisai_taste_signals_v1";
const MAX_SIGNALS = 1500;
const HALF_LIFE_DAYS = 30;

export async function getAllSignals(): Promise<ListeningSignal[]> {
  if (typeof window === "undefined") return [];
  try {
    const list = await get<ListeningSignal[]>(SIGNALS_KEY);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function recordSignal(
  type: ListeningSignalType,
  track?: Track | null,
  query?: string
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const existing = await getAllSignals();
    const now = Date.now();
    const entry: ListeningSignal = {
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: now,
      hourOfDay: new Date(now).getHours(),
      trackId: track?.id,
      youtubeVideoId: track?.youtubeVideoId,
      title: track?.title,
      artist: track?.artist,
      language: track?.language,
      genre: track?.genre,
      query,
    };
    const updated = [entry, ...existing].slice(0, MAX_SIGNALS);
    await set(SIGNALS_KEY, updated);
  } catch (err) {
    console.warn("Signal tracking storage skipped:", err);
  }
}

export async function resetAllSignals(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await del(SIGNALS_KEY);
  } catch {}
}

export async function exportTasteProfileJson(): Promise<string> {
  const signals = await getAllSignals();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "InIsai (இனிசை)",
      signalCount: signals.length,
      signals,
    },
    null,
    2
  );
}

/**
 * Computes exponential time-decay multiplier (30-day half-life).
 */
export function computeDecayWeight(timestampMs: number, nowMs: number = Date.now()): number {
  const ageDays = Math.max(0, (nowMs - timestampMs) / (1000 * 60 * 60 * 24));
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export interface ComputedTasteSummary {
  topArtists: Array<{ name: string; score: number }>;
  topLanguages: Array<{ name: string; score: number }>;
  topGenres: Array<{ name: string; score: number }>;
  skippedTrackIds: Set<string>;
  seedVideoIds: string[];
  signalCount: number;
  timeBucket: "morning" | "afternoon" | "evening" | "late_night";
}

export function getTimeBucket(hour: number = new Date().getHours()): ComputedTasteSummary["timeBucket"] {
  if (hour >= 22 || hour < 5) return "late_night";
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

export function computeTasteSummary(
  signals: ListeningSignal[],
  nowMs: number = Date.now()
): ComputedTasteSummary {
  const artistScores: Record<string, number> = {};
  const langScores: Record<string, number> = {};
  const genreScores: Record<string, number> = {};
  const skippedTrackIds = new Set<string>();
  const seedVideoIds: string[] = [];

  const baseSignalValue: Record<ListeningSignalType, number> = {
    play: 2,
    completion: 5,
    like: 6,
    repeat: 4,
    skip: -3,
    search: 2.5,
  };

  for (const sig of signals) {
    const decay = computeDecayWeight(sig.timestamp, nowMs);
    const val = (baseSignalValue[sig.type] ?? 1) * decay;

    if (sig.type === "skip" && sig.trackId) {
      skippedTrackIds.add(sig.trackId);
    }

    if ((sig.type === "completion" || sig.type === "like" || sig.type === "play") && sig.youtubeVideoId) {
      if (!seedVideoIds.includes(sig.youtubeVideoId) && seedVideoIds.length < 8) {
        seedVideoIds.push(sig.youtubeVideoId);
      }
    }

    if (sig.artist) {
      for (const part of sig.artist.split(/[,&•]/)) {
        const clean = part.trim();
        if (clean.length > 1) {
          artistScores[clean] = (artistScores[clean] || 0) + val;
        }
      }
    }

    if (sig.language) {
      const lang = sig.language.trim();
      langScores[lang] = (langScores[lang] || 0) + val;
    }

    if (sig.genre) {
      const gen = sig.genre.trim();
      genreScores[gen] = (genreScores[gen] || 0) + val;
    }
  }

  const sortDesc = (map: Record<string, number>) =>
    Object.entries(map)
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, score]) => ({ name, score: Number(score.toFixed(2)) }));

  return {
    topArtists: sortDesc(artistScores).slice(0, 10),
    topLanguages: sortDesc(langScores).slice(0, 5),
    topGenres: sortDesc(genreScores).slice(0, 6),
    skippedTrackIds,
    seedVideoIds,
    signalCount: signals.length,
    timeBucket: getTimeBucket(new Date(nowMs).getHours()),
  };
}
