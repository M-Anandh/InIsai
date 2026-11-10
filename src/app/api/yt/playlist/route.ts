import { NextRequest, NextResponse } from "next/server";
import { ytPlaylistDetails } from "@/music/providers/ytmusic-server";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Missing playlist id" }, { status: 400 });

  const playlist = await ytPlaylistDetails(id);
  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

  return NextResponse.json(playlist, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
