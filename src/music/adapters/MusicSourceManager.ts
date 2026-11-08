import { IMusicSourceAdapter, SearchOptions } from "../types";
import { Track } from "@/types";
import { CuratedCatalogAdapter } from "./CuratedCatalogAdapter";
import { PublicCatalogAdapter } from "./PublicCatalogAdapter";
import { JamendoAdapter } from "./JamendoAdapter";
import { LocalMusicAdapter } from "./LocalMusicAdapter";

export class MusicSourceManager {
  private static instance: MusicSourceManager;
  private adapters: Map<string, IMusicSourceAdapter> = new Map();

  private constructor() {
    this.registerAdapter(new PublicCatalogAdapter());
    this.registerAdapter(new CuratedCatalogAdapter());
    this.registerAdapter(new JamendoAdapter());
    this.registerAdapter(new LocalMusicAdapter());
  }

  public static getInstance(): MusicSourceManager {
    if (!MusicSourceManager.instance) {
      MusicSourceManager.instance = new MusicSourceManager();
    }
    return MusicSourceManager.instance;
  }

  public registerAdapter(adapter: IMusicSourceAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: string): IMusicSourceAdapter | undefined {
    return this.adapters.get(id);
  }

  public getLocalAdapter(): LocalMusicAdapter {
    return this.adapters.get("local") as LocalMusicAdapter;
  }

  public async searchAll(query: string, options?: SearchOptions): Promise<Track[]> {
    const results: Track[] = [];
    const seenIds = new Set<string>();

    for (const adapter of this.adapters.values()) {
      try {
        if (await adapter.isAvailable()) {
          const tracks = await adapter.search(query, options);
          for (const t of tracks) {
            if (!seenIds.has(t.id)) {
              seenIds.add(t.id);
              results.push(t);
            }
          }
        }
      } catch (err) {
        console.warn(`Error searching in adapter ${adapter.id}:`, err);
      }
    }
    return results;
  }

  public async resolveStreamUrl(track: Track): Promise<string> {
    const adapter = this.adapters.get(track.sourceType);
    if (adapter) {
      try {
        const resolved = await adapter.getStreamUrl(track);
        if (resolved) return resolved;
      } catch (err) {
        console.warn(`Error resolving stream for ${track.id}:`, err);
      }
    }

    if (track.streamUrl) return track.streamUrl;

    // Automatic MP3/AAC audio fallback: If track has no stream URL (e.g. from YouTube bridge),
    // search high-fidelity catalog for exact song + artist match so it plays natively as pure audio!
    try {
      const cleanTitle = track.title
        .replace(/\(Official.*?\)/gi, "")
        .replace(/\[Official.*?\]/gi, "")
        .replace(/\(Audio\)/gi, "")
        .replace(/\(Video\)/gi, "")
        .replace(/\(Lyrics\)/gi, "")
        .trim();
      const query = `${cleanTitle} ${track.artist}`.trim();
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const match = (data.results || []).find((r: Track) => Boolean(r.streamUrl));
        if (match && match.streamUrl) {
          track.streamUrl = match.streamUrl;
          if (!track.artworkUrl || track.artworkUrl.includes("ytimg")) {
            track.artworkUrl = match.artworkUrl;
          }
          return match.streamUrl;
        }
      }
    } catch (err) {
      console.warn("Failed resolving fallback audio stream:", err);
    }

    return track.streamUrl || "";
  }

  public async resolveLyrics(track: Track): Promise<string | null> {
    if (track.syncedLyrics) return track.syncedLyrics;
    if (track.plainLyrics) return track.plainLyrics;

    // Check adapter lyrics
    const adapter = this.adapters.get(track.sourceType);
    if (adapter && adapter.getLyrics) {
      try {
        const lyr = await adapter.getLyrics(track);
        if (lyr) return lyr;
      } catch {}
    }

    // Live search on LRCLIB API
    try {
      const res = await fetch(
        `/api/music/lyrics?track=${encodeURIComponent(
          track.title
        )}&artist=${encodeURIComponent(track.artist)}`
      );
      if (res.ok) {
        const data = await res.json();
        return data.syncedLyrics || data.plainLyrics || null;
      }
    } catch (e) {
      console.warn("Failed resolving lyrics via API:", e);
    }

    return null;
  }
}

export const musicSourceManager = MusicSourceManager.getInstance();
