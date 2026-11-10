import { NextRequest, NextResponse } from "next/server";
import { ytSearch } from "@/music/providers/ytmusic-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";

  if (!q.trim()) {
    return NextResponse.json({
      topResult: null,
      songs: [],
      videos: [],
      albums: [],
      artists: [],
      playlists: [],
      results: [],
    });
  }

  const data = await ytSearch(q, type);
  return NextResponse.json(
    {
      ...data,
      results: data.songs, // backwards-compatible flat results alias
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
      },
    }
  );
}

