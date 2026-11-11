export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string; // YYYY-MM-DD
  original_language: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview?: string;
  popularity?: number;
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * Normalises a movie or album title for clean cross-catalog matching.
 * Strips noise like '(From ...)', '(Original Motion Picture Soundtrack)', punctuation, casing.
 */
export function normalizeFilmTitle(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "") // strip parenthesized details: (2025), (From...), (OST)
    .replace(/\s*\[[^\]]*\]/g, "") // strip brackets
    .replace(/[:\-–—]\s*(chapter|part|volume)\s*.*$/i, "") // strip Part 1, Chapter One
    .replace(/[:\-–—].*$/, "") // strip subtitles after colon / dash
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Discover films releasing within a strict date window [start, end] for specified languages.
 * Requires TMDB_API_KEY environment variable. Returns empty list if key is missing or fails.
 */
export async function discoverTmdbMovies(
  languages: string[],
  startDate: string,
  endDate: string,
  apiKey?: string
): Promise<TmdbMovie[]> {
  const key = apiKey || process.env.TMDB_API_KEY;
  if (!key || key.length < 10) {
    return [];
  }

  // Map app language names to ISO 639-1 language codes
  const langCodeMap: Record<string, string> = {
    tamil: "ta",
    ta: "ta",
    telugu: "te",
    te: "te",
    hindi: "hi",
    hi: "hi",
    malayalam: "ml",
    ml: "ml",
    kannada: "kn",
    kn: "kn",
    english: "en",
    en: "en",
  };

  const isoLangs = Array.from(
    new Set(languages.map((l) => langCodeMap[l.toLowerCase()] || l.toLowerCase()))
  );

  const movies: TmdbMovie[] = [];
  const seenIds = new Set<number>();

  for (const iso of isoLangs) {
    try {
      const url = `${TMDB_BASE_URL}/discover/movie?api_key=${encodeURIComponent(
        key
      )}&with_original_language=${encodeURIComponent(
        iso
      )}&primary_release_date.gte=${encodeURIComponent(
        startDate
      )}&primary_release_date.lte=${encodeURIComponent(
        endDate
      )}&sort_by=popularity.desc&page=1`;

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 21600 },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const results: TmdbMovie[] = data.results || [];

      for (const m of results) {
        if (!m.id || seenIds.has(m.id)) continue;
        if (!m.release_date || m.release_date < startDate || m.release_date > endDate) {
          continue;
        }
        seenIds.add(m.id);
        movies.push(m);
      }
    } catch (err) {
      console.warn(`TMDB discover failed for language ${iso}:`, err);
    }
  }

  return movies.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

/**
 * Search TMDB for a person (composer/singer/actor) to fetch official high-res profile photo.
 */
export async function getTmdbPersonPhoto(name: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || process.env.TMDB_API_KEY;
  if (!key || key.length < 10 || !name?.trim()) return null;

  try {
    const url = `${TMDB_BASE_URL}/search/person?api_key=${encodeURIComponent(
      key
    )}&query=${encodeURIComponent(name.trim())}&page=1`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 * 7 }, // cache 7 days
    });

    if (!res.ok) return null;
    const data = await res.json();
    const match = data.results?.[0];
    if (match?.profile_path) {
      return `https://image.tmdb.org/t/p/w500${match.profile_path}`;
    }
    return null;
  } catch {
    return null;
  }
}
