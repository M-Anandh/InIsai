import { NextRequest, NextResponse } from "next/server";
import { ytArtistDetails } from "@/music/providers/ytmusic-server";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Missing artist id" }, { status: 400 });

  const artist = await ytArtistDetails(id);
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  return NextResponse.json(artist, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
