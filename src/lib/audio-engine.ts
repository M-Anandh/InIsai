import { Track, PlayerSettings } from "@/types";

export type AudioStateCallback = (state: {
  currentTime: number;
  duration: number;
  buffered: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}) => void;

export class AudioEngine {
  private static instance: AudioEngine;
  private audio: HTMLAudioElement | null = null;
  private onStateChange: AudioStateCallback | null = null;
  private onTrackEnded: (() => void) | null = null;
  private currentTrack: Track | null = null;
  private visualizerData: Uint8Array = new Uint8Array(32);

  public static readonly EQ_FREQUENCIES = [60, 230, 910, 4000, 14000];

  private constructor() {
    if (typeof window !== "undefined") {
      this.audio = new Audio();
      this.audio.preload = "auto";
      // Crucial: do NOT set crossOrigin = "anonymous" by default on the audio element,
      // as it causes cross-origin media without permissive CORS headers to be blocked
      // or silenced by the browser.
      this.setupAudioListeners();
    }
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public setCallbacks(
    onStateChange: AudioStateCallback,
    onTrackEnded: () => void
  ) {
    this.onStateChange = onStateChange;
    this.onTrackEnded = onTrackEnded;
  }

  private setupAudioListeners() {
    if (!this.audio) return;

    this.audio.addEventListener("timeupdate", () => {
      this.notifyState();
      this.updateMediaSessionPosition();
    });

    this.audio.addEventListener("durationchange", () => {
      this.notifyState();
      this.updateMediaSessionPosition();
    });

    this.audio.addEventListener("play", () => {
      this.notifyState();
      this.updateMediaSessionPlaybackState("playing");
    });

    this.audio.addEventListener("pause", () => {
      this.notifyState();
      this.updateMediaSessionPlaybackState("paused");
    });

    this.audio.addEventListener("ended", () => {
      if (this.onTrackEnded) {
        this.onTrackEnded();
      }
    });

    this.audio.addEventListener("waiting", () => {
      if (this.onStateChange && this.audio) {
        this.onStateChange({
          currentTime: this.audio.currentTime,
          duration: this.audio.duration || 0,
          buffered: this.getBufferedPercentage(),
          isPlaying: !this.audio.paused,
          isLoading: true,
          error: null,
        });
      }
    });

    this.audio.addEventListener("canplay", () => {
      if (this.onStateChange && this.audio) {
        this.onStateChange({
          currentTime: this.audio.currentTime,
          duration: this.audio.duration || 0,
          buffered: this.getBufferedPercentage(),
          isPlaying: !this.audio.paused,
          isLoading: false,
          error: null,
        });
      }
    });

    this.audio.addEventListener("error", (e) => {
      console.warn("Audio element playback error event:", e, this.audio?.error);
      if (this.onStateChange && this.audio) {
        const errorMsg =
          this.audio.error?.message ||
          "Could not stream this track. Trying next available source...";
        this.onStateChange({
          currentTime: 0,
          duration: 0,
          buffered: 0,
          isPlaying: false,
          isLoading: false,
          error: errorMsg,
        });
      }
    });
  }

  private notifyState() {
    if (!this.onStateChange || !this.audio) return;
    this.onStateChange({
      currentTime: this.audio.currentTime,
      duration: isNaN(this.audio.duration) ? 0 : this.audio.duration,
      buffered: this.getBufferedPercentage(),
      isPlaying: !this.audio.paused,
      isLoading: false,
      error: null,
    });
  }

  private getBufferedPercentage(): number {
    if (!this.audio || !this.audio.buffered || this.audio.buffered.length === 0)
      return 0;
    try {
      const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
      const duration = this.audio.duration;
      if (duration > 0) {
        return Math.min(100, (bufferedEnd / duration) * 100);
      }
    } catch {}
    return 0;
  }

  public async playTrack(track: Track, streamUrl: string, crossfadeSec: number = 0) {
    if (!this.audio) return;

    this.currentTrack = track;
    this.updateMediaSessionMetadata(track);

    const targetUrl = streamUrl || track.streamUrl;
    if (!targetUrl) {
      if (this.onStateChange) {
        this.onStateChange({
          currentTime: 0,
          duration: 0,
          buffered: 0,
          isPlaying: false,
          isLoading: false,
          error: "Stream URL is not available for this track.",
        });
      }
      return;
    }

    try {
      this.audio.src = targetUrl;
      this.audio.load();

      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      this.updateMediaSessionPlaybackState("playing");
    } catch (err: any) {
      console.warn("Audio playback play() interrupted or blocked by autoplay policy:", err);
      // Even if autoplay is blocked, ready the audio so user click immediately plays
    }
  }

  public play() {
    if (!this.audio) return;
    this.audio.play().catch((err) => {
      console.warn("User interaction required to resume audio:", err);
    });
    this.updateMediaSessionPlaybackState("playing");
  }

  public pause() {
    if (!this.audio) return;
    this.audio.pause();
    this.updateMediaSessionPlaybackState("paused");
  }

  public togglePlay() {
    if (!this.audio) return;
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  public seek(seconds: number) {
    if (!this.audio) return;
    this.audio.currentTime = Math.max(
      0,
      Math.min(seconds, this.audio.duration || 0)
    );
    this.updateMediaSessionPosition();
  }

  public setVolume(vol: number) {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, vol));
  }

