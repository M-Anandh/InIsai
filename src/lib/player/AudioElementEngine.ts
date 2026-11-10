import { Track, EngineCapabilities, PlayerSettings } from "@/types";
import { PlaybackEngine, EngineStateCallback } from "./types";

export const EQ_FREQUENCIES = [60, 230, 910, 4000, 14000];

export class AudioElementEngine implements PlaybackEngine {
  public readonly id = "audio" as const;
  public readonly capabilities: EngineCapabilities = {
    eq: true,
    visualizer: true,
    crossfade: true,
    gapless: true,
    speed: true,
    backgroundOnMobile: true,
  };

  private static instance: AudioElementEngine;
  private primaryAudio: HTMLAudioElement | null = null;
  private secondaryAudio: HTMLAudioElement | null = null;
  private activeNode: "primary" | "secondary" = "primary";

  // Web Audio DSP graph (applied safely only when supported / local blobs)
  private audioCtx: AudioContext | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private connectedElements = new WeakSet<HTMLAudioElement>();
  private dspBypassed = false;
  private visualizerBuffer: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(32));

  private onStateChange: EngineStateCallback | null = null;
  private onTrackEnded: (() => void) | null = null;
  private onFatalError: ((code: string | number, track: Track) => void) | null = null;
  private currentTrack: Track | null = null;
  private isUnlocked = false;
  private preloadedUrl: string | null = null;
  private crossfadeInterval: ReturnType<typeof setInterval> | null = null;
  private targetVolume = 0.85;
  private isMutedState = false;
  private playbackStartMs = 0;

  private constructor() {
    if (typeof window !== "undefined") {
      this.primaryAudio = this.createAudioElement();
      this.secondaryAudio = this.createAudioElement();
      this.setupUnlockListener();
    }
  }

  public static getInstance(): AudioElementEngine {
    if (!AudioElementEngine.instance) {
      AudioElementEngine.instance = new AudioElementEngine();
    }
    return AudioElementEngine.instance;
  }

  private createAudioElement(): HTMLAudioElement {
    const el = new Audio();
    el.preload = "auto";
    (el as any).playsInline = true;
    this.attachElementListeners(el);
    return el;
  }

  private get activeAudio(): HTMLAudioElement | null {
    return this.activeNode === "primary" ? this.primaryAudio : this.secondaryAudio;
  }

  private get inactiveAudio(): HTMLAudioElement | null {
    return this.activeNode === "primary" ? this.secondaryAudio : this.primaryAudio;
  }

  private setupUnlockListener() {
    const unlock = () => {
      if (this.isUnlocked) return;
      this.isUnlocked = true;
      try {
        // Resume or initialize AudioContext safely on user tap
        if (this.audioCtx && this.audioCtx.state === "suspended") {
          this.audioCtx.resume().catch(() => {});
        }
      } catch {}
    };
    window.addEventListener("pointerdown", unlock, { passive: true, capture: true });
    window.addEventListener("keydown", unlock, { passive: true, capture: true });
  }

  private attachElementListeners(el: HTMLAudioElement) {
    el.addEventListener("timeupdate", () => {
      if (el !== this.activeAudio) return;
      this.emitState(false);
    });

    el.addEventListener("durationchange", () => {
      if (el !== this.activeAudio) return;
      this.emitState(false);
    });

    el.addEventListener("play", () => {
      if (el !== this.activeAudio) return;
      this.emitState(false);
    });

    el.addEventListener("pause", () => {
      if (el !== this.activeAudio) return;
      this.emitState(false);
    });

    el.addEventListener("ended", () => {
      if (el !== this.activeAudio) return;
      if (this.onTrackEnded) this.onTrackEnded();
    });

    el.addEventListener("waiting", () => {
      if (el !== this.activeAudio) return;
      this.emitState(true);
    });

    el.addEventListener("canplay", () => {
      if (el !== this.activeAudio) return;
      this.emitState(false);
    });

    el.addEventListener("error", () => {
      if (el !== this.activeAudio || !el.src) return;
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
    if (!this.onStateChange || !this.activeAudio) return;
    const latencyMs =
      this.playbackStartMs > 0 ? Math.max(0, Date.now() - this.playbackStartMs) : undefined;
    this.onStateChange({
      currentTime: this.activeAudio.currentTime || 0,
      duration: isNaN(this.activeAudio.duration) ? 0 : this.activeAudio.duration,
      buffered: this.getBufferedPercentage(this.activeAudio),
      isPlaying: !this.activeAudio.paused,
      isLoading,
      error,
      engineId: "audio",
      latencyMs,
    });
  }

  private ensureWebAudioGraph(el: HTMLAudioElement, isLocalOrCorsSafe: boolean, settings?: PlayerSettings) {
    if (!isLocalOrCorsSafe) {
      // Bypass Web Audio node attachment for non-CORS streams so sound is never silenced
      this.dspBypassed = true;
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        this.dspBypassed = true;
        return;
      }

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;

        this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
          const filter = this.audioCtx!.createBiquadFilter();
          filter.type = idx === 0 ? "lowshelf" : idx === EQ_FREQUENCIES.length - 1 ? "highshelf" : "peaking";
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

        // Wire filter chain
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
      // Bypass DSP graph seamlessly if creation fails
      this.dspBypassed = true;
    }
  }

  public prebufferNext(streamUrl: string) {
    if (!this.inactiveAudio || !streamUrl || this.preloadedUrl === streamUrl) return;
    try {
      this.preloadedUrl = streamUrl;
      this.inactiveAudio.src = streamUrl;
      this.inactiveAudio.load();
    } catch {}
  }

  public async playTrack(track: Track, streamUrl?: string, settings?: PlayerSettings): Promise<void> {
    if (!this.primaryAudio || !this.secondaryAudio) return;

    this.currentTrack = track;
    this.playbackStartMs = Date.now();
    const targetUrl = streamUrl || track.streamUrl;

    if (!targetUrl) {
      this.emitState(false, "Stream URL unavailable for direct audio engine.");
      if (this.onFatalError) this.onFatalError("NO_URL", track);
      return;
    }

    const crossfadeSec = settings?.crossfadeDuration ?? 0;
    const isCrossfading =
      crossfadeSec > 0 &&
      this.activeAudio &&
      !this.activeAudio.paused &&
      Boolean(this.activeAudio.src);

    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }

    const outgoing = this.activeAudio;
    let incoming: HTMLAudioElement;

    if (isCrossfading && this.inactiveAudio) {
      this.activeNode = this.activeNode === "primary" ? "secondary" : "primary";
      incoming = this.activeAudio!;
    } else {
      if (this.inactiveAudio) {
        this.inactiveAudio.pause();
        this.inactiveAudio.currentTime = 0;
      }
      incoming = this.activeAudio!;
    }

    const isLocalBlob = targetUrl.startsWith("blob:") || track.sourceType === "local";
    // Set crossOrigin only for local blobs/verified CORS safe endpoints
    if (isLocalBlob) {
      incoming.crossOrigin = "anonymous";
    } else {
      incoming.removeAttribute("crossorigin");
    }

    if (settings) {
      this.targetVolume = settings.volume;
      this.isMutedState = settings.isMuted;
      incoming.playbackRate = Math.max(0.5, Math.min(2.0, settings.playbackRate || 1.0));
    }

    this.ensureWebAudioGraph(incoming, isLocalBlob, settings);
    if (settings) this.applySettings(settings);

    if (this.preloadedUrl !== targetUrl || incoming.src !== targetUrl) {
      incoming.src = targetUrl;
      incoming.load();
    }

    this.emitState(true);

    try {
      if (isCrossfading && outgoing && outgoing !== incoming) {
        incoming.volume = 0;
        await incoming.play();
        const steps = 20;
        const stepMs = (crossfadeSec * 1000) / steps;
        let currentStep = 0;
        const maxVol = this.isMutedState ? 0 : this.targetVolume;

        this.crossfadeInterval = setInterval(() => {
          currentStep++;
          const ratio = Math.min(1, currentStep / steps);
          incoming.volume = maxVol * ratio;
          outgoing.volume = maxVol * (1 - ratio);

          if (currentStep >= steps) {
            clearInterval(this.crossfadeInterval!);
            this.crossfadeInterval = null;
            outgoing.pause();
            outgoing.currentTime = 0;
            outgoing.volume = maxVol;
          }
        }, stepMs);
      } else {
        incoming.volume = this.isMutedState ? 0 : this.targetVolume;
        await incoming.play();
      }
    } catch (err) {
      console.warn("AudioElementEngine autoplay/play interruption:", err);
      this.emitState(false);
    }
  }

  public play() {
    if (!this.activeAudio) return;
    if (this.audioCtx?.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    this.activeAudio.play().catch((err) => {
      console.warn("AudioElementEngine resume error:", err);
    });
  }

  public pause() {
    this.primaryAudio?.pause();
    this.secondaryAudio?.pause();
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }
    this.emitState(false);
  }

  public seek(seconds: number) {
    if (!this.activeAudio) return;
    const dur = this.activeAudio.duration || this.currentTrack?.duration || 0;
    this.activeAudio.currentTime = Math.max(0, Math.min(seconds, dur));
    this.emitState(false);
  }

  public setVolume(vol: number) {
    this.targetVolume = Math.max(0, Math.min(1, vol));
    if (this.activeAudio && !this.isMutedState) {
      this.activeAudio.volume = this.targetVolume;
    }
  }

  public setMuted(muted: boolean) {
    this.isMutedState = muted;
    if (this.activeAudio) {
      this.activeAudio.muted = muted;
      this.activeAudio.volume = muted ? 0 : this.targetVolume;
    }
  }

  public setPlaybackRate(rate: number) {
    const safeRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.primaryAudio) this.primaryAudio.playbackRate = safeRate;
    if (this.secondaryAudio) this.secondaryAudio.playbackRate = safeRate;
  }

  public applySettings(settings: PlayerSettings) {
    this.setVolume(settings.volume);
    this.setMuted(settings.isMuted);
    this.setPlaybackRate(settings.playbackRate);

    if (this.dspBypassed || !this.audioCtx) return;

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
    return this.activeAudio?.currentTime || 0;
  }

  public getDuration(): number {
    const d = this.activeAudio?.duration;
    return d && !isNaN(d) ? d : this.currentTrack?.duration || 0;
  }

  public getVisualizerData(): Uint8Array | null {
    if (!this.activeAudio || this.activeAudio.paused) return null;

    if (!this.dspBypassed && this.analyser) {
      try {
        this.analyser.getByteFrequencyData(this.visualizerBuffer);
        // Check if non-zero spectrum data was retrieved
        let sum = 0;
        for (let i = 0; i < this.visualizerBuffer.length; i++) sum += this.visualizerBuffer[i];
        if (sum > 0) return this.visualizerBuffer;
      } catch {}
    }

    // Simulated harmonic visualizer fallback when stream lacks CORS headers
    const t = this.activeAudio.currentTime;
    for (let i = 0; i < this.visualizerBuffer.length; i++) {
      const harmonic = Math.sin(t * 5.2 + i * 0.45) * 0.5 + 0.5;
      const pulse = Math.sin(t * 7.5) > 0.6 ? 1.25 : 0.82;
      this.visualizerBuffer[i] = Math.min(255, Math.floor(harmonic * 170 * pulse + Math.random() * 35));
    }
    return this.visualizerBuffer;
  }

  public stop() {
    this.pause();
    if (this.primaryAudio) {
      this.primaryAudio.src = "";
    }
    if (this.secondaryAudio) {
      this.secondaryAudio.src = "";
    }
    this.preloadedUrl = null;
  }
}

export const audioElementEngine = AudioElementEngine.getInstance();
