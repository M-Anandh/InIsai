import dns from "node:dns";
import { Innertube } from "youtubei.js";
import { Track, AlbumSummary, ArtistSummary, PlaylistSummary, Shelf } from "@/types";
import { normalizeTrackSignature } from "./ProviderRegistry";
import { isTrackBlocked } from "@/config/blocklist";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore on runtimes without mutable DNS ordering
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

// Lightweight TTL LRU Cache in module scope
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class LRUCache {
  private map = new Map<string, CacheEntry<any>>();
  private maxEntries: number;

  constructor(maxEntries = 400) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    // Move to most-recently-used
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number) {
    if (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey) this.map.delete(oldestKey);
    }
    this.map.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

const cache = new LRUCache(500);
let ytClientPromise: Promise<Innertube> | null = null;

async function getClient(): Promise<Innertube> {
  if (!ytClientPromise) {
    ytClientPromise = Innertube.create({
      retrieve_player: false, // Metadata-only compliant mode — fast cold start
    }).catch((err) => {
      ytClientPromise = null;
      throw err;
    });
  }
  return ytClientPromise;
}

export function extractHighResArtwork(item: any, videoId?: string): string {
  const thumbs =
    item?.thumbnails ||
    item?.thumbnail?.contents ||
    item?.thumbnail ||
    [];
  const arr = Array.isArray(thumbs) ? thumbs : [];
  const raw = arr[arr.length - 1]?.url || arr[0]?.url || "";

  if (raw) {
    if (raw.includes("lh3.googleusercontent.com")) {
      return raw.replace(/=w\d+-h\d+[^&]*/i, "=w544-h544-l90-rj");
    }
    if (raw.startsWith("//")) return `https:${raw}`;
    return raw;
  }

  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  return "";
}

