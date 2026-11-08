export type RepeatMode = "off" | "all" | "one";

export type AudioSourceType = "local" | "jamendo" | "curated" | "public_api";

export type PlaybackContextType =
  | "search"
  | "playlist"
  | "album"
  | "artist"
  | "home_recommendations"
  | "trending"
  | "liked"
  | "history"
  | "local"
  | "custom_queue";

export interface PlaybackContext {
  id: string;
  type: PlaybackContextType;
  title: string;
  trackIds?: string[];
}

export interface FolderImportStats {
  scanned: number;
  added: number;
  duplicates: number;
  errors: number;
}


export interface LyricsLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  artworkUrl: string;
  streamUrl: string;
  sourceType: AudioSourceType;
  sourceId: string;
  language?: string;
  genre?: string;
  syncedLyrics?: string; // Raw LRC format
  plainLyrics?: string;
  bitrate?: string;
  isPlayable: boolean;
  addedAt?: string;
}

export interface Playlist {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  artworkUrl?: string;
  isPublic?: boolean;
  tracks: Track[];
  trackCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  favoriteGenres?: string[];
  theme?: "dark" | "light" | "system";
  accentColor?: string;
  createdAt?: string;
}

export interface PlayerSettings {
  volume: number; // 0 to 1
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  crossfadeDuration: number; // seconds (0 to 12)
  playbackRate: number; // 0.5 to 2.0
  bassBoost: number; // -12 to 12 dB
  trebleBoost: number; // -12 to 12 dB
  equalizerBands: number[]; // 5 band values (-12 to 12 dB)
  equalizerEnabled: boolean;
  selectedEqPreset: string;
  sleepTimerMinutes: number | null; // null or minutes remaining
}

