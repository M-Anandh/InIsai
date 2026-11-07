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
  const songId = searchParams.get("id") || "";
  const artist = searchParams.get("artist") || "";

  let rawSongs: any[] = [];

  try {
    // 1. If songId is provided, try reco.getreco
    if (songId) {
      const cleanId = songId.replace("saavn-", "");
      const recoUrl = `https://www.jiosaavn.com/api.php?__call=reco.getreco&pid=${encodeURIComponent(
        cleanId
      )}&_format=json&_marker=0&api_version=4`;

      const res = await fetch(recoUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        next: { revalidate: 3600 },
      });

      const data = await res.json();
      if (Array.isArray(data)) {
        rawSongs = data;
      } else if (data[cleanId] && Array.isArray(data[cleanId])) {
        rawSongs = data[cleanId];
      }
    }

    // 2. Fallback to artist or general hits search if reco was empty
    if (rawSongs.length === 0) {
      const query = artist ? `${artist} hits` : "tamil top hits";
      const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
        query
      )}&_format=json&_marker=0&api_version=4&n=15`;

      const res = await fetch(searchUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const data = await res.json();
      rawSongs = data.results || [];
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

      const rawImage = item.image || item.artwork_url || "";
      const artwork = rawImage
        ? rawImage
            .replace("150x150", "500x500")
            .replace("50x50", "500x500")
            .replace("http://", "https://")
        : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

      const title = decodeHtmlEntities(item.title || item.song || "Unknown Song");
      const artistName = decodeHtmlEntities(
        moreInfo.singers ||
          moreInfo.primary_artists ||
          item.description ||
          "Popular Artist"
      );
      const album = decodeHtmlEntities(moreInfo.album || item.album || "");

      return {
        id: `saavn-${item.id}`,
        title,
        artist: artistName,
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
    console.error("Recommendations error:", error);
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
