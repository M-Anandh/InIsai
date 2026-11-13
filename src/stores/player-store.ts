import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Track,
  RepeatMode,
  PlayerSettings,
  PlaybackContext,
  EngineId,
  EngineCapabilities,
  PlaybackSessionState,
} from "@/types";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
import { providerRegistry } from "@/music/providers/ProviderRegistry";
import { recordSignal } from "@/lib/personalization/signal-tracker";
import {
  persistPlaybackSession,
  persistPlaybackSessionSync,
} from "@/lib/player/session-persistence";

export interface EQPresetDefinition {
  name: string;
  bands: number[]; // [60Hz, 230Hz, 910Hz, 4kHz, 14kHz] in dB (-12 to 12)
  bassBoost: number;
  trebleBoost: number;
}

export const EQ_PRESETS: Record<string, EQPresetDefinition> = {
  flat: {
    name: "Flat",
    bands: [0, 0, 0, 0, 0],
    bassBoost: 0,
    trebleBoost: 0,
  },
  bass: {
    name: "Bass Boost",
    bands: [6, 4, 1, 0, 0],
    bassBoost: 8,
    trebleBoost: 1,
  },
  vocal: {
    name: "Vocal Clarity",
    bands: [-2, 1, 5, 4, 2],
    bassBoost: -1,
    trebleBoost: 4,
  },
  acoustic: {
    name: "Acoustic / Veena",
    bands: [2, 3, 2, 4, 5],
    bassBoost: 2,
    trebleBoost: 5,
  },
  electronic: {
    name: "Electronic / Synth",
    bands: [5, 3, -1, 3, 5],
    bassBoost: 6,
    trebleBoost: 4,
  },
};

const AUDIO_DEFAULT_CAPABILITIES: EngineCapabilities = {
  eq: true,
  visualizer: true,
  crossfade: true,
  gapless: true,
  speed: true,
  backgroundOnMobile: true,
};

interface PlayerState {
  // Current playback
  currentTrack: Track | null;
  isPlaying: boolean;
  userPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  error: string | null;
  toastMessage: string | null;

  // Engine telemetry
  engineId: EngineId;
  engineCapabilities: EngineCapabilities;
  videoQuality?: string;
  latencyMs?: number;

  // Playback Context (preserves queue origin across route changes)
  playbackContext: PlaybackContext | null;

  // Queue
  queue: Track[];
  queueIndex: number;
  originalQueue: Track[];
  history: Track[];

  // Modes
  repeatMode: RepeatMode;
  isShuffle: boolean;
  sleepTimerEndOfTrack: boolean;

  // UI state
  isFullScreenOpen: boolean;
  activeDrawerTab: "nowPlaying" | "queue" | "lyrics" | "equalizer";

  // Audio & app settings
  settings: PlayerSettings;

  // Actions
  playTrack: (track: Track, newQueue?: Track[], context?: PlaybackContext) => Promise<void>;
  setPlaybackContext: (context: PlaybackContext | null) => void;
  setToastMessage: (msg: string | null) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => Promise<void>;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;

  // Queue actions
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;

  // UI Actions
  setFullScreenOpen: (open: boolean) => void;
  setActiveDrawerTab: (tab: "nowPlaying" | "queue" | "lyrics" | "equalizer") => void;

