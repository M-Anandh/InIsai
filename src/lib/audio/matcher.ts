import CryptoJS from "crypto-js";

const DES_KEY = CryptoJS.enc.Utf8.parse("38346591");

export function decryptMediaUrl(encryptedUrl: string): string {
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
    return plain.replace("_96.mp4", "_320.mp4").replace("_160.mp4", "_320.mp4");
  } catch {
    return "";
  }
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// In-memory persistent mapping cache (trackKey -> match choice) with 7-day TTL
interface CacheEntry {
  choice: AudioMatchCandidate | null;
  timestamp: number;
}
export const trackMapCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Known artist aliases for cross-catalog fuzzy matching
const ARTIST_ALIASES: Record<string, string[]> = {
  "anirudh": ["anirudh ravichander", "anirudh", "ani"],
  "anirudh ravichander": ["anirudh", "ani"],
  "a. r. rahman": ["ar rahman", "a.r. rahman", "ar. rahman", "rahman", "arr"],
  "a.r. rahman": ["a. r. rahman", "ar rahman", "rahman", "arr"],
  "ar rahman": ["a. r. rahman", "a.r. rahman", "rahman", "arr"],
  "yuvan shankar raja": ["yuvan", "u1", "yuvan shankar"],
  "yuvan": ["yuvan shankar raja", "u1"],
  "harris jayaraj": ["harris", "hj"],
  "g. v. prakash kumar": ["gv prakash", "g.v. prakash", "gvp", "g.v. prakash kumar"],
  "gv prakash": ["g. v. prakash kumar", "g.v. prakash", "gvp"],
  "hiphop tamizha": ["hiphop tamizha adhi", "adhi", "hiphop tamizha"],
  "dhibu ninan thomas": ["dhibu", "dhibu ninan"],
  "s. p. balasubrahmanyam": ["spb", "s.p. balasubrahmanyam", "sp balasubrahmanyam"],
  "k. j. yesudas": ["kj yesudas", "yesudas", "k.j. yesudas"],
  "sai abhyankkar": ["sai abhyankar", "abhyankkar", "abhyankar"],
  "sai abhyankar": ["sai abhyankkar", "abhyankkar"],
  "adele": ["adele adkins"],
  "imagine dragons": ["dragons"],
  "alan walker": ["alan olav walker"],
};

export interface MatchInput {
  title: string;
  artists?: string;
  film?: string;
  duration?: number;
  trackKey?: string;
}

export interface AudioMatchCandidate {
  provider: "saavn" | "local" | "public";
  id: string;
  title: string;
  artists: string;
  album: string;
  duration: number;
  streamUrl: string;
  artworkUrl: string;
  score: number;
  rejectedBecause: string | null;
  scoreBreakdown?: {
    titleScore: number;
    artistScore: number;
    filmScore: number;
    durationScore: number;
    penalties: number;
  };
}

export interface MatchResult {
  query: MatchInput;
  cleanTitle: string;
  film: string | null;
  candidates: AudioMatchCandidate[];
  finalChoice: AudioMatchCandidate | null;
}

/**
 * Normalises Tamil/Indic romanisation variations:
 * aa -> a, ee -> i, oo -> u, zh -> l, th -> t, dh -> d, kk -> k, etc.
 */
