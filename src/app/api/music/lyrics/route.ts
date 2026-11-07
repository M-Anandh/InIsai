import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track") || "";
  const artist = searchParams.get("artist") || "";

  if (!track.trim()) {
    return NextResponse.json({ syncedLyrics: null, plainLyrics: null });
  }

  // Clean title: remove "(From ...)", "[...]", etc.
  const cleanTrack = track
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .trim();

  try {
    const query = `${cleanTrack} ${artist || ""}`.trim();
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "InIsai-Music-App/1.0",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ syncedLyrics: null, plainLyrics: null });
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      // Find first result that has synced or plain lyrics
      const match = data.find((d: any) => d.syncedLyrics) || data[0];
      return NextResponse.json({
        syncedLyrics: match.syncedLyrics || null,
        plainLyrics: match.plainLyrics || null,
      });
    }

    return NextResponse.json({ syncedLyrics: null, plainLyrics: null });
  } catch (err: any) {
    console.warn("Lyrics fetch error:", err);
    return NextResponse.json({ syncedLyrics: null, plainLyrics: null });
  }
}

