import { NextRequest, NextResponse } from "next/server";
import { ytSearch } from "@/music/providers/ytmusic-server";

export async function GET(req: NextRequest) {
  const country = new URL(req.url).searchParams.get("country") || "IN";
  const queryMap: Record<string, string> = {
    IN: "Top 100 Music India Tamil Hindi Telugu Trending 2026",
    TN: "Top Tamil Songs 2026 Trending Chartbusters",
    US: "Billboard Hot 100 Top Songs USA Global",
    GLOBAL: "Global Top 50 Chart Hits Music",
  };
  const q = queryMap[country.toUpperCase()] || queryMap.IN;
  const data = await ytSearch(q, "song");

  return NextResponse.json(
    {
      country: country.toUpperCase(),
      results: data.songs,
    },
    {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    }
  );
}