export function normalizeRomanization(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/zh/g, "l")
    .replace(/th/g, "t")
    .replace(/dh/g, "d")
    .replace(/bh/g, "b")
    .replace(/gh/g, "g")
    .replace(/ph/g, "p")
    .replace(/sh/g, "s")
    .replace(/kh/g, "k")
    .replace(/([a-z])\1+/g, "$1") // collapse double consonants (kk -> k, pp -> p, tt -> t, etc.)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Standard Jaro-Winkler string similarity distance [0, 1]
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const maxDist = Math.floor(Math.max(len1, len2) / 2) - 1;

  const match1 = new Array(len1).fill(false);
  const match2 = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (match2[j] || s1[i] !== s2[j]) continue;
      match1[i] = true;
      match2[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!match1[i]) continue;
    while (!match2[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix scaling (up to 4 matching initial chars with p=0.1)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Token Set Ratio: compares unique words in both strings, finding intersection similarity
 */
export function tokenSetRatio(s1: string, s2: string): number {
  const norm1 = normalizeRomanization(s1);
  const norm2 = normalizeRomanization(s2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1;

  const tokens1 = new Set(norm1.split(" ").filter(Boolean));
  const tokens2 = new Set(norm2.split(" ").filter(Boolean));

  let intersectionCount = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersectionCount++;
  }

  const unionCount = new Set([...tokens1, ...tokens2]).size;
  if (unionCount === 0) return 0;

  const jaccard = intersectionCount / unionCount;
  const jw = jaroWinkler(norm1, norm2);

  return Math.max(jaccard, jw);
}

/**
 * Extracts film name and cleans raw song title
 */
export function cleanTitleAndExtractFilm(rawTitle: string): { cleanTitle: string; film: string | null } {
  let text = rawTitle || "";
  let film: string | null = null;

  // Match (From "Film Name") or (From Film Name) or - From Film Name
  const fromRegexes = [
    /\(?\bfrom\s+["'“]([^"'”]+)["'”]\)?/i,
    /\(?\bfrom\s+([A-Za-z0-9\s]+?)(?:\)|-|\/|$)/i,
    /-\s*from\s+([^-\(\]]+)/i,
  ];

  for (const re of fromRegexes) {
    const m = text.match(re);
    if (m && m[1]) {
      film = m[1].trim();
      text = text.replace(m[0], " ");
      break;
    }
  }

  // Remove common metadata noise
  text = text
    .replace(/\(official.*?\)|\[official.*?\]/gi, " ")
    .replace(/\(lyrics.*?\)|\[lyrics.*?\]/gi, " ")
    .replace(/\(remastered.*?\)|\[remastered.*?\]/gi, " ")
    .replace(/\(audio\)|\[audio\]|\(video\)|\[video\]/gi, " ")
    .replace(/original motion picture soundtrack/gi, " ")
    .replace(/\bost\b/gi, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^\)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    cleanTitle: text || rawTitle.trim(),
    film: film ? film.replace(/original motion picture soundtrack/gi, "").trim() : null,
  };
}

/**
 * Calculates artist overlap using alias map
 */
export function scoreArtistOverlap(queryArtist: string, candidateArtist: string): number {
  if (!queryArtist || !candidateArtist) return 0.5; // Neutral if missing

  const qNorm = normalizeRomanization(queryArtist);
  const cNorm = normalizeRomanization(candidateArtist);

  if (qNorm === cNorm) return 1.0;
  if (qNorm.includes(cNorm) || cNorm.includes(qNorm)) return 0.95;

  const qTokens = qNorm.split(" ").filter((t) => t.length > 2);
  const cTokens = cNorm.split(" ").filter((t) => t.length > 2);

  // Check alias map
  for (const [key, aliases] of Object.entries(ARTIST_ALIASES)) {
    const keyNorm = normalizeRomanization(key);
    const inQ = qNorm.includes(keyNorm) || aliases.some((a) => qNorm.includes(normalizeRomanization(a)));
    const inC = cNorm.includes(keyNorm) || aliases.some((a) => cNorm.includes(normalizeRomanization(a)));
    if (inQ && inC) {
      return 0.95;
    }
  }

  // Count token matches
  let matches = 0;
  for (const qt of qTokens) {
    if (cTokens.some((ct) => ct === qt || jaroWinkler(qt, ct) > 0.85)) {
      matches++;
    }
  }

  if (qTokens.length > 0 && matches > 0) {
    return Math.min(1.0, 0.4 + (matches / qTokens.length) * 0.6);
  }

  return Math.max(0.1, jaroWinkler(qNorm, cNorm));
}

/**
 * Searches JioSaavn API directly with raw query and 3s abort timeout
 */
async function searchSaavnDirect(query: string, timeoutMs = 3000): Promise<any[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
      query
    )}&_format=json&_marker=0&api_version=4&n=10`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": "L=english%2Ctamil%2Chindi%2Ctelugu%2Cmalayalam; gdpr_acceptance=true",
        "Accept-Language": "en-US,en;q=0.9,ta;q=0.8,hi;q=0.7",
      },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });

    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/**
 * Evaluates candidate against target query and computes weighted fuzzy score
 */
export function scoreCandidate(
  cand: any,
  cleanTitle: string,
  artist: string,
  film: string | null,
  targetDuration?: number
): AudioMatchCandidate | null {
  const moreInfo = cand.more_info || {};
  let streamUrl = "";
  if (moreInfo.encrypted_media_url) {
    streamUrl = decryptMediaUrl(moreInfo.encrypted_media_url);
  }
  if (!streamUrl && moreInfo.vlink) {
    streamUrl = moreInfo.vlink;
  }

  const candTitle = decodeHtmlEntities(cand.title || cand.song || "");
  const primaryArtists = Array.isArray(moreInfo.artistMap?.primary_artists)
    ? moreInfo.artistMap.primary_artists.map((a: any) => a.name).filter(Boolean).join(", ")
    : "";
  const candArtist = decodeHtmlEntities(primaryArtists || cand.subtitle || moreInfo.singers || moreInfo.music || "");
  const candAlbum = decodeHtmlEntities(moreInfo.album || cand.album || "");
  const candDuration = parseInt(moreInfo.duration || "0", 10);

  const rawImage = cand.image || cand.artwork_url || "";
  const artworkUrl = rawImage
    ? rawImage.replace("150x150", "500x500").replace("50x50", "500x500").replace("http://", "https://")
    : "";

  // 1. Title Similarity (Weight 0.45)
  const normClean = normalizeRomanization(cleanTitle);
  const normCandTitle = normalizeRomanization(candTitle);
  const titleRatio = tokenSetRatio(normClean, normCandTitle);
  const titleScore = titleRatio * 0.45;

  // 2. Artist Overlap (Weight 0.30)
  const artistOverlap = scoreArtistOverlap(artist, candArtist);
  const artistScore = artistOverlap * 0.30;

  // 3. Film / Album Match (Weight 0.10)
  let filmScore = 0.05; // neutral baseline
  if (film) {
    const filmRatio = tokenSetRatio(film, candAlbum);
    filmScore = filmRatio * 0.10;
  } else if (candAlbum) {
    // If query didn't have film, check if title or query contains album
    if (normClean.includes(normalizeRomanization(candAlbum))) {
      filmScore = 0.10;
    }
  }

  // 4. Duration Match (Weight 0.15)
  let durationScore = 0.08; // default when durations missing
  if (targetDuration && candDuration > 0) {
    const durDiff = Math.abs(targetDuration - candDuration);
    if (durDiff <= 5) {
      durationScore = 0.15; // full score for <= 5s
    } else if (durDiff <= 15) {
      durationScore = 0.15 - ((durDiff - 5) / 10) * 0.07; // 0.08 to 0.15 for <= 15s
    } else if (durDiff <= 30) {
      durationScore = 0.03;
    } else {
      durationScore = 0.0;
    }
  }

  // 5. Penalties for unwanted variants (cover, remix, karaoke, 8D, slowed, lofi) unless asked
  let penalties = 0;
  const isCoverOrRemix = /cover|remix|karaoke|slowed|lofi|8d|tribute|instrumental|reverb/i.test(candTitle);
  const queryWantedCover = /cover|remix|karaoke|slowed|lofi|8d|tribute|instrumental|reverb/i.test(cleanTitle);
  if (isCoverOrRemix && !queryWantedCover) {
    penalties += 0.25;
  }

  const totalScore = Math.max(0, Math.min(1.0, titleScore + artistScore + filmScore + durationScore - penalties));

  let rejectedBecause: string | null = null;
  if (!streamUrl) {
    rejectedBecause = "no_stream_url";
  } else if (totalScore < 0.72) {
    rejectedBecause = `score_too_low_${totalScore.toFixed(2)}_below_0.72`;
  }

  return {
    provider: "saavn",
    id: `saavn-${cand.id}`,
    title: candTitle,
    artists: candArtist,
    album: candAlbum,
    duration: candDuration,
    streamUrl,
    artworkUrl,
    score: parseFloat(totalScore.toFixed(3)),
    rejectedBecause,
    scoreBreakdown: {
      titleScore: parseFloat(titleScore.toFixed(3)),
      artistScore: parseFloat(artistScore.toFixed(3)),
      filmScore: parseFloat(filmScore.toFixed(3)),
      durationScore: parseFloat(durationScore.toFixed(3)),
      penalties: parseFloat(penalties.toFixed(3)),
    },
  };
}

/**
 * Core Matcher: searches parallel query variants and scores candidates
 */
export async function matchAudioSource(input: MatchInput): Promise<MatchResult> {
  const cacheKey = input.trackKey || `${input.title}__${input.artists || ""}`;
  const cached = trackMapCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS && cached.choice?.streamUrl) {
    return {
      query: input,
      cleanTitle: input.title,
      film: input.film || null,
      candidates: [cached.choice],
      finalChoice: cached.choice,
    };
  }

  const { cleanTitle, film: extractedFilm } = cleanTitleAndExtractFilm(input.title);
  const film = input.film || extractedFilm;
  const primaryArtist = (input.artists || "").split(/[,&/•]/)[0]?.trim() || "";

  // 4 Parallel Query Variants
  const queries: string[] = [];
  if (cleanTitle && primaryArtist) queries.push(`${cleanTitle} ${primaryArtist}`);
  if (cleanTitle && film) queries.push(`${cleanTitle} ${film}`);
  queries.push(cleanTitle);
  if (primaryArtist && cleanTitle) queries.push(`${primaryArtist} ${cleanTitle}`);

  const uniqueQueries = Array.from(new Set(queries.filter(Boolean)));

  // Run queries in parallel with 3s timeout
  const settled = await Promise.allSettled(
    uniqueQueries.map((q) => searchSaavnDirect(q, 3000))
  );

  const seenIds = new Set<string>();
  const candidates: AudioMatchCandidate[] = [];

  for (const res of settled) {
    if (res.status !== "fulfilled" || !Array.isArray(res.value)) continue;
    for (const cand of res.value) {
      if (seenIds.has(cand.id)) continue;
      seenIds.add(cand.id);

      const scored = scoreCandidate(
        cand,
        cleanTitle,
        input.artists || "",
        film,
        input.duration
      );
      if (scored) {
        candidates.push(scored);
      }
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Filter to accepted candidates
  const accepted = candidates.filter((c) => !c.rejectedBecause && c.score >= 0.72 && Boolean(c.streamUrl));
  const finalChoice = accepted[0] || null;

  // Persist mapping
  trackMapCache.set(cacheKey, {
    choice: finalChoice,
    timestamp: now,
  });

  return {
    query: input,
    cleanTitle,
    film,
    candidates,
    finalChoice,
  };
}
