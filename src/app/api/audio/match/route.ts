import { NextRequest, NextResponse } from "next/server";
import { matchAudioSource, trackMapCache, AudioMatchCandidate } from "@/lib/audio/matcher";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "";
  const artists = searchParams.get("artists") || searchParams.get("artist") || "";
  const film = searchParams.get("film") || searchParams.get("album") || undefined;
  const durationStr = searchParams.get("duration");
  const duration = durationStr ? parseInt(durationStr, 10) : undefined;
  const trackKey = searchParams.get("trackKey") || undefined;

  if (!title.trim()) {
    return NextResponse.json(
      { error: "Query parameter 'title' is required" },
      { status: 400 }
    );
  }

  try {
    const result = await matchAudioSource({
      title,
      artists,
      film,
      duration,
      trackKey,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed matching audio source" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trackKey, choice } = body as {
      trackKey: string;
      choice: AudioMatchCandidate;
    };

    if (!trackKey || !choice) {
      return NextResponse.json(
        { error: "trackKey and choice are required" },
        { status: 400 }
      );
    }

    trackMapCache.set(trackKey, {
      choice,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true, trackKey, choice });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed saving choice" },
      { status: 500 }
    );
  }
}
