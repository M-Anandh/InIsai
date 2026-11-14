import { Track, EngineId, EngineCapabilities, PlayerSettings } from "@/types";
import { PlaybackEngine, EngineStateCallback } from "./types";
import { audioElementEngine } from "./AudioElementEngine";
import { youtubeIframeEngine } from "./YouTubeIframeEngine";
import { LocalProvider } from "@/music/providers/LocalProvider";

export class EngineCoordinator {
  private static instance: EngineCoordinator;
  private activeEngine: PlaybackEngine = audioElementEngine;
  private localProvider = new LocalProvider();
  private wakeLockSentinel: any = null;
  private lastPositionUpdateMs = 0;

  private onStateChange: EngineStateCallback | null = null;
  private onTrackEnded: (() => void) | null = null;
  private onFatalError: ((code: string | number, track: Track) => void) | null = null;

  private constructor() {
    this.wireEngine(audioElementEngine);
    this.wireEngine(youtubeIframeEngine);
  }

  public static getInstance(): EngineCoordinator {
    if (!EngineCoordinator.instance) {
      EngineCoordinator.instance = new EngineCoordinator();
    }
    return EngineCoordinator.instance;
  }

  private wireEngine(engine: PlaybackEngine) {
    engine.setCallbacks(
      (state) => {
        // Ignore state updates from inactive engines
        if (engine !== this.activeEngine) return;
        this.updateMediaSessionPosition(state.currentTime, state.duration);
        this.updateMediaSessionPlaybackState(state.isPlaying ? "playing" : "paused");
        if (this.onStateChange) this.onStateChange(state);
      },
      () => {
        if (engine !== this.activeEngine) return;
        if (this.onTrackEnded) this.onTrackEnded();
      },
      (code, track) => {
        if (engine !== this.activeEngine) return;
        if (this.onFatalError) this.onFatalError(code, track);
      }
    );
  }

  public setCallbacks(
    onStateChange: EngineStateCallback,
    onTrackEnded: () => void,
    onFatalError?: (code: string | number, track: Track) => void
  ) {
    this.onStateChange = onStateChange;
    this.onTrackEnded = onTrackEnded;
    if (onFatalError) this.onFatalError = onFatalError;
  }

  public getActiveEngineId(): EngineId {
    return this.activeEngine.id;
  }

  public getCapabilities(): EngineCapabilities {
    return this.activeEngine.capabilities;
  }

  public getVisualizerData(): Uint8Array | null {
    if (this.activeEngine.id === "audio" && this.activeEngine.getVisualizerData) {
      return this.activeEngine.getVisualizerData();
    }
    return null;
  }

  public prebufferNextTrack(nextTrack: Track | undefined) {
    if (!nextTrack) return;
    if (nextTrack.streamUrl && nextTrack.sourceType !== "youtube" && nextTrack.sourceType !== "ytmusic") {
      audioElementEngine.prebufferNext(nextTrack.streamUrl);
    }
  }

  public async playTrack(
    track: Track,
    settings?: PlayerSettings,
    startPosition?: number
  ): Promise<EngineId> {
    let targetEngine: PlaybackEngine = audioElementEngine;
    let resolvedUrl = track.streamUrl;

    // 1. Local track -> resolve IndexedDB blob URL & use AudioElementEngine
    if (track.sourceType === "local" || track.providerId === "local") {
      resolvedUrl = await this.localProvider.resolveBlobUrl(track);
      targetEngine = audioElementEngine;
    }
    // 2. YouTube Music / YouTube -> use YT IFrame API unless streamUrl was explicitly resolved via background audio fallback
    else if (
      (track.sourceType === "ytmusic" || track.sourceType === "youtube" || track.providerId === "ytmusic") &&
      !resolvedUrl
    ) {
      targetEngine = youtubeIframeEngine;
    } else if (resolvedUrl) {
      targetEngine = audioElementEngine;
    } else if (track.youtubeVideoId) {
      targetEngine = youtubeIframeEngine;
    }

    // Stop or pause the previously active engine if switching engines
    if (this.activeEngine !== targetEngine) {
      this.activeEngine.pause();
      if (this.activeEngine.id === "youtube") {
        youtubeIframeEngine.setVisualViewportRect(null);
      }
      this.activeEngine = targetEngine;
    }

    this.updateMediaSessionMetadata(track);
    if (targetEngine === (audioElementEngine as unknown)) {
      await audioElementEngine.playTrack(track, resolvedUrl, settings, startPosition);
    } else if (targetEngine === (youtubeIframeEngine as unknown)) {
      await youtubeIframeEngine.playTrack(track, resolvedUrl, settings, startPosition);
    } else {
      await targetEngine.playTrack(track, resolvedUrl, settings);
    }
    return targetEngine.id;
  }

