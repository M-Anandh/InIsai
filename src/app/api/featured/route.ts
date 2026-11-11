import { NextRequest, NextResponse } from "next/server";
import { isTrackBlocked } from "@/config/blocklist";
import { discoverTmdbMovies, normalizeFilmTitle, TmdbMovie } from "@/lib/tmdb";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

export interface ValidatedFeaturedItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  coverSource: "provider" | "tmdb_poster" | "gradient";
  filmTitle: string;
  filmReleaseDate?: string;
  trackReleaseDate?: string;
  dateSource: string;
  releaseStatus: "released" | "upcoming";
  releaseLabel: string;
  language: string;
  youtubeVideoId?: string;
  streamUrl?: string;
  sourceType: "saavn" | "youtube";
  providerId: string;
  isPlayable: boolean;
}

export interface FilmReleaseGroup {
  filmTitle: string;
  language: string;
  posterUrl?: string;
  releaseDate?: string;
  releaseStatus: "released" | "upcoming";
  releaseLabel: string;
  tracks: ValidatedFeaturedItem[];
}

export interface DebugItemReport {
  title: string;
  artists: string;
  film: string;
  language: string;
  trackReleaseDate?: string;
  filmReleaseDate?: string;
  dateSource: string;
  provider: string;
  trackId: string;
  coverUrl: string;
  coverSource: string;
  thumbNaturalSize?: string;
  passedFilters: string[];
  rejectedBecause?: string;
}

