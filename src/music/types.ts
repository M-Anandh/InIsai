import { Track } from "@/types";

export interface SearchOptions {
  type?: "all" | "track" | "artist" | "album";
  limit?: number;
  offset?: number;
}

export interface IMusicSourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  
  search(query: string, options?: SearchOptions): Promise<Track[]>;
  getTrack(id: string): Promise<Track | null>;
  getStreamUrl(track: Track): Promise<string>;
  getLyrics?(track: Track): Promise<string | null>;
  isAvailable(): Promise<boolean>;
}

