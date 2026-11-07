import { IMusicSourceAdapter, SearchOptions } from "../types";
import { Track } from "@/types";

export class PublicCatalogAdapter implements IMusicSourceAdapter {
  readonly id = "public_api";
  readonly name = "InIsai Cloud & Tamil Hits";
  readonly description = "Instant streaming for Indian and global music catalogs.";

  async search(query: string, options?: SearchOptions): Promise<Track[]> {
    if (!query || !query.trim()) return [];

    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).slice(0, options?.limit || 25);
    } catch (err) {
      console.warn("Public catalog search failed:", err);
      return [];
    }
  }

  async getTrack(id: string): Promise<Track | null> {
    const rawId = id.replace("saavn-", "");
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(rawId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return (data.results || [])[0] || null;
    } catch {
      return null;
    }
  }

  async getStreamUrl(track: Track): Promise<string> {
    return track.streamUrl;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

