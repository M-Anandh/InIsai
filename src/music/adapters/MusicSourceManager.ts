import { IMusicSourceAdapter, SearchOptions } from "../types";
import { Track } from "@/types";
import { CuratedCatalogAdapter } from "./CuratedCatalogAdapter";
import { JamendoAdapter } from "./JamendoAdapter";
import { LocalMusicAdapter } from "./LocalMusicAdapter";

export class MusicSourceManager {
  private static instance: MusicSourceManager;
  private adapters: Map<string, IMusicSourceAdapter> = new Map();

  private constructor() {
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
    for (const adapter of this.adapters.values()) {
      try {
        if (await adapter.isAvailable()) {
          const tracks = await adapter.search(query, options);
          results.push(...tracks);
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
        return await adapter.getStreamUrl(track);
      } catch (err) {
        console.warn(`Error resolving stream for ${track.id}:`, err);
      }
    }
    return track.streamUrl;
  }

  public async resolveLyrics(track: Track): Promise<string | null> {
    if (track.syncedLyrics) return track.syncedLyrics;
    if (track.plainLyrics) return track.plainLyrics;

    const adapter = this.adapters.get(track.sourceType);
    if (adapter && adapter.getLyrics) {
      try {
        return await adapter.getLyrics(track);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const musicSourceManager = MusicSourceManager.getInstance();
