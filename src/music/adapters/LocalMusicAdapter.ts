import { IMusicSourceAdapter, SearchOptions } from "../types";
import { Track } from "@/types";
import { get, set, del } from "idb-keyval";

const LOCAL_TRACKS_STORE_KEY = "inisai_local_tracks_catalog";
const LOCAL_AUDIO_BLOBS_PREFIX = "inisai_local_blob_";

export class LocalMusicAdapter implements IMusicSourceAdapter {
  readonly id = "local";
  readonly name = "Device Local Music";
  readonly description = "Audio files stored directly on your phone or computer.";

  async getStoredTracks(): Promise<Track[]> {
    if (typeof window === "undefined") return [];
    try {
      const tracks = await get<Track[]>(LOCAL_TRACKS_STORE_KEY);
      return tracks || [];
    } catch {
      return [];
    }
  }

  async saveTrack(track: Track, blob: Blob): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      // Store blob in IndexedDB
      await set(`${LOCAL_AUDIO_BLOBS_PREFIX}${track.id}`, blob);
      const existing = await this.getStoredTracks();
      const updated = [track, ...existing.filter((t) => t.id !== track.id)];
      await set(LOCAL_TRACKS_STORE_KEY, updated);
    } catch (e) {
      console.error("Failed to store local audio file:", e);
    }
  }

  async deleteTrack(trackId: string): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      await del(`${LOCAL_AUDIO_BLOBS_PREFIX}${trackId}`);
      const existing = await this.getStoredTracks();
      const updated = existing.filter((t) => t.id !== trackId);
      await set(LOCAL_TRACKS_STORE_KEY, updated);
    } catch (e) {
      console.error("Failed to delete local audio file:", e);
    }
  }

  async search(query: string, options?: SearchOptions): Promise<Track[]> {
    const tracks = await this.getStoredTracks();
    const q = query.toLowerCase().trim();
    if (!q) return tracks.slice(0, options?.limit || 50);

    return tracks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.album && t.album.toLowerCase().includes(q))
      )
      .slice(0, options?.limit || 50);
  }

  async getTrack(id: string): Promise<Track | null> {
    const tracks = await this.getStoredTracks();
    return tracks.find((t) => t.id === id) || null;
  }

  async getStreamUrl(track: Track): Promise<string> {
    if (typeof window === "undefined") return "";
    try {
      const blob = await get<Blob>(`${LOCAL_AUDIO_BLOBS_PREFIX}${track.id}`);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.warn("Could not retrieve blob from IndexedDB:", e);
    }
    return track.streamUrl;
  }

  async isAvailable(): Promise<boolean> {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  }
}
