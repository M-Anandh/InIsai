import { NextRequest, NextResponse } from "next/server";
import CryptoJS from "crypto-js";

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
  } catch (err) {
    console.warn("Failed to decrypt JioSaavn stream URL:", err);
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

function expandQuery(query: string): string {
  let cleaned = query.trim();
  if (/^(love songs?|melody( songs?)?|romantic( songs?)?|sad songs?|hits|new songs?|party songs?)$/i.test(cleaned)) {
    return `tamil ${cleaned}`;
  }
  if (/\bdragon\b/i.test(cleaned) && !/imagine/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bdragon\b/gi, "imagine dragons");
  } else if (/\barr\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/\barr\b/gi, "a.r. rahman");
  } else if (/\bspb\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bspb\b/gi, "s.p. balasubrahmanyam");
  } else if (/\bu1\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bu1\b/gi, "yuvan shankar raja");
  } else if (/\bani\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bani\b/gi, "anirudh");
  }
  return cleaned;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const formattedQuery = expandQuery(query);

    // 1. Fetch from JioSaavn API
    const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
      formattedQuery
    )}&_format=json&_marker=0&api_version=4&n=25`;

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    const data = await res.json();
    let rawSongs = data.results || [];

    // Fallback if empty and query differed from original
    if (rawSongs.length === 0 && formattedQuery !== query.trim()) {
      const fallbackUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
        query.trim()
      )}&_format=json&_marker=0&api_version=4&n=25`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const fallbackData = await fallbackRes.json();
      rawSongs = fallbackData.results || [];
    }

    // Fallback to autocomplete if still empty
    if (rawSongs.length === 0) {
      const autoUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(
        formattedQuery
      )}`;
      const autoRes = await fetch(autoUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const autoData = await autoRes.json();
      rawSongs = autoData.songs?.data || [];
    }

    const tracks = rawSongs.map((item: any) => {
      const moreInfo = item.more_info || {};
      let streamUrl = "";

      if (moreInfo.encrypted_media_url) {
        streamUrl = decryptMediaUrl(moreInfo.encrypted_media_url);
      }
      if (!streamUrl && moreInfo.vlink) {
        streamUrl = moreInfo.vlink;
      }

      // High-res artwork
      const rawImage = item.image || item.artwork_url || "";
      const artwork = rawImage
        ? rawImage
            .replace("150x150", "500x500")
            .replace("50x50", "500x500")
            .replace("http://", "https://")
        : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

      const title = decodeHtmlEntities(item.title || item.song || "Unknown Song");

      // Robust artist extraction (checks artistMap, subtitle, singers, music)
      const primaryArtists = Array.isArray(moreInfo.artistMap?.primary_artists)
        ? moreInfo.artistMap.primary_artists.map((a: any) => a.name).filter(Boolean).join(", ")
        : "";
      const allArtists = Array.isArray(moreInfo.artistMap?.artists)
        ? moreInfo.artistMap.artists.slice(0, 3).map((a: any) => a.name).filter(Boolean).join(", ")
        : "";
      const artist = decodeHtmlEntities(
        primaryArtists ||
        item.subtitle ||
        moreInfo.singers ||
        moreInfo.music ||
        allArtists ||
        item.description ||
        "Popular Artist"
      );

      const album = decodeHtmlEntities(moreInfo.album || item.album || "");

      return {
        id: `saavn-${item.id}`,
        title,
        artist,
        album,
        duration: parseInt(moreInfo.duration || "210", 10),
        artworkUrl: artwork,
        streamUrl,
        sourceType: "public_api",
        sourceId: item.id?.toString() || "",
        language: moreInfo.language || "Tamil",
        isPlayable: Boolean(streamUrl),
      };
    });

    // If tracks are found, sort to prioritize exact title/artist matches
    const qLower = query.toLowerCase().trim();
    tracks.sort((a: any, b: any) => {
      const aTitleMatch = a.title.toLowerCase().includes(qLower);
      const bTitleMatch = b.title.toLowerCase().includes(qLower);
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      return 0;
    });

    return NextResponse.json({ results: tracks });
  } catch (error: any) {
    console.error("Music search API error:", error);
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