  public play() {
    this.activeEngine.play();
  }

  public pause() {
    this.activeEngine.pause();
  }

  public isAudioElementPaused(): boolean {
    return audioElementEngine.isPaused();
  }

  public async playImmediateAudio(
    track: Track,
    streamUrl: string,
    settings?: PlayerSettings
  ): Promise<void> {
    if (this.activeEngine !== audioElementEngine) {
      this.activeEngine.pause();
      if (this.activeEngine.id === "youtube") {
        youtubeIframeEngine.setVisualViewportRect(null);
      }
      this.activeEngine = audioElementEngine;
    }
    this.updateMediaSessionMetadata(track);
    await audioElementEngine.playImmediateOnEnded(track, streamUrl, settings);
  }

  public seek(seconds: number) {
    this.activeEngine.seek(seconds);
  }

  public setVolume(vol: number) {
    audioElementEngine.setVolume(vol);
    youtubeIframeEngine.setVolume(vol);
  }

  public setMuted(muted: boolean) {
    audioElementEngine.setMuted(muted);
    youtubeIframeEngine.setMuted(muted);
  }

  public setPlaybackRate(rate: number) {
    audioElementEngine.setPlaybackRate(rate);
    youtubeIframeEngine.setPlaybackRate(rate);
  }

  public applySettings(settings: PlayerSettings) {
    audioElementEngine.applySettings(settings);
    youtubeIframeEngine.applySettings(settings);
  }

  public setYouTubeViewportRect(rect: { top: number; left: number; width: number; height: number } | null) {
    if (this.activeEngine.id === "youtube") {
      youtubeIframeEngine.setVisualViewportRect(rect);
    } else {
      youtubeIframeEngine.setVisualViewportRect(null);
    }
  }

  // WakeLock Management while FullScreen Player is visible
  public async setWakeLock(active: boolean) {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      if (active && !this.wakeLockSentinel) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        this.wakeLockSentinel.addEventListener("release", () => {
          this.wakeLockSentinel = null;
        });
      } else if (!active && this.wakeLockSentinel) {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
    } catch {}
  }

  // Unified Media Session Management (supports 96/256/512 artwork + full action handlers)
  public setupMediaSessionHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (time: number) => void;
  }) {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", handlers.onPlay],
      ["pause", handlers.onPause],
      ["previoustrack", handlers.onPrev],
      ["nexttrack", handlers.onNext],
      ["stop", handlers.onPause],
      [
        "seekto",
        (details) => {
          if (details.seekTime !== undefined) handlers.onSeek(details.seekTime);
        },
      ],
      [
        "seekbackward",
        (details) => {
          const skip = details.seekOffset || 10;
          const cur = this.activeEngine.getCurrentTime();
          handlers.onSeek(Math.max(0, cur - skip));
        },
      ],
      [
        "seekforward",
        (details) => {
          const skip = details.seekOffset || 10;
          const cur = this.activeEngine.getCurrentTime();
          const dur = this.activeEngine.getDuration();
          handlers.onSeek(dur > 0 ? Math.min(dur, cur + skip) : cur + skip);
        },
      ],
    ];

    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
    }
  }

  // Unified Media Session Management (supports 96/128/256/512 artwork + full action handlers)
  private updateMediaSessionMetadata(track: Track) {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    const art = track.artworkUrl || "/icons/icon-512.png";
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || "InIsai Music",
        artwork: [
          { src: art, sizes: "96x96", type: "image/jpeg" },
          { src: art, sizes: "128x128", type: "image/jpeg" },
          { src: art, sizes: "256x256", type: "image/jpeg" },
          { src: art, sizes: "512x512", type: "image/jpeg" },
        ],
      });
    } catch {}
  }

  private updateMediaSessionPosition(currentTime: number, duration: number) {
    if (
      typeof window === "undefined" ||
      !("mediaSession" in navigator) ||
      !("setPositionState" in navigator.mediaSession)
    )
      return;
    const now = Date.now();
    if (now - this.lastPositionUpdateMs < 950) return;
    this.lastPositionUpdateMs = now;
    try {
      if (duration > 0 && !isNaN(duration) && currentTime >= 0) {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: Math.min(currentTime, duration),
        });
      }
    } catch {}
  }

  private updateMediaSessionPlaybackState(state: "playing" | "paused" | "none") {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch {}
  }
}

export const engineCoordinator = EngineCoordinator.getInstance();

