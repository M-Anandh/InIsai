import { Track, Shelf } from "@/types";
import { SourceProvider, ProviderSearchOptions, ProviderHealth } from "./types";
import { LocalMusicAdapter } from "../adapters/LocalMusicAdapter";

export class LocalProvider implements SourceProvider {
  public readonly id = "local" as const;
  public readonly name = "Device Local Files";
  public readonly description = "Offline MP3, FLAC, M4A, and WAV files stored directly on your device.";
  public readonly capabilities = {
    search: true,
    browse: true,
    charts: false,
    related: false,
    stream: "file" as const,
    lyricsIds: false,
  };

  private adapter = new LocalMusicAdapter();

  async search(q: string, opts?: ProviderSearchOptions): Promise<Track[]> {
    const items = await this.adapter.search(q, { limit: opts?.limit || 30 });
    return items.map((t) => ({ ...t, providerId: "local" as const }));
  }

  async suggest(q: string): Promise<string[]> {
    const items = await this.search(q, { limit: 5 });
    return items.map((t) => t.title);
  }

  async browse(shelfId: string): Promise<Shelf> {
    const tracks = await this.adapter.getStoredTracks();
    return {
      id: shelfId,
      title: "On This Device",
      items: tracks.map((t) => ({ ...t, providerId: "local" as const })),
    };
  }

  async related(): Promise<Track[]> {
    return [];
  }

  async health(): Promise<ProviderHealth> {
    const start = performance.now();
    const ok = await this.adapter.isAvailable();
    return {
      ok,
      latencyMs: Math.round(performance.now() - start),
      message: ok ? "IndexedDB offline file store ready" : "IndexedDB unavailable",
      checkedAt: new Date().toISOString(),
    };
  }

  async resolveBlobUrl(track: Track): Promise<string> {
    return this.adapter.getStreamUrl(track);
  }
}
