import { IMusicSourceAdapter, SearchOptions } from "../types";
import { Track } from "@/types";
import { CURATED_TRACKS } from "../curated-data";

export class CuratedCatalogAdapter implements IMusicSourceAdapter {
  readonly id = "curated";
  readonly name = "InIsai Curated Originals";
  readonly description = "High-fidelity curated collection of Tamil, Classical, and Ambient tracks.";

  async search(query: string, options?: SearchOptions): Promise<Track[]> {
    const q = query.toLowerCase().trim();
    if (!q) return CURATED_TRACKS.slice(0, options?.limit || 20);

    return CURATED_TRACKS.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        (track.album && track.album.toLowerCase().includes(q)) ||
        (track.language && track.language.toLowerCase().includes(q)) ||
        (track.genre && track.genre.toLowerCase().includes(q))
    ).slice(0, options?.limit || 20);
  }

  async getTrack(id: string): Promise<Track | null> {
    const track = CURATED_TRACKS.find((t) => t.id === id);
    return track || null;
  }

  async getStreamUrl(track: Track): Promise<string> {
    return track.streamUrl;
  }

  async getLyrics(track: Track): Promise<string | null> {
    return track.syncedLyrics || track.plainLyrics || null;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
