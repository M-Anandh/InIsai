import { IMusicSourceAdapter, SearchOptions } from "../types";
import { Track } from "@/types";

export class JamendoAdapter implements IMusicSourceAdapter {
  readonly id = "jamendo";
  readonly name = "Jamendo Free Music";
  readonly description = "Legal Creative Commons licensed music streaming catalog.";
  private clientId = "563492ad";

  async search(query: string, options?: SearchOptions): Promise<Track[]> {
    try {
      const limit = options?.limit || 20;
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${this.clientId}&format=jsonpretty&limit=${limit}&namesearch=${encodeURIComponent(
        query
      )}&include=musicinfo&audioformat=mp32`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      if (!data.results || !Array.isArray(data.results)) return [];

      return data.results.map((item: any) => ({
        id: `jamendo-${item.id}`,
        title: item.name,
        artist: item.artist_name,
        album: item.album_name,
        duration: item.duration || 180,
        artworkUrl:
          item.album_image ||
          item.image ||
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
        streamUrl: item.audio,
        sourceType: "jamendo",
        sourceId: item.id.toString(),
        genre: item.musicinfo?.tags?.genres?.[0] || "Pop",
        isPlayable: Boolean(item.audio),
      }));
    } catch (error) {
      console.warn("Jamendo API search failed or offline:", error);
      return [];
    }
  }

  async getTrack(id: string): Promise<Track | null> {
    const rawId = id.replace("jamendo-", "");
    try {
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${this.clientId}&format=jsonpretty&id=${rawId}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      const item = data.results?.[0];
      if (!item) return null;

      return {
        id: `jamendo-${item.id}`,
        title: item.name,
        artist: item.artist_name,
        album: item.album_name,
        duration: item.duration || 180,
        artworkUrl:
          item.album_image ||
          item.image ||
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
        streamUrl: item.audio,
        sourceType: "jamendo",
        sourceId: item.id.toString(),
        isPlayable: Boolean(item.audio),
      };
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