function parseDurationSec(dur: any): number {
  if (typeof dur === "number") return dur;
  if (dur?.seconds && typeof dur.seconds === "number") return dur.seconds;
  if (typeof dur === "string") {
    const parts = dur.split(":").map((p) => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  return 210;
}

function normalizeTrackItem(item: any, fallbackArtist = ""): Track | null {
  const videoId =
    item?.id ||
    item?.video_id ||
    item?.on_tap?.payload?.videoId ||
    item?.endpoint?.payload?.videoId;

  if (!videoId || typeof videoId !== "string") return null;

  const title =
    typeof item?.title === "string"
      ? item.title
      : item?.title?.text || item?.name || "Unknown Track";

  let artist = "";
  if (Array.isArray(item?.artists) && item.artists.length > 0) {
    artist = item.artists.map((a: any) => a.name).filter(Boolean).join(", ");
  } else if (Array.isArray(item?.authors) && item.authors.length > 0) {
    artist = item.authors.map((a: any) => a.name).filter(Boolean).join(", ");
  } else if (item?.author?.name) {
    artist = item.author.name;
  } else if (item?.subtitle?.text) {
    const parts = item.subtitle.text.split("•").map((s: string) => s.trim());
    artist = parts.length > 1 ? parts[1] : parts[0];
  }

  artist = (artist || fallbackArtist || "Music Artist").replace(/ - Topic$/i, "").trim();

  const artistId =
    item?.artists?.[0]?.channel_id ||
    item?.authors?.[0]?.channel_id ||
    undefined;

  const album = item?.album?.name || (typeof item?.album === "string" ? item.album : "") || "YouTube Music";
  const albumId = item?.album?.id || undefined;
  const duration = parseDurationSec(item?.duration);
  const artworkUrl = extractHighResArtwork(item, videoId);

  return {
    id: `yt-${videoId}`,
    title,
    artist,
    artistId,
    album,
    albumId,
    duration,
    artworkUrl,
    streamUrl: "",
    sourceType: "ytmusic",
    providerId: "ytmusic",
    sourceId: videoId,
    youtubeVideoId: videoId,
    sourceAttribution: "YouTube Music",
    isPlayable: true,
    bitrate: "YT Music IFrame",
  };
}

export function cleanSearchQueryNoise(q: string): string {
  return q
    .replace(/\b(mp3|song download|download|full song|video song|official audio|official video)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreTrackMatch(query: string, track: Track, itemType: string = "song"): number {
  const qLower = query.toLowerCase().trim();
  const qTokens = qLower.split(/[\s,+-]+/).filter((t) => t.length > 1);
  const titleLower = track.title.toLowerCase();
  const artistLower = track.artist.toLowerCase();
  const wantsSpecial = /cover|remix|slowed|lofi|8d|reverb|piano|instrumental|karaoke|tribute|live/i.test(qLower);

  let score = 0;

  // Prefer official song items, but also boost verified official music videos which are reliable embeds
  if (itemType === "song") score += 50;
  if (/official (music )?video/i.test(titleLower)) score += 65;
  if (/\(audio\)|\[audio\]|- topic/i.test(titleLower)) score -= 25;

  if (titleLower === qLower) score += 160;
  else if (titleLower.startsWith(qLower) || qLower.startsWith(titleLower)) score += 90;
  else if (titleLower.includes(qLower)) score += 60;

  if (artistLower.includes(qLower)) score += 100;

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

  if (!wantsSpecial) {
    if (/cover|tribute|karaoke|instrumental|slowed|lofi|8d audio|reverb|piano version|lyric video/i.test(titleLower)) {
      score -= 110;
    }
    if (/remix|mashup|edit/i.test(titleLower) && !/remix/i.test(qLower)) {
      score -= 45;
    }
  }

  return score;
}

export async function ytSuggest(query: string): Promise<string[]> {
  const clean = query.trim();
  if (!clean) return [];

  const cacheKey = `suggest:${clean.toLowerCase()}`;
  const cached = cache.get<string[]>(cacheKey);
  if (cached) return cached;

  try {
    const yt = await withTimeout(getClient(), 4500, null as unknown as Innertube);
    if (!yt) return [];
    const sections: any = await withTimeout(yt.music.getSearchSuggestions(clean), 3500, null);
    const list: string[] = [];

    if (Array.isArray(sections)) {
      for (const sec of sections) {
        for (const item of sec?.contents || []) {
          const text = item?.suggestion?.text || item?.title?.text || item?.name;
          if (text && typeof text === "string" && !list.includes(text)) {
            list.push(text);
          }
        }
      }
    }

    const final = list.slice(0, 8);
    cache.set(cacheKey, final, 300);
    return final;
  } catch {
    return [];
  }
}

export interface YtSearchPayload {
  topResult: Track | null;
  songs: Track[];
  videos: Track[];
  albums: AlbumSummary[];
  artists: ArtistSummary[];
  playlists: PlaylistSummary[];
  didYouMean?: string;
}

async function ytDataApiFallback(query: string): Promise<YtSearchPayload> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { topResult: null, songs: [], videos: [], albums: [], artists: [], playlists: [] };
  }
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      query + " audio"
    )}&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=15&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const songs: Track[] = (data.items || []).map((item: any) => ({
      id: `yt-${item.id?.videoId}`,
      title: item.snippet?.title || "YouTube Track",
      artist: (item.snippet?.channelTitle || "Artist").replace(/ - Topic$/i, ""),
      album: "YouTube Music",
      duration: 210,
      artworkUrl: item.snippet?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${item.id?.videoId}/hqdefault.jpg`,
      streamUrl: "",
      sourceType: "ytmusic",
      providerId: "ytmusic",
      sourceId: item.id?.videoId,
      youtubeVideoId: item.id?.videoId,
      sourceAttribution: "YouTube Music / Google LLC",
      isPlayable: true,
    }));
    return {
      topResult: songs[0] || null,
      songs,
      videos: [],
      albums: [],
      artists: [],
      playlists: [],
    };
  } catch {
    return { topResult: null, songs: [], videos: [], albums: [], artists: [], playlists: [] };
  }
}

export async function ytSearch(query: string, typeFilter: string = "all"): Promise<YtSearchPayload> {
  const clean = cleanSearchQueryNoise(query);
  if (!clean) {
    return { topResult: null, songs: [], videos: [], albums: [], artists: [], playlists: [] };
  }

  const cacheKey = `search:${typeFilter}:${clean.toLowerCase()}`;
  const cached = cache.get<YtSearchPayload>(cacheKey);
  if (cached) return cached;

  try {
    const yt = await withTimeout(getClient(), 5000, null as unknown as Innertube);
    if (!yt) return await ytDataApiFallback(clean);

    // For song-only batch lookups (collections, quick-picks), skip redundant general search
    const songOnly = typeFilter === "song";
    const [generalRes, songsRes] = await Promise.allSettled([
      songOnly ? Promise.resolve(null) : withTimeout(yt.music.search(clean), 5500, null),
      withTimeout(yt.music.search(clean, { type: "song" }), 5500, null),
    ]);

    const songCandidates: Array<{ track: Track; type: string }> = [];
    const videoCandidates: Track[] = [];
    const albums: AlbumSummary[] = [];
    const artists: ArtistSummary[] = [];
    const playlists: PlaylistSummary[] = [];
    let topResultCandidate: Track | null = null;

    if (songsRes.status === "fulfilled" && songsRes.value?.songs?.contents) {
      for (const item of songsRes.value.songs.contents) {
        const track = normalizeTrackItem(item);
        if (track) songCandidates.push({ track, type: "song" });
      }
    }

    if (generalRes.status === "fulfilled" && generalRes.value?.contents) {
      for (const section of generalRes.value.contents as any[]) {
        if (section.type === "MusicCardShelf") {
          const cardTrack = normalizeTrackItem(section);
          if (cardTrack) {
            topResultCandidate = cardTrack;
            songCandidates.push({ track: cardTrack, type: "song" });
          }
        }
        for (const item of section?.contents || []) {
          const itemType = item.item_type || "";
          if (itemType === "song") {
            const t = normalizeTrackItem(item);
            if (t) songCandidates.push({ track: t, type: "song" });
          } else if (itemType === "video") {
            const t = normalizeTrackItem(item);
            if (t) {
              videoCandidates.push(t);
              if (songCandidates.length < 5) songCandidates.push({ track: t, type: "video" });
            }
          } else if (itemType === "album" && item.id) {
            albums.push({
              id: item.id,
              title: item.title || "Album",
              artist: item.author?.name || item.artists?.map((a: any) => a.name).join(", ") || "Various Artists",
              artworkUrl: extractHighResArtwork(item),
              year: item.year,
              providerId: "ytmusic",
            });
          } else if (itemType === "artist" && item.id) {
            artists.push({
              id: item.id,
              name: item.name || item.title || "Artist",
              artworkUrl: extractHighResArtwork(item),
              subscribers: item.subscribers,
              providerId: "ytmusic",
            });
          } else if (itemType === "playlist" && item.id) {
            playlists.push({
              id: item.id,
              title: item.title || "Playlist",
              author: item.author?.name || "YouTube Music",
              artworkUrl: extractHighResArtwork(item),
              providerId: "ytmusic",
            });
          }
        }
      }
    }

    // Retry with shorter token subset if results are very weak
    if (songCandidates.length === 0 && clean.split(" ").length > 2) {
      const retryQuery = clean.split(" ").slice(0, 2).join(" ");
      try {
        const retrySongs: any = await withTimeout(
          yt.music.search(retryQuery, { type: "song" }),
          4000,
          null
        );
        for (const item of retrySongs?.songs?.contents || []) {
          const t = normalizeTrackItem(item);
          if (t) songCandidates.push({ track: t, type: "song" });
        }
      } catch {}
    }

    // Score, rank and collapse near-duplicate versions cleanly
    const scored = songCandidates
      .map((entry) => ({
        track: entry.track,
        score: scoreTrackMatch(clean, entry.track, entry.type),
      }))
      .sort((a, b) => b.score - a.score);

    const songs: Track[] = [];
    const seenIds = new Set<string>();
    const signatureGroups = new Map<string, Track>();

    for (const { track } of scored) {
      if (seenIds.has(track.id)) continue;
      if (isTrackBlocked(track)) continue;
      seenIds.add(track.id);

      const sig = normalizeTrackSignature(track.title, track.artist);
      const primary = signatureGroups.get(sig);
      if (primary) {
        const durDiff = Math.abs((primary.duration || 0) - (track.duration || 0));
        if (durDiff <= 5) {
          primary.versions = [...(primary.versions || []), track];
          continue;
        }
      }
      signatureGroups.set(sig, track);
      songs.push(track);
    }

    // Check if topResultCandidate is a cover/live whereas top scored song is official audio
    const topResult = songs[0] || topResultCandidate || null;

    const payload: YtSearchPayload = {
      topResult,
      songs: songs.slice(0, 25),
      videos: videoCandidates.slice(0, 12),
      albums: albums.slice(0, 10),
      artists: artists.slice(0, 8),
      playlists: playlists.slice(0, 10),
    };

    if (payload.songs.length === 0) {
      return await ytDataApiFallback(clean);
    }

    cache.set(cacheKey, payload, 900);
    return payload;
  } catch (err) {
    console.warn("ytSearch error, activating Data API v3 fallback:", err);
    return await ytDataApiFallback(clean);
  }
}

export async function ytRelated(videoId: string): Promise<Track[]> {
  if (!videoId) return [];
  const cacheKey = `related:${videoId}`;
  const cached = cache.get<Track[]>(cacheKey);
  if (cached) return cached;

  try {
    const yt = await withTimeout(getClient(), 4500, null as unknown as Innertube);
    if (!yt) return [];
    const upNext: any = await withTimeout(yt.music.getUpNext(videoId), 4500, null);
    const tracks: Track[] = [];
    for (const item of upNext?.contents || []) {
      const t = normalizeTrackItem(item);
      if (t && t.sourceId !== videoId) {
        tracks.push(t);
      }
    }
    cache.set(cacheKey, tracks, 1800);
    return tracks;
  } catch {
    return [];
  }
}

export async function ytHomeShelves(): Promise<Shelf[]> {
  const cacheKey = "home:shelves:v2";
  const cached = cache.get<Shelf[]>(cacheKey);
  if (cached) return cached;

  try {
    const yt = await withTimeout(getClient(), 5000, null as unknown as Innertube);
    if (!yt) return [];

    // Fetch real YouTube Music explore + regional & maestro discovery queries with bounded timeout
    const [exploreRes, tamilTrendRes, tamilNewRes, anirudhRes, ilaiyaraajaRes, arrRes, yuvanRes, globalRes] =
      await Promise.allSettled([
        withTimeout(yt.music.getExplore(), 5500, null),
        withTimeout(yt.music.search("top tamil songs trending hits 2026", { type: "song" }), 5500, null),
        withTimeout(yt.music.search("new tamil movie songs latest releases", { type: "song" }), 5500, null),
        withTimeout(yt.music.search("Anirudh Ravichander hit songs", { type: "song" }), 5500, null),
        withTimeout(yt.music.search("Ilaiyaraaja evergreen tamil hits", { type: "song" }), 5500, null),
        withTimeout(yt.music.search("A R Rahman tamil hits", { type: "song" }), 5500, null),
        withTimeout(yt.music.search("Yuvan Shankar Raja melody hits", { type: "song" }), 5500, null),
        withTimeout(yt.music.search("global top pop songs trending", { type: "song" }), 5500, null),
      ]);

    const extractSongs = (settled: PromiseSettledResult<any>, limit = 15): Track[] => {
      if (settled.status !== "fulfilled") return [];
      const list: Track[] = [];
      const seen = new Set<string>();
      for (const item of settled.value?.songs?.contents || []) {
        const t = normalizeTrackItem(item);
        if (t && !isTrackBlocked(t) && !seen.has(t.id)) {
          seen.add(t.id);
          list.push(t);
        }
      }
      return list.slice(0, limit);
    };

    const shelves: Shelf[] = [
      {
        id: "trending-tamil",
        title: "Trending Tamil",
        subtitle: "Top chartbusters & viral hits across YouTube Music",
        items: extractSongs(tamilTrendRes, 16),
      },
      {
        id: "new-releases-tamil",
        title: "New Releases (Tamil)",
        subtitle: "Fresh soundtracks & indie drops",
        items: extractSongs(tamilNewRes, 16),
      },
      {
        id: "anirudh-hits",
        title: "Anirudh Ravichander",
        subtitle: "Mass beats & chart-topping anthems",
        items: extractSongs(anirudhRes, 15),
      },
      {
        id: "ilaiyaraaja-classics",
        title: "Ilaiyaraaja",
        subtitle: "Timeless Maestro orchestrations",
        items: extractSongs(ilaiyaraajaRes, 15),
      },
      {
        id: "rahman-essentials",
        title: "A. R. Rahman",
        subtitle: "Isai Puyal's iconic compositions",
        items: extractSongs(arrRes, 15),
      },
      {
        id: "yuvan-feel",
        title: "Yuvan Shankar Raja",
        subtitle: "Soulful melodies & late-night vibes",
        items: extractSongs(yuvanRes, 15),
      },
      {
        id: "global-trending",
        title: "Global Chartbusters",
        subtitle: "English & worldwide hits",
        items: extractSongs(globalRes, 15),
      },
    ];

    if (exploreRes.status === "fulfilled" && exploreRes.value?.sections) {
      for (const sec of exploreRes.value.sections as any[]) {
        const title = sec?.header?.title?.text || "";
        if (!title || /episode/i.test(title)) continue;
        const tracks: Track[] = [];
        for (const item of sec?.contents || []) {
          const t = normalizeTrackItem(item);
          if (t && !isTrackBlocked(t)) tracks.push(t);
        }
        if (tracks.length > 0) {
          shelves.push({
            id: `yt-explore-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            title,
            items: tracks,
          });
        }
      }
    }

    const nonEmpty = shelves.filter((s) => s.items.length > 0);
    // Do not poison 30-min cache when upstream timeouts yield only partial shelves
    if (nonEmpty.length >= 4) {
      cache.set(cacheKey, nonEmpty, 1800);
    } else if (nonEmpty.length > 0) {
      cache.set(cacheKey, nonEmpty, 45);
    }
    return nonEmpty;
  } catch (err) {
    console.warn("ytHomeShelves failure:", err);
    return [];
  }
}