  public setMuted(muted: boolean) {
    if (!this.audio) return;
    this.audio.muted = muted;
  }

  public setPlaybackRate(rate: number) {
    if (!this.audio) return;
    this.audio.playbackRate = Math.max(0.5, Math.min(2.5, rate));
  }

  public setEqualizer(settings: PlayerSettings) {
    // Volume & settings
  }

  public getVisualizerData(): Uint8Array | null {
    if (!this.audio || this.audio.paused) return null;

    // Generate responsive simulated dynamic visualizer frequencies synchronized with audio
    const time = this.audio.currentTime;
    for (let i = 0; i < this.visualizerData.length; i++) {
      const freq = Math.sin(time * 5 + i * 0.5) * 0.5 + 0.5;
      const beat = Math.sin(time * 8) > 0.7 ? 1.3 : 0.8;
      this.visualizerData[i] = Math.min(255, Math.floor(freq * 180 * beat + Math.random() * 40));
    }
    return this.visualizerData;
  }

  // Media Session API for Android & iOS Lock Screen & Background Playback
  private updateMediaSessionMetadata(track: Track) {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || "InIsai (இனிசை)",
        artwork: [
          { src: track.artworkUrl, sizes: "96x96", type: "image/jpeg" },
          { src: track.artworkUrl, sizes: "128x128", type: "image/jpeg" },
          { src: track.artworkUrl, sizes: "192x192", type: "image/jpeg" },
          { src: track.artworkUrl, sizes: "256x256", type: "image/jpeg" },
          { src: track.artworkUrl, sizes: "384x384", type: "image/jpeg" },
          { src: track.artworkUrl, sizes: "512x512", type: "image/jpeg" },
        ],
      });
    } catch (err) {
      console.warn("MediaSession metadata update error:", err);
    }
  }

  private updateMediaSessionPosition() {
    if (
      typeof window === "undefined" ||
      !("mediaSession" in navigator) ||
      !("setPositionState" in navigator.mediaSession) ||
      !this.audio
    )
      return;

    try {
      if (
        this.audio.duration &&
        !isNaN(this.audio.duration) &&
        this.audio.duration > 0
      ) {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration,
          playbackRate: this.audio.playbackRate,
          position: Math.min(this.audio.currentTime, this.audio.duration),
        });
      }
    } catch {}
  }

  public setupMediaSessionHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (time: number) => void;
  }) {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler("play", handlers.onPlay);
      navigator.mediaSession.setActionHandler("pause", handlers.onPause);
      navigator.mediaSession.setActionHandler("previoustrack", handlers.onPrev);
      navigator.mediaSession.setActionHandler("nexttrack", handlers.onNext);
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          handlers.onSeek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const skip = details.seekOffset || 10;
        if (this.audio) {
          handlers.onSeek(Math.max(0, this.audio.currentTime - skip));
        }
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const skip = details.seekOffset || 10;
        if (this.audio) {
          handlers.onSeek(this.audio.currentTime + skip);
        }
      });
      navigator.mediaSession.setActionHandler("stop", handlers.onPause);
    } catch (err) {
      console.warn("MediaSession action handler error:", err);
    }
  }

  private updateMediaSessionPlaybackState(state: "playing" | "paused" | "none") {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch {}
    }
  }
}

export const audioEngine = AudioEngine.getInstance();
