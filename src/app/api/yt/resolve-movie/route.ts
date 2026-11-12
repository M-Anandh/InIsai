import { NextRequest, NextResponse } from "next/server";
import { ytResolveMovieAlbum } from "@/music/providers/ytmusic-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const albumId = searchParams.get("albumId") || undefined;
    const title = searchParams.get("title") || "";
    const album = searchParams.get("album") || "";
    const artist = searchParams.get("artist") || "";

    const resolved = await ytResolveMovieAlbum({ albumId, title, album, artist });
    return NextResponse.json(resolved);
  } catch {
    return NextResponse.json({ albumId: null });
  }
}

