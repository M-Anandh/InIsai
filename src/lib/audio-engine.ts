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
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private bassNode: BiquadFilterNode | null = null;
  private trebleNode: BiquadFilterNode | null = null;
  private eqNodes: BiquadFilterNode[] = [];
  private analyserNode: AnalyserNode | null = null;

  private onStateChange: AudioStateCallback | null = null;
  private onTrackEnded: (() => void) | null = null;
  private currentTrack: Track | null = null;
  private isInitialized = false;

  public static readonly EQ_FREQUENCIES = [60, 230, 910, 4000, 14000];

  private constructor() {
    if (typeof window !== "undefined") {
      this.audio = new Audio();
      this.audio.preload = "auto";
      this.audio.crossOrigin = "anonymous";
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

  private initWebAudio() {
    if (this.isInitialized || !this.audio || typeof window === "undefined") return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);

      // Bass LowShelf (100 Hz)
      this.bassNode = this.audioContext.createBiquadFilter();
      this.bassNode.type = "lowshelf";
      this.bassNode.frequency.value = 100;
      this.bassNode.gain.value = 0;

      // 5-band Graphic Equalizer
      this.eqNodes = AudioEngine.EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.audioContext!.createBiquadFilter();
        if (idx === 0) {
          filter.type = "lowshelf";
        } else if (idx === AudioEngine.EQ_FREQUENCIES.length - 1) {
          filter.type = "highshelf";
        } else {
          filter.type = "peaking";
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Treble HighShelf (8000 Hz)
      this.trebleNode = this.audioContext.createBiquadFilter();
      this.trebleNode.type = "highshelf";
      this.trebleNode.frequency.value = 8000;
      this.trebleNode.gain.value = 0;

      // Master Gain
      this.gainNode = this.audioContext.createGain();

      // Analyser Node for Visualizer
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect Web Audio Graph
      let lastNode: AudioNode = this.sourceNode;

      lastNode.connect(this.bassNode);
      lastNode = this.bassNode;

      for (const eqNode of this.eqNodes) {
        lastNode.connect(eqNode);
        lastNode = eqNode;
      }

      lastNode.connect(this.trebleNode);
      lastNode = this.trebleNode;

      lastNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API initialization deferred/unavailable:", e);
    }
  }

  private setupAudioListeners() {
    if (!this.audio) return;

    this.audio.addEventListener("timeupdate", () => {
      this.notifyState();
    });

    this.audio.addEventListener("durationchange", () => {
      this.notifyState();
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

    this.audio.addEventListener("progress", () => {
      this.notifyState();
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

    this.audio.addEventListener("error", () => {
      if (this.onStateChange && this.audio) {
        const errorMsg =
          this.audio.error?.message || "Audio playback error occurred.";
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
    this.initWebAudio();

    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch {}
    }

    this.currentTrack = track;
    this.updateMediaSessionMetadata(track);

    if (crossfadeSec > 0 && !this.audio.paused && this.gainNode && this.audioContext) {
      // Smooth fade-out before switching track
      const now = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0.01, now + Math.min(crossfadeSec, 1.5));

      setTimeout(async () => {
        await this.loadAndPlay(streamUrl, crossfadeSec);
      }, Math.min(crossfadeSec, 1.5) * 1000);
    } else {
      await this.loadAndPlay(streamUrl, 0);
    }
  }

  private async loadAndPlay(streamUrl: string, crossfadeSec: number) {
    if (!this.audio) return;

    this.audio.src = streamUrl;
    this.audio.load();

    try {
      await this.audio.play();

      if (crossfadeSec > 0 && this.gainNode && this.audioContext) {
        const now = this.audioContext.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(0.01, now);
        this.gainNode.gain.linearRampToValueAtTime(1.0, now + Math.min(crossfadeSec, 2.0));
      }
    } catch (err: any) {
      console.warn("Audio play prevented or interrupted:", err);
    }
  }

  public play() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    this.audio?.play().catch(console.warn);
  }

  public pause() {
    this.audio?.pause();
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
    this.initWebAudio();

    // Bass
    if (this.bassNode) {
      this.bassNode.gain.value = settings.equalizerEnabled ? settings.bassBoost : 0;
    }
    // Treble
    if (this.trebleNode) {
      this.trebleNode.gain.value = settings.equalizerEnabled ? settings.trebleBoost : 0;
    }
    // 5 Bands
    this.eqNodes.forEach((node, idx) => {
      const val = settings.equalizerBands[idx] ?? 0;
      node.gain.value = settings.equalizerEnabled ? val : 0;
    });
  }

  public getVisualizerData(): Uint8Array | null {
    if (!this.analyserNode) return null;
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  // Media Session API Integration for mobile lock screen & background controls
  private updateMediaSessionMetadata(track: Track) {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || "InIsai (இனிசை)",
      artwork: [
        { src: track.artworkUrl, sizes: "96x96", type: "image/jpeg" },
        { src: track.artworkUrl, sizes: "128x128", type: "image/jpeg" },
        { src: track.artworkUrl, sizes: "192x192", type: "image/jpeg" },
        { src: track.artworkUrl, sizes: "512x512", type: "image/jpeg" },
      ],
    });
  }

  public setupMediaSessionHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (time: number) => void;
  }) {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

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
  }

  private updateMediaSessionPlaybackState(state: "playing" | "paused" | "none") {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }
}

export const audioEngine = AudioEngine.getInstance();
