import { NextRequest, NextResponse } from "next/server";
import CryptoJS from "crypto-js";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

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

function normalizeLanguage(lang: string | undefined): string {
  if (!lang) return "Tamil";
  const l = lang.toLowerCase().trim();
  if (l.includes("eng")) return "English";
  if (l.includes("tam")) return "Tamil";
  if (l.includes("hin")) return "Hindi";
  if (l.includes("tel")) return "Telugu";
  if (l.includes("mal")) return "Malayalam";
  if (l.includes("kan")) return "Kannada";
  return lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json({ results: [], topResult: null });
  }

  try {
    const formattedQuery = expandQuery(query);
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Cookie": "L=english%2Ctamil%2Chindi%2Ctelugu%2Cmalayalam; gdpr_acceptance=true",
      "Accept-Language": "en-US,en;q=0.9,ta;q=0.8,hi;q=0.7",
    };

    // 1. Fetch from JioSaavn API with broad language cookie support
    const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
      formattedQuery
    )}&_format=json&_marker=0&api_version=4&n=30`;

    const res = await fetch(searchUrl, {
      headers,
      next: { revalidate: 3600 },
    });

    let rawSongs: any[] = [];
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      rawSongs = data.results || [];
    }

    // Fallback if empty and query differed from original
    if (rawSongs.length === 0 && formattedQuery !== query.trim()) {
      const fallbackUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
        query.trim()
      )}&_format=json&_marker=0&api_version=4&n=30`;
      const fallbackRes = await fetch(fallbackUrl, { headers });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        rawSongs = fallbackData.results || [];
      }
    }

    // Fallback to autocomplete if still empty
    if (rawSongs.length === 0) {
      const autoUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(
        formattedQuery
      )}`;
      const autoRes = await fetch(autoUrl, { headers });
      if (autoRes.ok) {
        const autoData = await autoRes.json().catch(() => ({}));
        rawSongs = autoData.songs?.data || [];
      }
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

      // Correctly read top-level item.language first, then fall back to more_info
      const rawLanguage = item.language || moreInfo.language;
      const language = normalizeLanguage(rawLanguage);

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
        language,
        isPlayable: Boolean(streamUrl),
      };
    });

    // 2. Ranking Algorithm: Score and prioritize exact title/artist matches and penalize covers
    const qLower = query.toLowerCase().trim();
    const qTokens = qLower.split(/[\s,+-]+/).filter((t) => t.length > 1);
    const wantsCoverOrRemix = /cover|remix|slowed|lofi|instrumental|karaoke|tribute|reverb|acoustic/i.test(qLower);

    const scoredTracks = tracks.map((track) => {
      let score = 0;
      const titleLower = track.title.toLowerCase();
      const artistLower = track.artist.toLowerCase();

      // Exact title match gets massive boost
      if (titleLower === qLower) {
        score += 160;
      } else if (titleLower.startsWith(qLower) || qLower.startsWith(titleLower)) {
        score += 90;
      } else if (titleLower.includes(qLower)) {
        score += 60;
      }

      // Check artist match
      if (artistLower.includes(qLower)) {
        score += 100;
      }

      // Check token intersections
      let matchedTokens = 0;
      for (const token of qTokens) {
        if (titleLower.includes(token)) {
          score += 25;
          matchedTokens++;
        }
        if (artistLower.includes(token)) {
          score += 35;
          matchedTokens++;
        }
      }
      if (matchedTokens >= qTokens.length && qTokens.length > 1) {
        score += 50;
      }

      // Playable stream boost
      if (track.isPlayable) {
        score += 20;
      }

      // Heavy penalty for cover/remix/slowed/lofi if user didn't ask for it
      if (!wantsCoverOrRemix) {
        if (/cover|tribute|karaoke|instrumental|slowed|lofi|reverb|piano version/i.test(titleLower)) {
          score -= 90;
        }
        if (/remix|mix|mashup|edit/i.test(titleLower) && !/remix/i.test(qLower)) {
          score -= 40;
        }
      }

      return { track, score };
    });

    // Sort descending by score
    scoredTracks.sort((a, b) => b.score - a.score);

    // Deduplicate by clean title + primary artist
    const uniqueTracks: any[] = [];
    const seenSignatures = new Set<string>();

    for (const item of scoredTracks) {
      const sig = `${item.track.title.toLowerCase().replace(/[^a-z0-9]/g, "")}_${item.track.artist.toLowerCase().slice(0, 10)}`;
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        uniqueTracks.push(item.track);
      }
    }

    const topResult = uniqueTracks.length > 0 ? uniqueTracks[0] : null;

    return NextResponse.json({
      results: uniqueTracks,
      topResult,
      count: uniqueTracks.length,
    });
  } catch (error: any) {
    console.error("Music search API error:", error);
    return NextResponse.json({ results: [], topResult: null, error: error.message }, { status: 500 });
  }
}