  // Equalizer & FX & Preferences
  setEQPreset: (presetKey: string) => void;
  setEQBand: (bandIndex: number, gainDb: number) => void;
  setBassBoost: (val: number) => void;
  setTrebleBoost: (val: number) => void;
  toggleEqualizer: (enabled?: boolean) => void;
  setCrossfade: (durationSec: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimer: (minutes: number | "end_of_track" | null) => void;
  setPreference: (key: keyof PlayerSettings, value: any) => void;

  // Error recovery & background continuity
  handleEngineFatalError: (code: string | number, failedTrack: Track) => Promise<void>;
  preResolveNextTrackIfNeeded: (currentTime: number, duration: number) => void;
  handleTrackEndedFastAdvance: () => void;

  // Session persistence, resume & background playback warning
  restoredPosition?: number;
  youtubeBackgroundWarning: { visible: boolean; message: string; actionText?: string } | null;
  setYoutubeBackgroundWarning: (warning: { visible: boolean; message: string; actionText?: string } | null) => void;
  switchToAudioVersion: () => Promise<void>;
  ensureReadyAndPlay: (targetPosition?: number) => Promise<void>;
  restoreSession: (session: PlaybackSessionState) => void;
  persistCurrentSession: (forceImmediate?: boolean) => void;
  persistCurrentSessionSync: () => void;
}

const defaultSettings: PlayerSettings = {
  volume: 0.85,
  isMuted: false,
  repeatMode: "off",
  isShuffle: false,
  crossfadeDuration: 2,
  playbackRate: 1.0,
  bassBoost: 0,
  trebleBoost: 0,
  equalizerBands: [0, 0, 0, 0, 0],
  equalizerEnabled: false,
  selectedEqPreset: "flat",
  sleepTimerMinutes: null,
  preferAudioFallback: true,
  autoplayRelated: true,
  statsForNerd: false,
  videoMode: false,
};

let sleepTimerInterval: ReturnType<typeof setInterval> | null = null;
const attemptedRecoveries = new Set<string>();
const STREAM_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
export const preResolvedStreams = new Map<
  string,
  { track: Track; url: string; expiresAt: number }
>();
const preResolvingIds = new Set<string>();
let shownMobileYtHint = false;

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      userPaused: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      error: null,
      toastMessage: null,

      engineId: "audio",
      engineCapabilities: AUDIO_DEFAULT_CAPABILITIES,
      videoQuality: undefined,
      latencyMs: undefined,

      playbackContext: null,
      queue: [],
      queueIndex: -1,
      originalQueue: [],
      history: [],

      repeatMode: "off",
      isShuffle: false,
      sleepTimerEndOfTrack: false,

      isFullScreenOpen: false,
      activeDrawerTab: "nowPlaying",

      settings: defaultSettings,

      restoredPosition: undefined,
      youtubeBackgroundWarning: null,

      setYoutubeBackgroundWarning: (warning) => {
        set({ youtubeBackgroundWarning: warning });
      },

      setPlaybackContext: (context: PlaybackContext | null) => {
        set({ playbackContext: context });
      },

      setToastMessage: (msg: string | null) => {
        set({ toastMessage: msg });
        if (msg) {
          setTimeout(() => {
            if (get().toastMessage === msg) set({ toastMessage: null });
          }, 4200);
        }
      },

      playTrack: async (track: Track, newQueue?: Track[], context?: PlaybackContext) => {
        let updatedQueue = newQueue ? [...newQueue] : get().queue;
        let index = updatedQueue.findIndex((t) => t.id === track.id);

        if (index === -1) {
          updatedQueue = [track, ...updatedQueue];
          index = 0;
        }

        const resolvedContext =
          context !== undefined ? context : newQueue ? null : get().playbackContext;

        let trackToPlay = { ...track };
        const { settings } = get();

        // Route Song mode via direct <audio> when a confident match exists & background-friendly playback is enabled (and not explicitly in video mode)
        if (
          settings.preferAudioFallback &&
          !settings.videoMode &&
          (trackToPlay.sourceType === "youtube" || trackToPlay.sourceType === "ytmusic" || !trackToPlay.streamUrl)
        ) {
          const cached = preResolvedStreams.get(trackToPlay.id);
          if (cached && cached.expiresAt > Date.now() && cached.url) {
            trackToPlay.streamUrl = cached.url;
            trackToPlay.bitrate = cached.track.bitrate || "320 kbps Audio";
          } else {
            try {
              const matched = await providerRegistry.findAudioMatch(trackToPlay, "saavn");
              if (matched?.streamUrl) {
                trackToPlay.streamUrl = matched.streamUrl;
                trackToPlay.bitrate = matched.bitrate || "320 kbps Audio";
                preResolvedStreams.set(trackToPlay.id, {
                  track: trackToPlay,
                  url: matched.streamUrl,
                  expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
                });
              }
            } catch {}
          }
        }

        set({
          currentTrack: trackToPlay,
          queue: updatedQueue,
          queueIndex: index,
          playbackContext: resolvedContext,
          userPaused: false,
          isLoading: true,
          error: null,
          restoredPosition: undefined,
        });

        const engineUsed = await engineCoordinator.playTrack(trackToPlay, settings);
        set({
          engineId: engineUsed,
          engineCapabilities: { ...engineCoordinator.getCapabilities() },
        });

        get().persistCurrentSession(true);

        // Gapless prebuffer next track if AudioElementEngine
        if (index + 1 < updatedQueue.length) {
          engineCoordinator.prebufferNextTrack(updatedQueue[index + 1]);
        }

        // Update listening history (deduplicated) & record taste signal
        const history = [trackToPlay, ...get().history.filter((t) => t.id !== trackToPlay.id)].slice(0, 60);
        set({ history });
        recordSignal("play", trackToPlay);

        // Auto-Radio recommendation: if queue ends soon and autoplay is enabled
        if (updatedQueue.length <= 1 && !resolvedContext && settings.autoplayRelated !== false) {
          try {
            const provider = providerRegistry.getProvider(
              trackToPlay.youtubeVideoId ? "ytmusic" : "saavn"
            );
            const recoTracks = provider ? await provider.related(trackToPlay) : [];
            const uniqueRecos = recoTracks.filter((rt) => rt.id !== trackToPlay.id);
            if (uniqueRecos.length > 0) {
              set((s) => ({ queue: [...s.queue, ...uniqueRecos] }));
            }
          } catch {}
        }
      },