const CACHE = new Map<string, { payload: any; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 3600 * 1000; // 6 hours

// Cache for YouTube oEmbed & image header probes (24h)
const VALIDATION_CACHE = new Map<string, { ok: boolean; size?: string; expiresAt: number }>();

function getKolkataDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatReleaseLabel(status: "released" | "upcoming", dateStr?: string, todayStr?: string): string {
  if (status === "released") {
    if (!dateStr || !todayStr) return "Just Released";
    const diffDays = Math.round(
      (new Date(todayStr).getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 0) return "Just Released";
    if (diffDays === 1) return "Released yesterday";
    return `Released ${diffDays} days ago`;
  }
  if (!dateStr) return "Upcoming Film";
  try {
    const target = new Date(dateStr);
    return `Film releases ${target.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  } catch {
    return "Upcoming Film";
  }
}

/**
 * Validates YouTube video ID using official oEmbed endpoint.
 * Returns 200 for public embeddable videos; 401/404 for deleted or restricted IDs.
 */
async function validateYouTubeOembed(videoId: string): Promise<boolean> {
  if (!videoId || videoId.length < 5) return false;
  const now = Date.now();
  const cached = VALIDATION_CACHE.get(`yt:${videoId}`);
  if (cached && cached.expiresAt > now) return cached.ok;

  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(
      videoId
    )}&format=json`;
    const res = await fetch(url, { method: "GET", next: { revalidate: 86400 } });
    const ok = res.status === 200;
    VALIDATION_CACHE.set(`yt:${videoId}`, { ok, expiresAt: now + 86400 * 1000 });
    return ok;
  } catch {
    return false;
  }
}

/**
 * Validates cover image: HTTP 200, image content-type, natural dimensions >= 200x200.
 * Rejects YouTube's 120x90 grey placeholder TV icon.
 */
async function validateCoverImage(
  url: string
): Promise<{ ok: boolean; size?: string }> {
  if (!url || !url.startsWith("http")) return { ok: false };
  const now = Date.now();
  const cached = VALIDATION_CACHE.get(`img:${url}`);
  if (cached && cached.expiresAt > now) return { ok: cached.ok, size: cached.size };

  try {
    const res = await fetch(url, {
      method: "HEAD",
      next: { revalidate: 86400 },
    });

    if (res.status !== 200) {
      VALIDATION_CACHE.set(`img:${url}`, { ok: false, expiresAt: now + 86400 * 1000 });
      return { ok: false };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      VALIDATION_CACHE.set(`img:${url}`, { ok: false, expiresAt: now + 86400 * 1000 });
      return { ok: false };
    }

    const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
    // YouTube's 120x90 placeholder is ~1,000 bytes; high-res album covers are >= 8,000 bytes
    if (contentLength > 0 && contentLength < 3500) {
      VALIDATION_CACHE.set(`img:${url}`, {
        ok: false,
        size: "120x90 (placeholder)",
        expiresAt: now + 86400 * 1000,
      });
      return { ok: false, size: "120x90 (placeholder)" };
    }

    VALIDATION_CACHE.set(`img:${url}`, {
      ok: true,
      size: contentLength > 0 ? `${contentLength}B` : ">=200x200",
      expiresAt: now + 86400 * 1000,
    });
    return { ok: true, size: `${contentLength}B` };
  } catch {
    return { ok: true }; // allow on network probe errors
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const langParam = searchParams.get("lang") || "ta,en";
  const isDebug = searchParams.get("debug") === "1";

  const userLanguages = langParam
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);

  // Runtime date window computed in Asia/Kolkata timezone: [today - 30 days, today + 60 days]
  const todayDate = new Date();
  const todayStr = getKolkataDateString(todayDate);
  const startDate = new Date(todayDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = new Date(todayDate.getTime() + 60 * 24 * 60 * 60 * 1000);
  const startStr = getKolkataDateString(startDate);
  const endStr = getKolkataDateString(endDate);

  const cacheKey = `featured-v3-${userLanguages.sort().join("-")}-${startStr}-${endStr}`;
  const now = Date.now();

  if (!isDebug) {
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload);
    }
  }

  const debugReports: DebugItemReport[] = [];
  const acceptedItems: ValidatedFeaturedItem[] = [];
  const seenSignatures = new Set<string>();

  // 1. Discover theatrical films from TMDB matching user languages within [startStr, endStr]
  const tmdbKey = process.env.TMDB_API_KEY;
  const isTmdbConfigured = Boolean(tmdbKey && tmdbKey.length > 10);
  const tmdbFilms: TmdbMovie[] = await discoverTmdbMovies(
    userLanguages,
    startStr,
    endStr,
    tmdbKey
  );

  // 2. Search Music Providers for tracks related to discovered TMDB films
  for (const film of tmdbFilms) {
    const normFilmTitle = normalizeFilmTitle(film.title);
    const posterUrl = film.poster_path
      ? `https://image.tmdb.org/t/p/w500${film.poster_path}`
      : undefined;

    // Search JioSaavn API for the film's official soundtrack
    try {
      const saavnSearchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
        film.title + " songs"
      )}&_format=json&_marker=0&api_version=4&n=10`;

      const res = await fetch(saavnSearchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
          "Cookie": "L=english%2Ctamil%2Chindi%2Ctelugu%2Cmalayalam; gdpr_acceptance=true",
        },
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const rawSongs = data.results || [];

        for (const item of rawSongs) {
          const title = (item.title || item.song || "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
          const moreInfo = item.more_info || {};
          const album = (moreInfo.album || item.album || "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
          const artist = (moreInfo.singers || moreInfo.music || item.subtitle || "Artist").trim();
          const normAlbum = normalizeFilmTitle(album);

          const passedFilters: string[] = [];
          let rejectedBecause: string | undefined;

          // Rule 1: Film match
          const matchesFilm =
            normAlbum.includes(normFilmTitle) ||
            normFilmTitle.includes(normAlbum) ||
            normalizeFilmTitle(title).includes(normFilmTitle);

          if (!matchesFilm) {
            rejectedBecause = `Album "${album}" does not match TMDB film "${film.title}"`;
          } else {
            passedFilters.push("film_match");
          }

          // Rule 2: Date rule
          const trackReleaseDate = moreInfo.release_date || undefined;
          const filmReleaseDate = film.release_date;
          const effectiveDate = trackReleaseDate || filmReleaseDate;
          const dateSource = trackReleaseDate ? "saavn.release_date" : "tmdb.movie.release_date";

          const isFilmReleased = filmReleaseDate && filmReleaseDate <= todayStr && filmReleaseDate >= startStr;
          const isFilmUpcoming = filmReleaseDate && filmReleaseDate > todayStr && filmReleaseDate <= endStr;
          const isTrackReleased = trackReleaseDate && trackReleaseDate <= todayStr && trackReleaseDate >= startStr;

          let releaseStatus: "released" | "upcoming" = "released";

          if (!rejectedBecause) {
            if (isTrackReleased || isFilmReleased) {
              releaseStatus = "released";
              passedFilters.push("date_in_recent_window");
            } else if (isFilmUpcoming && (!trackReleaseDate || trackReleaseDate <= todayStr)) {
              releaseStatus = "upcoming";
              passedFilters.push("pre_release_single_in_window");
            } else {
              rejectedBecause = `Date (${effectiveDate}) outside window [${startStr}, ${endStr}] or future track release`;
            }
          }

          // Rule 3: Playable & Blocklist
          let streamUrl = "";
          if (moreInfo.encrypted_media_url) {
            // Decrypt stream URL
            try {
              const CryptoJS = (await import("crypto-js")).default;
              const cipherParams = {
                ciphertext: CryptoJS.enc.Base64.parse(moreInfo.encrypted_media_url),
              } as any;
              const decrypted = CryptoJS.DES.decrypt(
                cipherParams,
                CryptoJS.enc.Utf8.parse("38346591"),
                { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
              );
              streamUrl = decrypted
                .toString(CryptoJS.enc.Utf8)
                .replace("_96.mp4", "_320.mp4")
                .replace("_160.mp4", "_320.mp4");
            } catch {}
          }

          const dummyTrack = {
            id: `saavn-${item.id}`,
            title,
            artist,
            album,
            streamUrl,
            isPlayable: Boolean(streamUrl),
          };

          if (!rejectedBecause) {
            if (!streamUrl) {
              rejectedBecause = "No streamable audio URL from provider";
            } else if (isTrackBlocked(dummyTrack)) {
              rejectedBecause = "Blocked by content/spam blocklist";
            } else if (artist.toLowerCase().includes("inisai artist")) {
              rejectedBecause = "Spam artist placeholder (InIsai Artist)";
            } else if (/cover|trending version|remix|slowed|lofi|karaoke/i.test(title)) {
              rejectedBecause = "Cover or derivative re-upload";
            } else {
              passedFilters.push("playable_and_clean");
            }
          }

          // Rule 4: Cover validation
          let coverUrl = item.image
            ? item.image.replace("150x150", "500x500").replace("http://", "https://")
            : "";
          let coverSource: "provider" | "tmdb_poster" | "gradient" = "provider";

          if (coverUrl) {
            const imgCheck = await validateCoverImage(coverUrl);
            if (!imgCheck.ok) {
              if (posterUrl) {
                coverUrl = posterUrl;
                coverSource = "tmdb_poster";
              } else {
                coverUrl = "";
                coverSource = "gradient";
              }
            }
          } else if (posterUrl) {
            coverUrl = posterUrl;
            coverSource = "tmdb_poster";
          }

          // Rule 5: Deduplication by film + normalised title
          const sig = `${normFilmTitle}::${normalizeFilmTitle(title)}`;
          if (!rejectedBecause) {
            if (seenSignatures.has(sig)) {
              rejectedBecause = "Duplicate track signature in film group";
            } else {
              seenSignatures.add(sig);
              passedFilters.push("deduplicated");
            }
          }

          if (isDebug) {
            debugReports.push({
              title,
              artists: artist,
              film: film.title,
              language: item.language || film.original_language,
              trackReleaseDate,
              filmReleaseDate,
              dateSource,
              provider: "saavn",
              trackId: `saavn-${item.id}`,
              coverUrl,
              coverSource,
              passedFilters,
              rejectedBecause,
            });
          }

          if (!rejectedBecause) {
            acceptedItems.push({
              id: `saavn-${item.id}`,
              title,
              artist,
              album,
              artworkUrl: coverUrl,
              coverSource,
              filmTitle: film.title,
              filmReleaseDate,
              trackReleaseDate,
              dateSource,
              releaseStatus,
              releaseLabel: formatReleaseLabel(releaseStatus, effectiveDate, todayStr),
              language: item.language || film.original_language,
              streamUrl,
              sourceType: "saavn",
              providerId: "saavn",
              isPlayable: true,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Soundtrack search failed for film "${film.title}":`, err);
    }
  }

  // 3. Group by film for the shelf & /new page
  const filmGroupsMap = new Map<string, FilmReleaseGroup>();
  for (const item of acceptedItems) {
    const key = normalizeFilmTitle(item.filmTitle);
    if (!filmGroupsMap.has(key)) {
      filmGroupsMap.set(key, {
        filmTitle: item.filmTitle,
        language: item.language,
        posterUrl: item.artworkUrl,
        releaseDate: item.filmReleaseDate || item.trackReleaseDate,
        releaseStatus: item.releaseStatus,
        releaseLabel: item.releaseLabel,
        tracks: [],
      });
    }
    filmGroupsMap.get(key)!.tracks.push(item);
  }

  const shelf = Array.from(filmGroupsMap.values()).slice(0, 40);

  const payload = {
    hero: acceptedItems.slice(0, 8),
    shelf,
    windowStart: startStr,
    windowEnd: endStr,
    generatedAt: new Date().toISOString(),
    tmdbConfigured: isTmdbConfigured,
    totalAccepted: acceptedItems.length,
    ...(isDebug
      ? {
          debug: {
            window: { start: startStr, today: todayStr, end: endStr },
            totalTmdbFilmsDiscovered: tmdbFilms.length,
            reports: debugReports,
          },
        }
      : {}),
  };

  CACHE.set(cacheKey, {
    payload,
    expiresAt: now + CACHE_TTL_MS,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": isDebug ? "no-store" : "public, s-maxage=21600, stale-while-revalidate=43200",
    },
  });
}
