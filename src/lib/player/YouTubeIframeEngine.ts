import { Track, EngineCapabilities, PlayerSettings } from "@/types";
import { PlaybackEngine, EngineStateCallback } from "./types";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export class YouTubeIframeEngine implements PlaybackEngine {
  public readonly id = "youtube" as const;
  public readonly capabilities: EngineCapabilities = {
    eq: false,
    visualizer: false,
    crossfade: false,
    gapless: false,
    speed: true,
    backgroundOnMobile: false,
  };

  private static instance: YouTubeIframeEngine;
  private player: any = null;
  private apiPromise: Promise<void> | null = null;
  private isPlayerReady = false;
  private pendingVideoId: string | null = null;
  private pendingTrack: Track | null = null;
  private pendingSettings: PlayerSettings | null = null;
  private currentTrack: Track | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isPlayingState = false;
  private playbackStartMs = 0;

  private onStateChange: EngineStateCallback | null = null;
  private onTrackEnded: (() => void) | null = null;
  private onFatalError: ((code: string | number, track: Track) => void) | null = null;

  private constructor() {}

  public static getInstance(): YouTubeIframeEngine {
    if (!YouTubeIframeEngine.instance) {
      YouTubeIframeEngine.instance = new YouTubeIframeEngine();
    }
    return YouTubeIframeEngine.instance;
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

  private ensureHostElement(): HTMLElement | null {
    if (typeof document === "undefined") return null;
    let host = document.getElementById("inisai-yt-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "inisai-yt-host";
      // Must NOT be display:none so browsers allow YT IFrame playback to continue
      host.style.cssText =
        "position:fixed;bottom:0;right:0;width:240px;height:135px;opacity:0.001;pointer-events:none;z-index:-10;overflow:hidden;border-radius:16px;";
      const inner = document.createElement("div");
      inner.id = "inisai-yt-player";
      host.appendChild(inner);
      document.body.appendChild(host);
    }
    return host;
  }

  /**
   * Moves the single persistent YT player visually onto a slot rect (for optional Video Mode)
   * or returns it invisibly to the background host without unmounting or interrupting audio.
   */
  public setVisualViewportRect(rect: { top: number; left: number; width: number; height: number } | null) {
    const host = this.ensureHostElement();
    if (!host) return;
    if (rect && rect.width > 0 && rect.height > 0) {
      host.style.top = `${Math.round(rect.top)}px`;
      host.style.left = `${Math.round(rect.left)}px`;
      host.style.bottom = "auto";
      host.style.right = "auto";
      host.style.width = `${Math.round(rect.width)}px`;
      host.style.height = `${Math.round(rect.height)}px`;
      host.style.opacity = "1";
      host.style.pointerEvents = "auto";
      host.style.zIndex = "60";
    } else {
      host.style.top = "auto";
      host.style.left = "auto";
      host.style.bottom = "0px";
      host.style.right = "0px";
      host.style.width = "240px";
      host.style.height = "135px";
      host.style.opacity = "0.001";
      host.style.pointerEvents = "none";
      host.style.zIndex = "-10";
    }
  }

  private loadYouTubeIframeAPI(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (this.apiPromise) return this.apiPromise;

    this.apiPromise = new Promise<void>((resolve) => {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        resolve();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
      }
    });

    return this.apiPromise;
  }

  private async ensurePlayer(initialVideoId: string): Promise<void> {
    if (this.player && this.isPlayerReady) return;
    this.ensureHostElement();
    await this.loadYouTubeIframeAPI();

    if (this.player) return;

    await new Promise<void>((resolve) => {
      this.player = new window.YT.Player("inisai-yt-player", {
        width: "100%",
        height: "100%",
        videoId: initialVideoId,
        host: "https://www.youtube.com",
        playerVars: {
          autoplay: 1,
          controls: 1,
          enablejsapi: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            this.isPlayerReady = true;
            if (this.pendingSettings) {
              this.applySettings(this.pendingSettings);
            }
            if (this.pendingVideoId) {
              const vid = this.pendingVideoId;
              this.pendingVideoId = null;
              this.player.loadVideoById(vid);
            }
            resolve();
          },
          onStateChange: (event: any) => this.handleYTStateChange(event),
          onError: (event: any) => this.handleYTError(event),
        },
      });
    });
  }

  private handleYTStateChange(event: any) {
    const YTState = window.YT?.PlayerState;
    if (!YTState || !this.player) return;

    if (event.data === YTState.PLAYING) {
      this.isPlayingState = true;
      this.startPolling();
      this.emitCurrentState(false);
    } else if (event.data === YTState.PAUSED) {
      this.isPlayingState = false;
      this.stopPolling();
      this.emitCurrentState(false);
    } else if (event.data === YTState.BUFFERING) {
      this.emitCurrentState(true);
    } else if (event.data === YTState.ENDED) {
      this.isPlayingState = false;
      this.stopPolling();
      if (this.onTrackEnded) this.onTrackEnded();
    }
  }

  private handleYTError(event: any) {
    const code = event?.data ?? "YT_ERR";
    console.warn("YouTubeIframeEngine error code:", code, "for video:", this.currentTrack?.youtubeVideoId);
    this.isPlayingState = false;
    this.stopPolling();
    if (this.onStateChange) {
      this.onStateChange({
        currentTime: 0,
        duration: this.currentTrack?.duration || 0,
        buffered: 0,
        isPlaying: false,
        isLoading: false,
        error: `YouTube stream unavailable (Code ${code}). Trying alternate version...`,
        engineId: "youtube",
      });
    }
    if (this.onFatalError && this.currentTrack) {
      this.onFatalError(code, this.currentTrack);
    }
  }

  private startPolling() {
    this.stopPolling();
    // Poll at ~10 Hz (100ms) for smooth progress & synced lyrics
    this.pollInterval = setInterval(() => {
      if (this.isPlayingState && this.player && this.isPlayerReady) {
        this.emitCurrentState(false);
      }
    }, 100);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private emitCurrentState(isLoading: boolean) {
    if (!this.onStateChange || !this.player || !this.isPlayerReady) return;
    try {
      const currentTime = typeof this.player.getCurrentTime === "function" ? this.player.getCurrentTime() : 0;
      const ytDuration = typeof this.player.getDuration === "function" ? this.player.getDuration() : 0;
      const duration = ytDuration > 0 ? ytDuration : this.currentTrack?.duration || 0;
      const loadedFrac =
        typeof this.player.getVideoLoadedFraction === "function"
          ? this.player.getVideoLoadedFraction()
          : 0;
      const quality =
        typeof this.player.getPlaybackQuality === "function"
          ? this.player.getPlaybackQuality()
          : undefined;

      this.onStateChange({
        currentTime: isNaN(currentTime) ? 0 : currentTime,
        duration: isNaN(duration) ? 0 : duration,
        buffered: Math.min(100, Math.round(loadedFrac * 100)),
        isPlaying: this.isPlayingState,
        isLoading,
        error: null,
        engineId: "youtube",
        videoQuality: quality,
        latencyMs: this.playbackStartMs > 0 ? Math.max(0, Date.now() - this.playbackStartMs) : undefined,
      });
    } catch {}
  }

  public async playTrack(track: Track, _streamUrl?: string, settings?: PlayerSettings): Promise<void> {
    const videoId = track.youtubeVideoId || track.sourceId;
    this.currentTrack = track;
    this.playbackStartMs = Date.now();
    if (settings) this.pendingSettings = settings;

    if (!videoId) {
      if (this.onFatalError) this.onFatalError("MISSING_VIDEO_ID", track);
      return;
    }

    if (this.onStateChange) {
      this.onStateChange({
        currentTime: 0,
        duration: track.duration || 0,
        buffered: 0,
        isPlaying: false,
        isLoading: true,
        error: null,
        engineId: "youtube",
      });
    }

    if (!this.player || !this.isPlayerReady) {
      this.pendingVideoId = videoId;
      this.pendingTrack = track;
      await this.ensurePlayer(videoId);
    } else {
      if (settings) this.applySettings(settings);
      this.player.loadVideoById({ videoId, startSeconds: 0 });
    }
  }

  public play() {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.playVideo();
      } catch {}
    }
  }

  public pause() {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.pauseVideo();
      } catch {}
    }
    this.isPlayingState = false;
    this.stopPolling();
  }

  public seek(seconds: number) {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.seekTo(Math.max(0, seconds), true);
        this.emitCurrentState(false);
      } catch {}
    }
  }

  public setVolume(vol: number) {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.setVolume(Math.round(Math.max(0, Math.min(1, vol)) * 100));
      } catch {}
    }
  }

  public setMuted(muted: boolean) {
    if (this.player && this.isPlayerReady) {
      try {
        if (muted) this.player.mute();
        else this.player.unMute();
      } catch {}
    }
  }

  public setPlaybackRate(rate: number) {
    if (this.player && this.isPlayerReady) {
      try {
        const availableRates: number[] =
          typeof this.player.getAvailablePlaybackRates === "function"
            ? this.player.getAvailablePlaybackRates()
            : [0.5, 0.75, 1, 1.25, 1.5, 2];
        const closest = availableRates.reduce((prev, curr) =>
          Math.abs(curr - rate) < Math.abs(prev - rate) ? curr : prev
        );
        this.player.setPlaybackRate(closest);
      } catch {}
    }
  }

  public applySettings(settings: PlayerSettings) {
    this.setVolume(settings.volume);
    this.setMuted(settings.isMuted);
    this.setPlaybackRate(settings.playbackRate);
  }

  public getCurrentTime(): number {
    if (this.player && this.isPlayerReady) {
      try {
        return this.player.getCurrentTime() || 0;
      } catch {}
    }
    return 0;
  }

  public getDuration(): number {
    if (this.player && this.isPlayerReady) {
      try {
        return this.player.getDuration() || this.currentTrack?.duration || 0;
      } catch {}
    }
    return this.currentTrack?.duration || 0;
  }

  public stop() {
    this.stopPolling();
    this.isPlayingState = false;
    if (this.player && this.isPlayerReady) {
      try {
        this.player.stopVideo();
      } catch {}
    }
    this.setVisualViewportRect(null);
  }
}

export const youtubeIframeEngine = YouTubeIframeEngine.getInstance();

