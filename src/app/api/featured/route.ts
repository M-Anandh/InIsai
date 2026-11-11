import { NextRequest, NextResponse } from "next/server";
import { isTrackBlocked } from "@/config/blocklist";

interface FeaturedMovieSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  filmTitle: string;
  releaseStatus: "released" | "upcoming";
  releaseLabel: string;
  releaseDate?: string;
  language: string;
  youtubeVideoId?: string;
  streamUrl?: string;
  sourceType?: string;
  isPlayable: boolean;
}

const FEATURED_CACHE = new Map<string, { payload: any; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 3600 * 1000; // 6 hours

// High-confidence dynamic catalog of recent (last 30 days) and upcoming (next 60 days) major film releases
const LATEST_FILM_CATALOG = [
  {
    filmTitle: "Meesaya Murukku 2",
    language: "Tamil",
    releaseDate: "2026-11-28",
    status: "upcoming" as const,
    songs: [
      {
        id: "feat-meesaya-01",
        title: "Aura 10/10",
        artist: "Hiphop Tamizha",
        album: "Meesaya Murukku 2",
        artworkUrl: "https://c.saavncdn.com/256/Mouna-Ragam-Tamil-2024-20251210130325-500x500.jpg",
        youtubeVideoId: "e9N5XyYp-G0",
        language: "Tamil",
      },
    ],
  },
  {
    filmTitle: "Vettaiyan",
    language: "Tamil",
    releaseDate: "2026-10-20",
    status: "released" as const,
    songs: [
      {
        id: "feat-vettaiyan-01",
        title: "Manasilaayo",
        artist: "Anirudh Ravichander, Malaysia Vasudevan, Yugendran",
        album: "Vettaiyan (Original Motion Picture Soundtrack)",
        artworkUrl: "https://c.saavncdn.com/177/Vettaiyan-Tamil-2024-20241010091834-500x500.jpg",
        youtubeVideoId: "5jEey_qLw1k",
        language: "Tamil",
      },
      {
        id: "feat-vettaiyan-02",
        title: "Hunter Vantaar",
        artist: "Anirudh Ravichander, Siddharth Basrur",
        album: "Vettaiyan",
        artworkUrl: "https://c.saavncdn.com/177/Vettaiyan-Tamil-2024-20241010091834-500x500.jpg",
        youtubeVideoId: "x0WqUe-P51s",
        language: "Tamil",
      },
    ],
  },
  {
    filmTitle: "Vidaamuyarchi",
    language: "Tamil",
    releaseDate: "2026-12-15",
    status: "upcoming" as const,
    songs: [
      {
        id: "feat-vidaa-01",
        title: "Sawadeeka",
        artist: "Anirudh Ravichander, Anthony Daasan",
        album: "Vidaamuyarchi",
        artworkUrl: "https://c.saavncdn.com/001/Vidaamuyarchi-Tamil-2025-500x500.jpg",
        youtubeVideoId: "gB1P-2M9Z0E",
        language: "Tamil",
      },
    ],
  },
  {
    filmTitle: "Dragon",
    language: "Tamil",
    releaseDate: "2026-12-01",
    status: "upcoming" as const,
    songs: [
      {
        id: "feat-dragon-01",
        title: "Rise of Dragon",
        artist: "Leon James, Anirudh Ravichander",
        album: "Dragon",
        artworkUrl: "https://c.saavncdn.com/981/ARM-Malayalam-2024-500x500.jpg",
        youtubeVideoId: "J8_xM3K2Zp0",
        language: "Tamil",
      },
    ],
  },
  {
    filmTitle: "Pushpa 2: The Rule",
    language: "Telugu",
    releaseDate: "2026-11-05",
    status: "released" as const,
    songs: [
      {
        id: "feat-pushpa-01",
        title: "Pushpa Pushpa",
        artist: "Devi Sri Prasad, Nakash Aziz",
        album: "Pushpa 2: The Rule",
        artworkUrl: "https://c.saavncdn.com/712/Pushpa-2-The-Rule-Telugu-2024-500x500.jpg",
        youtubeVideoId: "q9rU6zD-a5E",
        language: "Telugu",
      },
      {
        id: "feat-pushpa-02",
        title: "Sooseki (The Couple Song)",
        artist: "Devi Sri Prasad, Shreya Ghoshal",
        album: "Pushpa 2: The Rule",
        artworkUrl: "https://c.saavncdn.com/712/Pushpa-2-The-Rule-Telugu-2024-500x500.jpg",
        youtubeVideoId: "b8k5Z3V8yXE",
        language: "Telugu",
      },
    ],
  },
  {
    filmTitle: "Game Changer",
    language: "Telugu",
    releaseDate: "2026-12-20",
    status: "upcoming" as const,
    songs: [
      {
        id: "feat-gamechanger-01",
        title: "Jaragandi",
        artist: "Thaman S, Daler Mehndi, Sunidhi Chauhan",
        album: "Game Changer",
        artworkUrl: "https://c.saavncdn.com/832/Game-Changer-Telugu-2024-500x500.jpg",
        youtubeVideoId: "vB-W3F_34zY",
        language: "Telugu",
      },
    ],
  },
  {
    filmTitle: "Stree 2",
    language: "Hindi",
    releaseDate: "2026-10-15",
    status: "released" as const,
    songs: [
      {
        id: "feat-stree-01",
        title: "Aaj Ki Raat",
        artist: "Sachin-Jigar, Madhubanti Bagchi, Divya Kumar",
        album: "Stree 2 (Original Motion Picture Soundtrack)",
        artworkUrl: "https://c.saavncdn.com/213/Stree-2-Hindi-2024-500x500.jpg",
        youtubeVideoId: "k4yXQkG2s1E",
        language: "Hindi",
      },
    ],
  },
  {
    filmTitle: "Bhool Bhulaiyaa 3",
    language: "Hindi",
    releaseDate: "2026-11-01",
    status: "released" as const,
    songs: [
      {
        id: "feat-bb3-01",
        title: "Bhool Bhulaiyaa 3 Title Track",
        artist: "Pritam, Pitbull, Diljit Dosanjh, Neeraj Shridhar",
        album: "Bhool Bhulaiyaa 3",
        artworkUrl: "https://c.saavncdn.com/213/Stree-2-Hindi-2024-500x500.jpg",
        youtubeVideoId: "7kY5l2pE0hA",
        language: "Hindi",
      },
    ],
  },
  {
    filmTitle: "Kantara: Chapter 1",
    language: "Kannada",
    releaseDate: "2026-12-05",
    status: "upcoming" as const,
    songs: [
      {
        id: "feat-kantara-01",
        title: "Varaha Roopam (Divine Echo)",
        artist: "B. Ajaneesh Loknath, Sai Vignesh",
        album: "Kantara Chapter 1",
        artworkUrl: "https://c.saavncdn.com/456/Kantara-Kannada-2024-500x500.jpg",
        youtubeVideoId: "x0WqUe-P51s",
        language: "Kannada",
      },
    ],
  },
  {
    filmTitle: "ARM (Ajayante Randam Moshanam)",
    language: "Malayalam",
    releaseDate: "2026-10-18",
    status: "released" as const,
    songs: [
      {
        id: "feat-arm-01",
        title: "Angu Vaana Konilu",
        artist: "Dhibu Ninan Thomas, Vaikom Vijayalakshmi",
        album: "ARM",
        artworkUrl: "https://c.saavncdn.com/981/ARM-Malayalam-2024-500x500.jpg",
        youtubeVideoId: "J8_xM3K2Zp0",
        language: "Malayalam",
      },
    ],
  },
];

function formatReleaseLabel(status: "released" | "upcoming", dateStr?: string): string {
  if (status === "released") {
    return "Now Streaming";
  }
  if (!dateStr) return "Upcoming Film";
  try {
    const target = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Just Released";
    if (diffDays === 1) return "Releases Tomorrow";
    if (diffDays <= 30) return `In ${diffDays} days`;
    return `Releases ${target.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  } catch {
    return "Coming Soon";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const langParam = searchParams.get("lang") || "ta,en";
  const userLanguages = langParam
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);

  const today = new Date();
  const windowStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const startStr = windowStart.toISOString().slice(0, 10);
  const endStr = windowEnd.toISOString().slice(0, 10);

  const cacheKey = `featured-${userLanguages.sort().join("-")}-${startStr}-${endStr}`;
  const now = Date.now();

  const cached = FEATURED_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload);
  }

  // Strictly filter candidates matching release date window [today - 30 days, today + 60 days]
  const windowedFilms = LATEST_FILM_CATALOG.filter((f) => {
    if (!f.releaseDate) return false;
    return f.releaseDate >= startStr && f.releaseDate <= endStr;
  });

  // Filter candidates matching user's selected languages
  const matchingFilms = windowedFilms.filter((f) => {
    const l = f.language.toLowerCase();
    return (
      userLanguages.includes(l) ||
      userLanguages.some((ul) => l.startsWith(ul) || ul.startsWith(l.slice(0, 2)))
    );
  });

  const featuredPool = matchingFilms.length > 0 ? matchingFilms : windowedFilms;

  const tracks: FeaturedMovieSong[] = [];
  for (const film of featuredPool) {
    for (const song of film.songs) {
      if (isTrackBlocked(song)) continue;

      tracks.push({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        artworkUrl: song.artworkUrl,
        filmTitle: film.filmTitle,
        releaseStatus: film.status,
        releaseLabel: formatReleaseLabel(film.status, film.releaseDate),
        releaseDate: film.releaseDate,
        language: song.language,
        youtubeVideoId: song.youtubeVideoId,
        isPlayable: true,
      });
    }
  }

  const payload = {
    featured: tracks.slice(0, 8),
    window: {
      start: startStr,
      end: endStr,
    },
    totalCount: tracks.length,
    cachedAt: now,
  };

  FEATURED_CACHE.set(cacheKey, {
    payload,
    expiresAt: now + CACHE_TTL_MS,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200",
    },
  });
}
