import { Track, Shelf, SourceProviderId } from "@/types";

export interface ProviderCapabilities {
  search: boolean;
  browse: boolean;
  charts: boolean;
  related: boolean;
  stream: "iframe" | "audio" | "file";
  lyricsIds: boolean;
}

export interface ProviderSearchOptions {
  type?: "all" | "song" | "video" | "album" | "artist" | "playlist";
  limit?: number;
  language?: string;
}

export interface ProviderHealth {
  ok: boolean;
  latencyMs: number;
  message?: string;
  checkedAt?: string;
}

export interface SourceProvider {
  readonly id: SourceProviderId;
  readonly name: string;
  readonly description: string;
  readonly capabilities: ProviderCapabilities;

  search(q: string, opts?: ProviderSearchOptions, signal?: AbortSignal): Promise<Track[]>;
  suggest(q: string, signal?: AbortSignal): Promise<string[]>;
  browse(shelfId: string): Promise<Shelf>;
  related(track: Track): Promise<Track[]>;
  health(): Promise<ProviderHealth>;
}

