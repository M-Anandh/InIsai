import { Track, EngineId, EngineCapabilities, PlayerSettings } from "@/types";

export interface EnginePlaybackState {
  currentTime: number;
  duration: number;
  buffered: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  engineId: EngineId;
  videoQuality?: string;
  latencyMs?: number;
}

export type EngineStateCallback = (state: EnginePlaybackState) => void;

export interface PlaybackEngine {
  readonly id: EngineId;
  readonly capabilities: EngineCapabilities;

  setCallbacks(
    onStateChange: EngineStateCallback,
    onTrackEnded: () => void,
    onFatalError?: (errorCode: string | number, track: Track) => void
  ): void;

  playTrack(track: Track, streamUrl?: string, settings?: PlayerSettings): Promise<void>;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void; // 0 to 1
  setMuted(muted: boolean): void;
  setPlaybackRate(rate: number): void;
  applySettings?(settings: PlayerSettings): void;
  getCurrentTime(): number;
  getDuration(): number;
  getVisualizerData?(): Uint8Array | null;
  stop(): void;
}
