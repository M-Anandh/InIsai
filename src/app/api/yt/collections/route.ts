import { NextRequest, NextResponse } from "next/server";
import { INISAI_OFFICIAL_COLLECTIONS } from "@/music/collections";
import { ytSearch } from "@/music/providers/ytmusic-server";
import { Track } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    // Return summary of all collections cleanly
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

  // Resolve seed queries at runtime in parallel batches (never hardcoded stream URLs)
  const batchResponses = await Promise.allSettled(
    col.queries.map((q) => ytSearch(q, "song"))
  );

  const tracks: Track[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  for (const res of batchResponses) {
    if (res.status !== "fulfilled") continue;
    for (const song of res.value.songs) {
      if (seenIds.has(song.id)) continue;
      const normTitle = song.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seenTitles.has(normTitle)) continue;
      seenIds.add(song.id);
      seenTitles.add(normTitle);
      tracks.push(song);
      if (tracks.length >= 35) break;
    }
    if (tracks.length >= 35) break;
  }

  return NextResponse.json(
    {
      id: col.id,
      title: col.title,
      subtitle: col.subtitle,
      gradient: col.gradient,
      trackCount: tracks.length,
      tracks,
      collageArtworks: tracks.slice(0, 4).map((t) => t.artworkUrl).filter(Boolean),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    }
  );
}
