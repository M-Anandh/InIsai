import { NextRequest, NextResponse } from "next/server";
import { ytSuggest } from "@/music/providers/ytmusic-server";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await ytSuggest(q);
  return NextResponse.json(
    { suggestions },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