export async function ytArtistDetails(channelId: string) {
  const cacheKey = `artist:${channelId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const yt = await withTimeout(getClient(), 4500, null as unknown as Innertube);
    if (!yt) return null;
    const artist: any = await withTimeout(yt.music.getArtist(channelId), 6000, null);
    if (!artist) return null;
    const name = artist?.header?.title?.text || "Artist";
    const description = artist?.header?.description?.text || "";
    const artworkUrl = extractHighResArtwork(artist?.header);

    const songs: Track[] = [];
    const albums: AlbumSummary[] = [];
    const relatedArtists: ArtistSummary[] = [];

    for (const sec of artist?.sections || []) {
      const secTitle = (sec?.header?.title?.text || "").toLowerCase();
      for (const item of sec?.contents || []) {
        if (item.item_type === "song" || item.item_type === "video") {
          const t = normalizeTrackItem(item, name);
          if (t) songs.push(t);
        } else if ((item.item_type === "album" || secTitle.includes("album") || secTitle.includes("single")) && item.id) {
          albums.push({
            id: item.id,
            title: item.title || "Album",
            artist: name,
            artistId: channelId,
            artworkUrl: extractHighResArtwork(item),
            year: item.year,
            providerId: "ytmusic",
          });
        } else if ((item.item_type === "artist" || secTitle.includes("fans")) && item.id) {
          relatedArtists.push({
            id: item.id,
            name: item.name || item.title || "Artist",
            artworkUrl: extractHighResArtwork(item),
            subscribers: item.subscribers,
            providerId: "ytmusic",
          });
        }
      }
    }

    // Ensure Top Songs loaded cleanly even if artist landing collapsed them
    if (songs.length === 0) {
      const searchFallback = await ytSearch(name, "song");
      songs.push(...searchFallback.songs.slice(0, 15));
    }

    const result = { id: channelId, name, description, artworkUrl, songs, albums, relatedArtists };
    cache.set(cacheKey, result, 1800);
    return result;
  } catch (err) {
    console.warn("ytArtistDetails error:", err);
    return null;
  }
}

export async function ytAlbumDetails(albumId: string) {
  const cacheKey = `album:${albumId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const yt = await withTimeout(getClient(), 4500, null as unknown as Innertube);
    if (!yt) return null;
    const album: any = await withTimeout(yt.music.getAlbum(albumId), 6000, null);
    if (!album) return null;
    const title = album?.header?.title?.text || "Album";
    const artist = album?.header?.subtitle?.text || "Artist";
    const artworkUrl = extractHighResArtwork(album?.header);
    const tracks: Track[] = [];

    for (const item of album?.contents || []) {
      const t = normalizeTrackItem(item, artist);
      if (t) {
        if (!t.artworkUrl) t.artworkUrl = artworkUrl;
        t.album = title;
        t.albumId = albumId;
        tracks.push(t);
      }
    }

    const result = { id: albumId, title, artist, artworkUrl, tracks };
    cache.set(cacheKey, result, 3600);
    return result;
  } catch (err) {
    console.warn("ytAlbumDetails error:", err);
    return null;
  }
}

