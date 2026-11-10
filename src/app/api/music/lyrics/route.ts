import { NextRequest, NextResponse } from "next/server";
import { ytLyrics } from "@/music/providers/ytmusic-server";

interface LyricsResponsePayload {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  source: "lrclib" | "ytmusic" | "none";
}

interface LyricsProvider {
  id: string;
  fetch(params: { track: string; artist: string; duration?: number; videoId?: string }): Promise<LyricsResponsePayload | null>;
}

function cleanMetadataTitle(track: string): string {
  return track
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\b(official audio|official video|lyrics|lyric video|ft\.?|feat\.?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const lrclibProvider: LyricsProvider = {
  id: "lrclib",
  async fetch({ track, artist, duration }) {
    const cleanTrack = cleanMetadataTitle(track);
    const cleanArtist = artist.split(/[,&•]/)[0].trim();

    // 1. Exact endpoint `/api/get` when duration & artist exist
    if (cleanTrack && cleanArtist && duration && duration > 10) {
      try {
        const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
          cleanTrack
        )}&artist_name=${encodeURIComponent(cleanArtist)}&duration=${Math.round(duration)}`;
        const exactRes = await fetch(getUrl, {
          headers: { "User-Agent": "InIsai-Music-App/2.0" },
          next: { revalidate: 86400 },
        });
        if (exactRes.ok) {
          const item = await exactRes.json();
          if (item?.syncedLyrics || item?.plainLyrics) {
            return {
              syncedLyrics: item.syncedLyrics || null,
              plainLyrics: item.plainLyrics || null,
              source: "lrclib",
            };
          }
        }
      } catch {}
    }

    // 2. Fallback to `/api/search` matching by query and prioritizing duration affinity
    try {
      const query = `${cleanTrack} ${cleanArtist}`.trim();
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, {
        headers: { "User-Agent": "InIsai-Music-App/2.0" },
        next: { revalidate: 86400 },
      });

      if (!res.ok) return null;
      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) return null;

      // Rank candidates: syncedLyrics + closeness to duration
      const scored = list
        .map((item: any) => {
          let score = 0;
          if (item.syncedLyrics) score += 100;
          else if (item.plainLyrics) score += 20;

          if (duration && item.duration) {
            const diff = Math.abs(Number(item.duration) - duration);
            if (diff <= 3) score += 60;
            else if (diff <= 10) score += 25;
            else if (diff > 30) score -= 40;
          }
          return { item, score };
        })
        .sort((a, b) => b.score - a.score);

      const best = scored[0]?.item;
      if (best && (best.syncedLyrics || best.plainLyrics)) {
        return {
          syncedLyrics: best.syncedLyrics || null,
          plainLyrics: best.plainLyrics || null,
          source: "lrclib",
        };
      }
    } catch {}
    return null;
  },
};

const ytMusicLyricsProvider: LyricsProvider = {
  id: "ytmusic",
  async fetch({ videoId }) {
    if (!videoId) return null;
    try {
      const plain = await ytLyrics(videoId);
      if (plain) {
        return {
          syncedLyrics: null,
          plainLyrics: plain,
          source: "ytmusic",
        };
      }
    } catch {}
    return null;
  },
};

const PROVIDERS: LyricsProvider[] = [lrclibProvider, ytMusicLyricsProvider];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track") || "";
  const artist = searchParams.get("artist") || "";
  const durationParam = searchParams.get("duration");
  const videoId = searchParams.get("videoId") || "";
  const duration = durationParam ? parseFloat(durationParam) : undefined;

  if (!track.trim() && !videoId) {
    return NextResponse.json({ syncedLyrics: null, plainLyrics: null, source: "none" });
  }

  for (const provider of PROVIDERS) {
    const result = await provider.fetch({ track, artist, duration, videoId });
    if (result && (result.syncedLyrics || result.plainLyrics)) {
      return NextResponse.json(result, {
        headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
      });
    }
  }

  return NextResponse.json({ syncedLyrics: null, plainLyrics: null, source: "none" });
}