      handleEngineFatalError: async (_code, failedTrack) => {
        const retryKey = `${failedTrack.id}`;
        if (!attemptedRecoveries.has(retryKey)) {
          attemptedRecoveries.add(retryKey);

          // 1. Cross-provider fallback to Direct Audio (Saavn)
          const alternate = await providerRegistry.findAudioMatch(failedTrack, "saavn");
          if (alternate?.streamUrl) {
            get().setToastMessage("Primary stream restricted — switched to alternate audio");
            await get().playTrack({
              ...failedTrack,
              streamUrl: alternate.streamUrl,
              bitrate: "Fallback Audio",
            });
            return;
          }

          // 2. Fallback to alternative YouTube embeddable official video (fixes Error 150/153 on Topic/Audio tracks)
          if (failedTrack.youtubeVideoId) {
            // Check pre-attached versions first
            const altVersion = failedTrack.versions?.find(
              (v) => v.youtubeVideoId && v.youtubeVideoId !== failedTrack.youtubeVideoId
            );
            if (altVersion?.youtubeVideoId) {
              get().setToastMessage("Switched to embeddable official version");
              await get().playTrack({
                ...failedTrack,
                youtubeVideoId: altVersion.youtubeVideoId,
                sourceAttribution: "YouTube (Official Embed)",
              });
              return;
            }

            try {
              const cleanTitle = (failedTrack.title || "")
                .replace(/\(audio\)/gi, "")
                .replace(/\[.*?\]/g, "")
                .trim();
              const q = `${cleanTitle} ${failedTrack.artist} official video`;
              const res = await fetch(`/api/yt/search?q=${encodeURIComponent(q)}`);
              if (res.ok) {
                const data = await res.json();
                const candidate =
                  data.songs?.find(
                    (s: Track) => s.youtubeVideoId && s.youtubeVideoId !== failedTrack.youtubeVideoId
                  ) ||
                  data.videos?.find(
                    (v: Track) => v.youtubeVideoId && v.youtubeVideoId !== failedTrack.youtubeVideoId
                  );

                if (candidate?.youtubeVideoId) {
                  get().setToastMessage("Embed restricted — switched to official video");
                  await get().playTrack({
                    ...failedTrack,
                    id: `${failedTrack.id}-rec`,
                    youtubeVideoId: candidate.youtubeVideoId,
                    sourceAttribution: "YouTube (Official Embed)",
                  });
                  return;
                }
              }
            } catch {}
          }
        }

        // Auto-skip to next item cleanly so player never stalls on a dead track
        const { queue, queueIndex } = get();
        if (queue.length > 1 && queueIndex + 1 < queue.length) {
          get().setToastMessage(`Skipped unplayable track: ${failedTrack.title}`);
          await get().nextTrack();
        } else {
          set({ isLoading: false, isPlaying: false });
          get().setToastMessage(`Track unavailable: ${failedTrack.title}`);
        }
      },

