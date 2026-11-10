import { NextRequest, NextResponse } from "next/server";
import { ytRelated } from "@/music/providers/ytmusic-server";

export async function GET(req: NextRequest) {
  const videoId = new URL(req.url).searchParams.get("videoId") || "";
  if (!videoId) {
    return NextResponse.json({ results: [] });
  }
  const results = await ytRelated(videoId);
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
  );
}
