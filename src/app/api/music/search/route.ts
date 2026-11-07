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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    // If query is a generic mood/genre term like "love songs", "melody", expand with "tamil" to prioritize native catalogue
    let formattedQuery = query.trim();
    if (/^(love songs?|melody( songs?)?|romantic( songs?)?|sad songs?|hits|new songs?|party songs?)$/i.test(formattedQuery)) {
      formattedQuery = `tamil ${formattedQuery}`;
    }

    // 1. Try search.getResults (comprehensive search)
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

    // 2. If search.getResults returned nothing, fallback to autocomplete.get
    if (rawSongs.length === 0) {
      const autoUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(
        query
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
      const artist = decodeHtmlEntities(
        moreInfo.singers ||
          moreInfo.primary_artists ||
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

    return NextResponse.json({ results: tracks });
  } catch (error: any) {
    console.error("Music search API error:", error);
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