      togglePlay: () => {
        const { isPlaying } = get();
        if (isPlaying) {
          get().pause();
        } else {
          void get().ensureReadyAndPlay();
        }
      },

      pause: () => {
        engineCoordinator.pause();
        set({ isPlaying: false, userPaused: true });
        get().persistCurrentSession(true);
      },

      resume: () => {
        void get().ensureReadyAndPlay();
      },

      switchToAudioVersion: async () => {
        const { currentTrack, currentTime, settings } = get();
        if (!currentTrack) return;
        set({ isLoading: true });
        try {
          const match = await providerRegistry.findAudioMatch(currentTrack, "saavn");
          if (match?.streamUrl) {
            const audioTrack = {
              ...currentTrack,
              streamUrl: match.streamUrl,
              bitrate: match.bitrate || "320 kbps Audio",
            };
            set({
              currentTrack: audioTrack,
              engineId: "audio",
              youtubeBackgroundWarning: null,
            });
            await engineCoordinator.playTrack(audioTrack, settings);
            if (currentTime > 0) {
              engineCoordinator.seek(currentTime);
            }
            set({ isPlaying: true, isLoading: false, userPaused: false });
            get().setToastMessage("Switched to audio version for background playback");
            get().persistCurrentSession(true);
            return;
          }
        } catch {}
        set({ isLoading: false });
        get().setToastMessage("No audio stream match found for this track");
      },

      ensureReadyAndPlay: async (targetPosition?: number) => {
        const { currentTrack, queue, queueIndex, settings, restoredPosition } = get();
        let track = currentTrack;
        if (!track && queue.length > 0) {
          const idx = Math.max(0, queueIndex >= 0 ? queueIndex : 0);
          track = queue[idx];
          set({ currentTrack: track, queueIndex: idx });
        }
        if (!track) return;

        set({ isLoading: true, error: null, userPaused: false });

        const seekTarget =
          targetPosition !== undefined
            ? targetPosition
            : restoredPosition !== undefined
            ? restoredPosition
            : get().currentTime;

        // Clear restoredPosition once applied so subsequent playback isn't hijacked
        set({ restoredPosition: undefined });

        let trackToPlay = { ...track };
        const wantsAudio = settings.preferAudioFallback && !settings.videoMode;

        // Re-resolve if missing, expired, or direct audio preferred
        if (
          wantsAudio &&
          (!trackToPlay.streamUrl ||
            trackToPlay.sourceType === "youtube" ||
            trackToPlay.sourceType === "ytmusic")
        ) {
          try {
            const matched = await providerRegistry.findAudioMatch(trackToPlay, "saavn");
            if (matched?.streamUrl) {
              trackToPlay.streamUrl = matched.streamUrl;
              trackToPlay.bitrate = matched.bitrate || "320 kbps Audio";
            }
          } catch {}
        }

        set({ currentTrack: trackToPlay });

        try {
          const engineUsed = await engineCoordinator.playTrack(trackToPlay, settings);
          set({
            engineId: engineUsed,
            engineCapabilities: { ...engineCoordinator.getCapabilities() },
            isPlaying: true,
            isLoading: false,
            userPaused: false,
          });

          // Apply target seek position (clamped to [0, duration - 1])
          const dur = trackToPlay.duration || get().duration || 0;
          if (seekTarget > 0 && (dur <= 0 || seekTarget < dur)) {
            const clamped = dur > 0 ? Math.min(seekTarget, Math.max(0, dur - 1)) : seekTarget;
            engineCoordinator.seek(clamped);
            set({ currentTime: clamped });
          }

          get().persistCurrentSession(true);
        } catch (err: any) {
          console.warn("ensureReadyAndPlay error:", err);
          set({
            isLoading: false,
            isPlaying: false,
            error: err?.message || "Playback failed",
          });
        }
      },

