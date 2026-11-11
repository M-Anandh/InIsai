import { NextRequest, NextResponse } from "next/server";
import { INISAI_OFFICIAL_COLLECTIONS } from "@/music/collections";
import { ytSearch } from "@/music/providers/ytmusic-server";
import { Track } from "@/types";

const collectionCache = new Map<string, { payload: any; expiresAt: number }>();

function selectPriorityQueries(queries: string[], limit: number): string[] {
  if (queries.length <= limit) return queries;
  // Include lead iconic tracks plus the broad playlist query (last item) first
  const picks: string[] = [];
  const candidates = [queries[0], queries[queries.length - 1], queries[1], queries[2], ...queries.slice(3)];
  for (const q of candidates) {
    if (q && !picks.includes(q)) {
      picks.push(q);
      if (picks.length >= limit) break;
    }
  }
  return picks;
}

function appendUniqueTracks(
  responses: PromiseSettledResult<{ songs: Track[] }>[],
  tracks: Track[],
  seenIds: Set<string>,
  seenTitles: Set<string>,
  maxTracks: number
) {
  for (const res of responses) {
    if (res.status !== "fulfilled") continue;
    for (const song of res.value.songs) {
      if (seenIds.has(song.id)) continue;
      const normTitle = song.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seenTitles.has(normTitle)) continue;
      seenIds.add(song.id);
      seenTitles.add(normTitle);
      tracks.push(song);
      if (tracks.length >= maxTracks) return;
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({
      collections: INISAI_OFFICIAL_COLLECTIONS.map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        gradient: c.gradient,
      })),
    });
  }

  const col = INISAI_OFFICIAL_COLLECTIONS.find((c) => c.id === id);
  if (!col) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const cached = collectionCache.get(col.id);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  }

  const startedAt = Date.now();
  const primaryQueries = selectPriorityQueries(col.queries, 4);
  const primaryResponses = await Promise.allSettled(
    primaryQueries.map((q) => ytSearch(q, "song"))
  );

  const tracks: Track[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  appendUniqueTracks(primaryResponses, tracks, seenIds, seenTitles, 35);

  // Only fire follow-up queries if under targetCount and still within a fast budget
  if (tracks.length < col.targetCount && Date.now() - startedAt < 3800) {
    const remaining = col.queries.filter((q) => !primaryQueries.includes(q)).slice(0, 3);
    if (remaining.length > 0) {
      const followUpResponses = await Promise.allSettled(
        remaining.map((q) => ytSearch(q, "song"))
      );
      appendUniqueTracks(followUpResponses, tracks, seenIds, seenTitles, 35);
    }
  }

  const payload = {
    id: col.id,
    title: col.title,
    subtitle: col.subtitle,
    gradient: col.gradient,
    trackCount: tracks.length,
    tracks,
    collageArtworks: tracks.slice(0, 4).map((t) => t.artworkUrl).filter(Boolean),
  };

  if (tracks.length >= 10) {
    collectionCache.set(col.id, {
      payload,
      expiresAt: Date.now() + 86400 * 1000,
    });
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}

