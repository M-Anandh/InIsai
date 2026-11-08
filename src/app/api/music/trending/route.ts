import { NextRequest, NextResponse } from "next/server";
import CryptoJS from "crypto-js";
import { CURATED_TRACKS } from "@/music/curated-data";

const DES_KEY = CryptoJS.enc.Utf8.parse("38346591");

function decryptMediaUrl(encryptedUrl: string): string {
  try {
    const cipherParams = {
      ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl),
    } as any;
    const decrypted = CryptoJS.DES.decrypt(cipherParams, DES_KEY, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    const plain = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plain) return "";
    return plain
      .replace("_96.mp4", "_320.mp4")
      .replace("_160.mp4", "_320.mp4");
  } catch {
    return "";
  }
}

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "tamil";

  // Map category to real chart queries
  const queryMap: Record<string, string> = {
    tamil: "latest tamil top trending hits",
    tamil_melody: "ilaiyaraaja spb evergreen tamil melody",
    tamil_love: "tamil heartwarming love songs",
    hindi: "latest bollywood trending hits",
    english: "global billboard top hits",
    telugu: "latest telugu trending songs",
    malayalam: "latest malayalam top hits",
  };

  const query = queryMap[category] || "latest tamil trending hits";

  try {
    const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
      query
    )}&_format=json&_marker=0&api_version=4&n=20`;

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    const data = await res.json();
    const rawSongs = data.results || [];

    const tracks = rawSongs.map((item: any) => {
      const moreInfo = item.more_info || {};
      let streamUrl = "";

      if (moreInfo.encrypted_media_url) {
        streamUrl = decryptMediaUrl(moreInfo.encrypted_media_url);
      }
      if (!streamUrl && moreInfo.vlink) {
        streamUrl = moreInfo.vlink;
      }

      const rawImage = item.image || item.artwork_url || "";
      const artwork = rawImage
        ? rawImage
            .replace("150x150", "500x500")
            .replace("50x50", "500x500")
            .replace("http://", "https://")
        : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

      const title = decodeHtmlEntities(item.title || item.song || "Unknown Song");
      const artist = decodeHtmlEntities(
        item.subtitle ||
          item.more_info?.primary_artists ||
          item.more_info?.singers ||
          "InIsai Artist"
      );
      const album = decodeHtmlEntities(
        item.more_info?.album || item.album || ""
      );

      return {
        id: `trending-${item.id || item.perma_url || Math.random().toString(36).substring(2, 8)}`,
        title,
        artist,
        album,
        duration: parseInt(item.more_info?.duration || item.duration || "180", 10),
        artworkUrl: artwork,
        streamUrl,
        sourceType: "public_api",
        sourceId: `saavn-${item.id || ""}`,
        language: item.more_info?.language || category,
        genre: item.more_info?.genre || "Trending",
        isPlayable: Boolean(streamUrl),
        bitrate: "320kbps",
      };
    }).filter((t: any) => t.isPlayable);

    return NextResponse.json(
      { category, count: tracks.length, results: tracks },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err: any) {
    console.warn("Trending fetch fallback triggered:", err?.message || err);
    // Graceful fallback to filtered curated catalog
    const fallbackTracks = CURATED_TRACKS.filter((t) => {
      if (category === "tamil" || category === "tamil_melody" || category === "tamil_love") {
        return t.language === "Tamil";
      }
      return true;
    });
    return NextResponse.json({ category, count: fallbackTracks.length, results: fallbackTracks });
  }
}