      restoreSession: (session: PlaybackSessionState) => {
        const { isPlaying, currentTrack } = get();
        if (currentTrack && isPlaying) return;

        let targetTrack = session.currentTrack;
        let targetQueue = session.queue && session.queue.length > 0 ? session.queue : targetTrack ? [targetTrack] : [];
        let targetQueueIndex = session.queueIndex >= 0 ? session.queueIndex : 0;
        let targetPos = session.positionSeconds || 0;
        const dur = session.durationSeconds || targetTrack?.duration || 0;

        // Position rules: If within 3s of end, treat as finished and advance to next track starting at 0:00
        if (dur > 3 && targetPos >= dur - 3) {
          if (targetQueueIndex + 1 < targetQueue.length) {
            targetQueueIndex += 1;
            targetTrack = targetQueue[targetQueueIndex];
            targetPos = 0;
          } else {
            targetPos = 0;
          }
        } else if (dur > 0) {
          targetPos = Math.max(0, Math.min(targetPos, Math.max(0, dur - 1)));
        }

        set({
          currentTrack: targetTrack,
          queue: targetQueue,
          queueIndex: targetQueueIndex,
          currentTime: targetPos,
          duration: dur,
          isPlaying: false,
          userPaused: true,
          engineId: session.engineId || "audio",
          restoredPosition: targetPos,
        });

        // Set Media Session metadata and position for lockscreen
        if (typeof window !== "undefined" && "mediaSession" in navigator && targetTrack) {
          try {
            const art = targetTrack.artworkUrl || "/icons/icon-512.png";
            navigator.mediaSession.metadata = new MediaMetadata({
              title: targetTrack.title,
              artist: targetTrack.artist,
              album: targetTrack.album || "InIsai Music",
              artwork: [
                { src: art, sizes: "96x96", type: "image/jpeg" },
                { src: art, sizes: "128x128", type: "image/jpeg" },
                { src: art, sizes: "256x256", type: "image/jpeg" },
                { src: art, sizes: "512x512", type: "image/jpeg" },
              ],
            });
            navigator.mediaSession.playbackState = "paused";
            if (dur > 0 && "setPositionState" in navigator.mediaSession) {
              navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: 1,
                position: targetPos,
              });
            }
          } catch {}
        }

        if (targetPos > 0 && targetTrack) {
          const mm = Math.floor(targetPos / 60);
          const ss = String(Math.floor(targetPos % 60)).padStart(2, "0");
          get().setToastMessage(`Resume "${targetTrack.title}" from ${mm}:${ss}`);
        }
      },

      persistCurrentSession: (forceImmediate = false) => {
        const {
          currentTrack,
          queue,
          queueIndex,
          currentTime,
          duration,
          settings,
          repeatMode,
          isShuffle,
          engineId,
          isPlaying,
        } = get();
        if (!currentTrack) return;
        const session: PlaybackSessionState = {
          trackKey: `${currentTrack.providerId || currentTrack.sourceType || "audio"}:${currentTrack.id}`,
          currentTrack,
          queue,
          queueIndex,
          positionSeconds: currentTime || 0,
          durationSeconds: duration || currentTrack.duration || 0,
          volume: settings.volume,
          repeat: repeatMode,
          shuffle: isShuffle,
          engineId,
          mode: settings.videoMode ? "video" : "song",
          savedAt: Date.now(),
          wasPlaying: isPlaying,
        };
        persistPlaybackSession(session, forceImmediate);
      },

      persistCurrentSessionSync: () => {
        const {
          currentTrack,
          queue,
          queueIndex,
          currentTime,
          duration,
          settings,
          repeatMode,
          isShuffle,
          engineId,
          isPlaying,
        } = get();
        if (!currentTrack) return;
        const session: PlaybackSessionState = {
          trackKey: `${currentTrack.providerId || currentTrack.sourceType || "audio"}:${currentTrack.id}`,
          currentTrack,
          queue,
          queueIndex,
          positionSeconds: currentTime || 0,
          durationSeconds: duration || currentTrack.duration || 0,
          volume: settings.volume,
          repeat: repeatMode,
          shuffle: isShuffle,
          engineId,
          mode: settings.videoMode ? "video" : "song",
          savedAt: Date.now(),
          wasPlaying: isPlaying,
        };
        persistPlaybackSessionSync(session);
      },

      preResolveNextTrackIfNeeded: (currentTime: number, duration: number) => {
        if (!duration || duration <= 0 || duration - currentTime > 22) return;
        const { queue, queueIndex, repeatMode, settings } = get();
        if (queue.length === 0) return;
        const nextIdx =
          queueIndex + 1 < queue.length
            ? queueIndex + 1
            : repeatMode === "all"
            ? 0
            : -1;
        if (nextIdx < 0) return;

        const candidate = queue[nextIdx];
        if (!candidate) return;

        const existing = preResolvedStreams.get(candidate.id);
        if (existing && existing.expiresAt > Date.now()) return;
        if (preResolvingIds.has(candidate.id)) return;

        if (candidate.streamUrl) {
          preResolvedStreams.set(candidate.id, {
            track: candidate,
            url: candidate.streamUrl,
            expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
          });
          return;
        }

        if (!settings.preferAudioFallback || settings.videoMode) return;
        preResolvingIds.add(candidate.id);
        providerRegistry
          .findAudioMatch(candidate, "saavn")
          .then((matched) => {
            if (matched?.streamUrl) {
              const resolvedTrack = {
                ...candidate,
                streamUrl: matched.streamUrl,
                bitrate: matched.bitrate || "320 kbps Audio",
              };
              preResolvedStreams.set(candidate.id, {
                track: resolvedTrack,
                url: matched.streamUrl,
                expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
              });
            }
          })
          .catch(() => {})
          .finally(() => {
            preResolvingIds.delete(candidate.id);
          });
      },

      handleTrackEndedFastAdvance: () => {
        const {
          currentTrack,
          repeatMode,
          sleepTimerEndOfTrack,
          queue,
          queueIndex,
          settings,
          history,
        } = get();

        if (currentTrack) {
          recordSignal(repeatMode === "one" ? "repeat" : "completion", currentTrack);
        }

        if (sleepTimerEndOfTrack) {
          engineCoordinator.pause();
          set({ isPlaying: false, userPaused: true, sleepTimerEndOfTrack: false });
          get().setToastMessage("Sleep timer paused playback at end of track");
          return;
        }

        if (repeatMode === "one" && currentTrack) {
          set({ userPaused: false });
          engineCoordinator.seek(0);
          engineCoordinator.play();
          return;
        }

        const nextIdx =
          queueIndex + 1 < queue.length
            ? queueIndex + 1
            : repeatMode === "all" && queue.length > 0
            ? 0
            : -1;

        if (nextIdx >= 0 && queue[nextIdx]) {
          const nextCandidate = queue[nextIdx];
          const cached = preResolvedStreams.get(nextCandidate.id);
          const directUrl =
            (cached && cached.expiresAt > Date.now() ? cached.url : null) ||
            (nextCandidate.streamUrl && nextCandidate.sourceType !== "local"
              ? nextCandidate.streamUrl
              : null);

          if (directUrl) {
            const nextTrackObj =
              cached && cached.expiresAt > Date.now() ? cached.track : nextCandidate;
            set({
              currentTrack: nextTrackObj,
              queueIndex: nextIdx,
              userPaused: false,
              isLoading: true,
              error: null,
              engineId: "audio",
              history: [
                nextTrackObj,
                ...history.filter((t) => t.id !== nextTrackObj.id),
              ].slice(0, 60),
            });

            // Synchronous src swap + play() inside ended handler; retry once on failure
            engineCoordinator
              .playImmediateAudio(nextTrackObj, directUrl, settings)
              .catch(() => {
                preResolvedStreams.delete(nextTrackObj.id);
                engineCoordinator
                  .playImmediateAudio(nextTrackObj, directUrl, settings)
                  .catch(() => {
                    void get().handleEngineFatalError("ENDED_PLAY_FAILED", nextTrackObj);
                  });
              });
            return;
          }
        }

        void get().nextTrack();
      },

      nextTrack: async () => {
        const { queue, queueIndex, repeatMode, currentTrack, currentTime, duration, settings, sleepTimerEndOfTrack } = get();

        if (currentTrack && currentTime > 0) {
          if (currentTime < 15 && duration > 30) {
            recordSignal("skip", currentTrack);
          } else if (duration > 0 && currentTime / duration >= 0.7) {
            recordSignal("completion", currentTrack);
          }
        }

        if (sleepTimerEndOfTrack) {
          engineCoordinator.pause();
          set({ isPlaying: false, sleepTimerEndOfTrack: false });
          get().setToastMessage("Sleep timer paused playback at end of track");
          return;
        }

        if (queue.length === 0) return;

        let nextIdx = queueIndex + 1;
        if (nextIdx >= queue.length) {
          if (repeatMode === "all") {
            nextIdx = 0;
          } else if (settings.autoplayRelated !== false && currentTrack) {
            try {
              const provider = providerRegistry.getProvider(
                currentTrack.youtubeVideoId ? "ytmusic" : "saavn"
              );
              const recos = provider ? await provider.related(currentTrack) : [];
              const fresh = recos.filter((rt) => !queue.some((q) => q.id === rt.id));
              if (fresh.length > 0) {
                const expanded = [...queue, ...fresh];
                set({ queue: expanded });
                await get().playTrack(expanded[nextIdx]);
                return;
              }
            } catch {}
            engineCoordinator.pause();
            set({ isPlaying: false });
            return;
          } else {
            engineCoordinator.pause();
            set({ isPlaying: false });
            return;
          }
        }

        set({ restoredPosition: undefined });
        await get().playTrack(queue[nextIdx]);
      },

      prevTrack: () => {
        const { queue, queueIndex, currentTime } = get();
        if (queue.length === 0) return;

        set({ restoredPosition: undefined });

        if (currentTime > 3) {
          get().seek(0);
          return;
        }

        let prevIdx = queueIndex - 1;
        if (prevIdx < 0) prevIdx = queue.length - 1;
        get().playTrack(queue[prevIdx]);
      },

      seek: (seconds: number) => {
        engineCoordinator.seek(seconds);
        set({ currentTime: seconds });
        get().persistCurrentSession(true);
      },

      setVolume: (vol: number) => {
        engineCoordinator.setVolume(vol);
        set((s) => ({ settings: { ...s.settings, volume: vol, isMuted: false } }));
      },

      toggleMute: () => {
        const newMuted = !get().settings.isMuted;
        engineCoordinator.setMuted(newMuted);
        set((s) => ({ settings: { ...s.settings, isMuted: newMuted } }));
      },

      setRepeatMode: (mode: RepeatMode) => {
        set((s) => ({ repeatMode: mode, settings: { ...s.settings, repeatMode: mode } }));
      },

      toggleShuffle: () => {
        const isShuffled = !get().isShuffle;
        const { queue, currentTrack } = get();

        if (isShuffled) {
          const others = queue.filter((t) => t.id !== currentTrack?.id);
          for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
          }
          const shuffledQueue = currentTrack ? [currentTrack, ...others] : others;
          set({
            isShuffle: true,
            originalQueue: [...queue],
            queue: shuffledQueue,
            queueIndex: 0,
          });
        } else {
          const original = get().originalQueue;
          const newIndex = original.findIndex((t) => t.id === currentTrack?.id);
          set({
            isShuffle: false,
            queue: original.length > 0 ? original : queue,
            queueIndex: Math.max(0, newIndex),
          });
        }
      },

      addToQueue: (track: Track) => {
        set((s) => ({ queue: [...s.queue, track] }));
      },

      playNext: (track: Track) => {
        const { queue, queueIndex } = get();
        const newQueue = [...queue];
        newQueue.splice(queueIndex + 1, 0, track);
        set({ queue: newQueue });
      },

      removeFromQueue: (index: number) => {
        const { queue, queueIndex } = get();
        const newQueue = queue.filter((_, i) => i !== index);
        let newIndex = queueIndex;
        if (index < queueIndex) newIndex--;
        set({ queue: newQueue, queueIndex: newIndex });
      },

      clearQueue: () => {
        set({ queue: [], queueIndex: -1 });
      },

      reorderQueue: (start: number, end: number) => {
        const { queue, queueIndex } = get();
        const updated = [...queue];
        const [moved] = updated.splice(start, 1);
        updated.splice(end, 0, moved);

        let newIdx = queueIndex;
        if (queueIndex === start) newIdx = end;
        else if (start < queueIndex && end >= queueIndex) newIdx--;
        else if (start > queueIndex && end <= queueIndex) newIdx++;

        set({ queue: updated, queueIndex: newIdx });
      },

      setFullScreenOpen: (open: boolean) => {
        set({ isFullScreenOpen: open });
        engineCoordinator.setWakeLock(open && get().isPlaying);
      },

      setActiveDrawerTab: (tab) => set({ activeDrawerTab: tab }),

      setEQPreset: (presetKey: string) => {
        const preset = EQ_PRESETS[presetKey];
        if (!preset) return;
        const newSettings = {
          ...get().settings,
          selectedEqPreset: presetKey,
          equalizerBands: [...preset.bands],
          bassBoost: preset.bassBoost,
          trebleBoost: preset.trebleBoost,
          equalizerEnabled: true,
        };
        engineCoordinator.applySettings(newSettings);
        set({ settings: newSettings });
      },

      setEQBand: (idx: number, gainDb: number) => {
        const bands = [...get().settings.equalizerBands];
        bands[idx] = gainDb;
        const newSettings = {
          ...get().settings,
          equalizerBands: bands,
          equalizerEnabled: true,
          selectedEqPreset: "custom",
        };
        engineCoordinator.applySettings(newSettings);
        set({ settings: newSettings });
      },

      setBassBoost: (val: number) => {
        const newSettings = { ...get().settings, bassBoost: val, equalizerEnabled: true };
        engineCoordinator.applySettings(newSettings);
        set({ settings: newSettings });
      },

      setTrebleBoost: (val: number) => {
        const newSettings = { ...get().settings, trebleBoost: val, equalizerEnabled: true };
        engineCoordinator.applySettings(newSettings);
        set({ settings: newSettings });
      },

      toggleEqualizer: (enabled) => {
        const isEnabled = enabled !== undefined ? enabled : !get().settings.equalizerEnabled;
        const newSettings = { ...get().settings, equalizerEnabled: isEnabled };
        engineCoordinator.applySettings(newSettings);
        set({ settings: newSettings });
      },

      setCrossfade: (durationSec: number) => {
        set((s) => ({
          settings: { ...s.settings, crossfadeDuration: Math.max(0, Math.min(12, durationSec)) },
        }));
      },

      setPlaybackRate: (rate: number) => {
        engineCoordinator.setPlaybackRate(rate);
        set((s) => ({ settings: { ...s.settings, playbackRate: rate } }));
      },

      setSleepTimer: (minutes: number | "end_of_track" | null) => {
        if (sleepTimerInterval) {
          clearInterval(sleepTimerInterval);
          sleepTimerInterval = null;
        }

        if (minutes === "end_of_track") {
          set((s) => ({
            sleepTimerEndOfTrack: true,
            settings: { ...s.settings, sleepTimerMinutes: null },
          }));
          return;
        }

        set({ sleepTimerEndOfTrack: false });

        if (minutes === null || minutes <= 0) {
          set((s) => ({ settings: { ...s.settings, sleepTimerMinutes: null } }));
          return;
        }

        set((s) => ({ settings: { ...s.settings, sleepTimerMinutes: minutes } }));

        sleepTimerInterval = setInterval(() => {
          const currentMin = get().settings.sleepTimerMinutes;
          if (currentMin === null || currentMin <= 1) {
            if (sleepTimerInterval) clearInterval(sleepTimerInterval);
            sleepTimerInterval = null;
            get().pause();
            set((s) => ({ settings: { ...s.settings, sleepTimerMinutes: null } }));
            get().setToastMessage("Sleep timer ended — playback paused");
          } else {
            set((s) => ({
              settings: { ...s.settings, sleepTimerMinutes: currentMin - 1 },
            }));
          }
        }, 60000);
      },

      setPreference: (key, value) => {
        set((s) => ({ settings: { ...s.settings, [key]: value } }));
      },
    }),
    {
      name: "inisai_player_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        queue: state.queue,
        queueIndex: state.queueIndex,
        currentTrack: state.currentTrack,
        playbackContext: state.playbackContext,
        settings: state.settings,
        history: state.history,
      }),
    }
  )
);
