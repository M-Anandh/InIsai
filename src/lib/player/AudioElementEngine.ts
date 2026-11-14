import { Track, EngineCapabilities, PlayerSettings } from "@/types";
import { PlaybackEngine, EngineStateCallback } from "./types";

export const EQ_FREQUENCIES = [60, 230, 910, 4000, 14000];
export const PERSISTENT_AUDIO_ELEMENT_ID = "inisai-persistent-audio";

export function isMobileOrIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPhone|iPad|iPod|Android|Mobile/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export class AudioElementEngine implements PlaybackEngine {
  public readonly id = "audio" as const;
  public readonly capabilities: EngineCapabilities = {
    eq: true,
    visualizer: true,
    crossfade: false,
    gapless: true,
    speed: true,
    backgroundOnMobile: true,
  };

  private static instance: AudioElementEngine;
  private audioEl: HTMLAudioElement | null = null;
  private attachedElements = new WeakSet<HTMLAudioElement>();

  // Web Audio DSP graph (desktop only for CORS-safe local blobs — never routed on mobile/iOS)
  private audioCtx: AudioContext | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private connectedElements = new WeakSet<HTMLAudioElement>();
  private dspBypassed = false;
  private visualizerBuffer: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(64));

  private onStateChange: EngineStateCallback | null = null;
  private onTrackEnded: (() => void) | null = null;
  private onFatalError: ((code: string | number, track: Track) => void) | null = null;
  private currentTrack: Track | null = null;
  private isUnlocked = false;
  private targetVolume = 0.85;
  private isMutedState = false;
  private playbackStartMs = 0;

  private constructor() {
    if (typeof window !== "undefined") {
      const mobile = isMobileOrIOS();
      if (mobile) {
        this.capabilities.eq = false;
        this.capabilities.visualizer = false;
        this.dspBypassed = true;
      }
      this.setupUnlockListener();
    }
  }

  public static getInstance(): AudioElementEngine {
    if (!AudioElementEngine.instance) {
      AudioElementEngine.instance = new AudioElementEngine();
    }
    return AudioElementEngine.instance;
  }

  /**
   * Bind the single persistent DOM <audio> element mounted by PlayerProvider.
   * Reusing a single DOM <audio> element preserves iOS/Android background playback session.
   */
  public bindDomElement(el: HTMLAudioElement | null) {
    if (!el) return;
    el.preload = "auto";
    (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    el.setAttribute("playsinline", "");
    this.audioEl = el;
    if (!this.attachedElements.has(el)) {
      this.attachElementListeners(el);
      this.attachedElements.add(el);
    }
  }

  private getOrCreateAudio(): HTMLAudioElement | null {
    if (this.audioEl) return this.audioEl;
    if (typeof document === "undefined") return null;

    const existing = document.getElementById(PERSISTENT_AUDIO_ELEMENT_ID) as HTMLAudioElement | null;
    if (existing) {
      this.bindDomElement(existing);
      return existing;
    }

    const el = document.createElement("audio");
    el.id = PERSISTENT_AUDIO_ELEMENT_ID;
    el.preload = "auto";
    (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    el.setAttribute("playsinline", "");
    el.setAttribute("aria-hidden", "true");
    el.style.display = "none";
    document.body.appendChild(el);
    this.bindDomElement(el);
    return el;
  }

  private setupUnlockListener() {
    const unlock = () => {
      if (this.isUnlocked) return;
      this.isUnlocked = true;
      try {
        if (!isMobileOrIOS() && this.audioCtx && this.audioCtx.state === "suspended") {
          this.audioCtx.resume().catch(() => {});
        }
      } catch {}
    };
    window.addEventListener("pointerdown", unlock, { passive: true, capture: true });
    window.addEventListener("keydown", unlock, { passive: true, capture: true });
  }

  private attachElementListeners(el: HTMLAudioElement) {
    el.addEventListener("timeupdate", () => {
      if (el !== this.audioEl) return;
      this.emitState(false);
    });

    el.addEventListener("durationchange", () => {
      if (el !== this.audioEl) return;
      this.emitState(false);
    });

    el.addEventListener("play", () => {
      if (el !== this.audioEl) return;
      this.emitState(false);
    });

    el.addEventListener("pause", () => {
      if (el !== this.audioEl) return;
      this.emitState(false);
    });

    el.addEventListener("ended", () => {
      if (el !== this.audioEl) return;
      if (this.onTrackEnded) this.onTrackEnded();
    });

    el.addEventListener("waiting", () => {
      if (el !== this.audioEl) return;
      this.emitState(true);
    });

    el.addEventListener("canplay", () => {
      if (el !== this.audioEl) return;
      this.emitState(false);
    });

    el.addEventListener("error", () => {
      if (el !== this.audioEl || !el.src) return;
      const errCode = el.error?.code || "MEDIA_ERR";
      const errMsg = el.error?.message || "Audio playback failed";
      if (this.onStateChange) {
        this.onStateChange({
          currentTime: el.currentTime || 0,
          duration: el.duration || 0,
          buffered: 0,
          isPlaying: false,
          isLoading: false,
          error: errMsg,
          engineId: "audio",
        });
      }
      if (this.onFatalError && this.currentTrack) {
        this.onFatalError(errCode, this.currentTrack);
      }
    });
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

  private getBufferedPercentage(el: HTMLAudioElement | null): number {
    if (!el || !el.buffered || el.buffered.length === 0) return 0;
    try {
      const bufferedEnd = el.buffered.end(el.buffered.length - 1);
      const duration = el.duration;
      if (duration > 0) return Math.min(100, (bufferedEnd / duration) * 100);
    } catch {}
    return 0;
  }

  private emitState(isLoading: boolean, error: string | null = null) {
    if (!this.onStateChange || !this.audioEl) return;
    const latencyMs =
      this.playbackStartMs > 0 ? Math.max(0, Date.now() - this.playbackStartMs) : undefined;
    this.onStateChange({
      currentTime: this.audioEl.currentTime || 0,
      duration: isNaN(this.audioEl.duration) ? 0 : this.audioEl.duration,
      buffered: this.getBufferedPercentage(this.audioEl),
      isPlaying: !this.audioEl.paused,
      isLoading,
      error,
      engineId: "audio",
      latencyMs,
    });
  }

  private ensureWebAudioGraph(
    el: HTMLAudioElement,
    isLocalOrCorsSafe: boolean,
    settings?: PlayerSettings
  ) {
    // NEVER attach createMediaElementSource on mobile/iOS — iOS suspends AudioContext on lock screen and silences <audio>
    if (isMobileOrIOS() || !isLocalOrCorsSafe) {
      this.dspBypassed = true;
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        this.dspBypassed = true;
        return;
      }

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
        this.audioCtx.addEventListener("statechange", () => {
          if (this.audioCtx?.state === "suspended" && this.audioEl && !this.audioEl.paused) {
            this.audioCtx.resume().catch(() => {});
          }
        });

        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.8;

        this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
          const filter = this.audioCtx!.createBiquadFilter();
          filter.type =
            idx === 0 ? "lowshelf" : idx === EQ_FREQUENCIES.length - 1 ? "highshelf" : "peaking";
          filter.frequency.value = freq;
          filter.Q.value = 1.0;
          filter.gain.value = settings?.equalizerBands?.[idx] ?? 0;
          return filter;
        });

        this.bassFilter = this.audioCtx.createBiquadFilter();
        this.bassFilter.type = "lowshelf";
        this.bassFilter.frequency.value = 100;
        this.bassFilter.gain.value = settings?.bassBoost ?? 0;

        this.trebleFilter = this.audioCtx.createBiquadFilter();
        this.trebleFilter.type = "highshelf";
        this.trebleFilter.frequency.value = 8000;
        this.trebleFilter.gain.value = settings?.trebleBoost ?? 0;

        let prevNode: AudioNode = this.eqFilters[0];
        for (let i = 1; i < this.eqFilters.length; i++) {
          prevNode.connect(this.eqFilters[i]);
          prevNode = this.eqFilters[i];
        }
        prevNode.connect(this.bassFilter);
        this.bassFilter.connect(this.trebleFilter);
        this.trebleFilter.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      if (!this.connectedElements.has(el)) {
        const source = this.audioCtx.createMediaElementSource(el);
        source.connect(this.eqFilters[0]);
        this.connectedElements.add(el);
      }

      this.dspBypassed = false;
    } catch {
      this.dspBypassed = true;
    }
  }

  public prebufferNext(_streamUrl: string) {
    // Next track stream URLs are pre-resolved in memory TTL cache in player-store
    // rather than mutating a secondary <audio> element, preserving single-element session continuity.
  }

  /**
   * Synchronous src swap + play() for use directly inside the `ended` event handler
   * so iOS/Android allow background track-to-track advancement without dropping session focus.
   */
  public playImmediateOnEnded(track: Track, targetUrl: string, settings?: PlayerSettings): Promise<void> {
    const el = this.getOrCreateAudio();
    if (!el || !targetUrl) return Promise.reject(new Error("Missing persistent audio element or URL"));

    this.currentTrack = track;
    this.playbackStartMs = Date.now();

    const isLocalBlob = targetUrl.startsWith("blob:") || track.sourceType === "local";
    if (isLocalBlob && !isMobileOrIOS()) {
      el.crossOrigin = "anonymous";
    } else {
      el.removeAttribute("crossorigin");
    }

    if (settings) {
      this.targetVolume = settings.volume;
      this.isMutedState = settings.isMuted;
      el.playbackRate = Math.max(0.5, Math.min(2.0, settings.playbackRate || 1.0));
      el.muted = settings.isMuted;
      el.volume = settings.isMuted ? 0 : settings.volume;
    }

    el.src = targetUrl;
    el.load();
    this.emitState(true);
    return el.play();
  }

  public async playTrack(track: Track, streamUrl?: string, settings?: PlayerSettings): Promise<void> {
    const el = this.getOrCreateAudio();
    if (!el) return;

    this.currentTrack = track;
    this.playbackStartMs = Date.now();
    const targetUrl = streamUrl || track.streamUrl;

    if (!targetUrl) {
      this.emitState(false, "Stream URL unavailable for direct audio engine.");
      if (this.onFatalError) this.onFatalError("NO_URL", track);
      return;
    }

    const isLocalBlob = targetUrl.startsWith("blob:") || track.sourceType === "local";
    if (isLocalBlob && !isMobileOrIOS()) {
      el.crossOrigin = "anonymous";
    } else {
      el.removeAttribute("crossorigin");
    }

    if (settings) {
      this.targetVolume = settings.volume;
      this.isMutedState = settings.isMuted;
      el.playbackRate = Math.max(0.5, Math.min(2.0, settings.playbackRate || 1.0));
      el.muted = settings.isMuted;
    }

    this.ensureWebAudioGraph(el, isLocalBlob, settings);
    if (settings) this.applySettings(settings);

    if (el.src !== targetUrl) {
      el.src = targetUrl;
      el.load();
    }

    el.volume = this.isMutedState ? 0 : this.targetVolume;
    this.emitState(true);

    try {
      await el.play();
    } catch (err) {
      console.warn("AudioElementEngine autoplay/play interruption:", err);
      this.emitState(false);
    }
  }

  public isCurrentlyLoadedAndPaused(trackId?: string): boolean {
    if (!this.audioEl || !this.audioEl.src) return false;
    if (trackId && this.currentTrack?.id !== trackId) return false;
    return (
      this.audioEl.paused &&
      this.audioEl.readyState >= 2 &&
      !isNaN(this.audioEl.duration) &&
      this.audioEl.duration > 0
    );
  }

  public play() {
    const el = this.getOrCreateAudio();
    if (!el) return;
    if (!isMobileOrIOS() && this.audioCtx?.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    el.play().catch((err) => {
      console.warn("AudioElementEngine resume error:", err);
    });
  }

  public pause() {
    this.audioEl?.pause();
    this.emitState(false);
  }

  public isPaused(): boolean {
    return this.audioEl ? this.audioEl.paused : true;
  }

  public seek(seconds: number) {
    if (!this.audioEl) return;
    const rawDur = this.audioEl.duration;
    const dur = !isNaN(rawDur) && rawDur > 0 ? rawDur : (this.currentTrack?.duration || 0);
    const target = dur > 0 ? Math.max(0, Math.min(seconds, Math.max(0, dur - 0.5))) : Math.max(0, seconds);
    try {
      this.audioEl.currentTime = target;
    } catch {}
    this.emitState(false);
  }

  public setVolume(vol: number) {
    this.targetVolume = Math.max(0, Math.min(1, vol));
    if (this.audioEl && !this.isMutedState) {
      this.audioEl.volume = this.targetVolume;
    }
  }

  public setMuted(muted: boolean) {
    this.isMutedState = muted;
    if (this.audioEl) {
      this.audioEl.muted = muted;
      this.audioEl.volume = muted ? 0 : this.targetVolume;
    }
  }

  public setPlaybackRate(rate: number) {
    const safeRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.audioEl) this.audioEl.playbackRate = safeRate;
  }

  public applySettings(settings: PlayerSettings) {
    this.setVolume(settings.volume);
    this.setMuted(settings.isMuted);
    this.setPlaybackRate(settings.playbackRate);

    if (this.dspBypassed || !this.audioCtx || isMobileOrIOS()) return;

    const eqEnabled = settings.equalizerEnabled;
    this.eqFilters.forEach((filter, idx) => {
      filter.gain.value = eqEnabled ? settings.equalizerBands[idx] ?? 0 : 0;
    });
    if (this.bassFilter) {
      this.bassFilter.gain.value = eqEnabled ? settings.bassBoost : 0;
    }
    if (this.trebleFilter) {
      this.trebleFilter.gain.value = eqEnabled ? settings.trebleBoost : 0;
    }
  }

  public getCurrentTime(): number {
    return this.audioEl?.currentTime || 0;
  }

  public getDuration(): number {
    const d = this.audioEl?.duration;
    return d && !isNaN(d) ? d : this.currentTrack?.duration || 0;
  }

  public getVisualizerData(): Uint8Array | null {
    if (!this.audioEl || this.audioEl.paused) return null;

    if (!isMobileOrIOS() && !this.dspBypassed && this.analyser) {
      try {
        this.analyser.getByteFrequencyData(this.visualizerBuffer);
        let sum = 0;
        for (let i = 0; i < this.visualizerBuffer.length; i++) sum += this.visualizerBuffer[i];
        if (sum > 0) return this.visualizerBuffer;
      } catch {}
    }

    // Smooth ambient harmonic waveform for mobile / non-CORS streams
    const t = this.audioEl.currentTime;
    for (let i = 0; i < this.visualizerBuffer.length; i++) {
      const harmonic = Math.sin(t * 5.2 + i * 0.45) * 0.5 + 0.5;
      const pulse = Math.sin(t * 7.5) > 0.6 ? 1.25 : 0.82;
      this.visualizerBuffer[i] = Math.min(255, Math.floor(harmonic * 170 * pulse + Math.random() * 35));
    }
    return this.visualizerBuffer;
  }

  public stop() {
    this.pause();
    if (this.audioEl) {
      this.audioEl.removeAttribute("src");
      this.audioEl.load();
    }
  }
}

export const audioElementEngine = AudioElementEngine.getInstance();
