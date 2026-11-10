export type RepeatMode = "off" | "all" | "one";

export type SourceProviderId = "ytmusic" | "saavn" | "local";

export type EngineId = "youtube" | "audio";

export type AudioSourceType =
  | "ytmusic"
  | "youtube"
  | "saavn"
  | "public_api"
  | "curated"
  | "local"
  | "jamendo";

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

export interface LyricsWord {
  time: number;
  text: string;
}

export interface LyricsLine {
  time: number; // in seconds
  text: string;
  words?: LyricsWord[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration: number; // in seconds
  artworkUrl: string;
  streamUrl: string;
  sourceType: AudioSourceType;
  providerId?: SourceProviderId;
  sourceId: string;
  language?: string;
  genre?: string;
  syncedLyrics?: string; // Raw LRC format
  plainLyrics?: string;
  lyricsBrowseId?: string;
  bitrate?: string;
  isPlayable: boolean;
  addedAt?: string;
  youtubeVideoId?: string;
  sourceAttribution?: string;
  isExplicit?: boolean;
  releaseYear?: string;
  versions?: Track[]; // Collapsed alternative versions
}

export interface AlbumSummary {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  artworkUrl: string;
  year?: string;
  trackCount?: number;
  providerId: SourceProviderId;
}

export interface ArtistSummary {
  id: string;
  name: string;
  artworkUrl: string;
  subscribers?: string;
  providerId: SourceProviderId;
}

export interface PlaylistSummary {
  id: string;
  title: string;
  author?: string;
  artworkUrl: string;
  trackCount?: number;
  providerId: SourceProviderId;
}

export interface Shelf {
  id: string;
  title: string;
  subtitle?: string;
  items: Track[];
  albums?: AlbumSummary[];
  artists?: ArtistSummary[];
  playlists?: PlaylistSummary[];
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

export interface EngineCapabilities {
  eq: boolean;
  visualizer: boolean;
  crossfade: boolean;
  gapless: boolean;
  speed: boolean;
  backgroundOnMobile: boolean;
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
  preferAudioFallback?: boolean; // Resolve matching background audio when available
  autoplayRelated?: boolean; // Smart radio continuation when queue finishes
  statsForNerd?: boolean; // Technical telemetry overlay
  videoMode?: boolean; // Optional toggle in Now Playing when YT track active
}
