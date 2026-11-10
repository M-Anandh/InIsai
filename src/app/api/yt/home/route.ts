import { NextRequest, NextResponse } from "next/server";
import { ytHomeShelves } from "@/music/providers/ytmusic-server";

export async function GET(req: NextRequest) {
  const shelfId = new URL(req.url).searchParams.get("shelf");
  const shelves = await ytHomeShelves();

  if (shelfId) {
    const match = shelves.find((s) => s.id === shelfId);
    return NextResponse.json(
      { shelf: match || shelves[0] || { id: shelfId, title: shelfId, items: [] } },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
    );
  }

  return NextResponse.json(
    { shelves },
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
  );
}