export async function ytPlaylistDetails(playlistId: string) {
  const cacheKey = `playlist:${playlistId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const yt = await withTimeout(getClient(), 4500, null as unknown as Innertube);
    if (!yt) return null;
    const pl: any = await withTimeout(yt.music.getPlaylist(playlistId), 6000, null);
    if (!pl) return null;
    const title = pl?.header?.title?.text || "Playlist";
    const author = pl?.header?.subtitle?.text || "YouTube Music";
    const artworkUrl = extractHighResArtwork(pl?.header);
    const tracks: Track[] = [];

    for (const item of pl?.contents || pl?.items || []) {
      const t = normalizeTrackItem(item);
      if (t) tracks.push(t);
    }

    const result = { id: playlistId, title, author, artworkUrl, tracks };
    cache.set(cacheKey, result, 1800);
    return result;
  } catch (err) {
    console.warn("ytPlaylistDetails error:", err);
    return null;
  }
}

export async function ytLyrics(videoId: string): Promise<string | null> {
  if (!videoId) return null;
  const cacheKey = `lyrics:${videoId}`;
  const cached = cache.get<string | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    const yt = await withTimeout(getClient(), 4000, null as unknown as Innertube);
    if (!yt) return null;
    const res: any = await withTimeout(yt.music.getLyrics(videoId), 4500, null);
    const text = res?.description?.text || null;
    if (text) cache.set(cacheKey, text, 3600);
    return text;
  } catch {
    return null;
  }
}
