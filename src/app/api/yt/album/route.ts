import { NextRequest, NextResponse } from "next/server";
import { ytAlbumDetails } from "@/music/providers/ytmusic-server";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Missing album id" }, { status: 400 });

  const album = await ytAlbumDetails(id);
  if (!album) return NextResponse.json({ error: "Album not found" }, { status: 404 });

  return NextResponse.json(album, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
