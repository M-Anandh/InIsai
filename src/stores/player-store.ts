import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Track,
  RepeatMode,
  PlayerSettings,
  PlaybackContext,
  EngineId,
  EngineCapabilities,
} from "@/types";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
import { providerRegistry } from "@/music/providers/ProviderRegistry";

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

  // Error recovery
  handleEngineFatalError: (code: string | number, failedTrack: Track) => Promise<void>;
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
  preferAudioFallback: false,
  autoplayRelated: true,
  statsForNerd: false,
  videoMode: false,
};

let sleepTimerInterval: ReturnType<typeof setInterval> | null = null;
const attemptedRecoveries = new Set<string>();

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
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

        // Optional setting: if user prefers background-friendly audio source and track is YouTube,
        // cross-match against direct audio source first while preserving metadata & videoId
        if (
          settings.preferAudioFallback &&
          (trackToPlay.sourceType === "youtube" || trackToPlay.sourceType === "ytmusic" || !trackToPlay.streamUrl)
        ) {
          try {
            const matched = await providerRegistry.findAudioMatch(trackToPlay, "saavn");
            if (matched?.streamUrl) {
              trackToPlay.streamUrl = matched.streamUrl;
              trackToPlay.bitrate = matched.bitrate || "320 kbps Audio";
            }
          } catch {}
        }

        set({
          currentTrack: trackToPlay,
          queue: updatedQueue,
          queueIndex: index,
          playbackContext: resolvedContext,
          isLoading: true,
          error: null,
        });

        const engineUsed = await engineCoordinator.playTrack(trackToPlay, settings);
        set({
          engineId: engineUsed,
          engineCapabilities: { ...engineCoordinator.getCapabilities() },
        });

        // Gapless prebuffer next track if AudioElementEngine
        if (index + 1 < updatedQueue.length) {
          engineCoordinator.prebufferNextTrack(updatedQueue[index + 1]);
        }

        // Update listening history (deduplicated)
        const history = [trackToPlay, ...get().history.filter((t) => t.id !== trackToPlay.id)].slice(0, 60);
        set({ history });

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
          // Attempt automatic alternate version match (cross-provider recovery)
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
        const { isPlaying, currentTrack, queue } = get();
        if (!currentTrack && queue.length > 0) {
          get().playTrack(queue[0]);
          return;
        }
        if (isPlaying) {
          engineCoordinator.pause();
          set({ isPlaying: false });
        } else {
          engineCoordinator.play();
          set({ isPlaying: true });
        }
      },

      pause: () => {
        engineCoordinator.pause();
        set({ isPlaying: false });
      },

      resume: () => {
        engineCoordinator.play();
        set({ isPlaying: true });
      },

      nextTrack: async () => {
        const { queue, queueIndex, repeatMode, currentTrack, settings, sleepTimerEndOfTrack } = get();

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

        await get().playTrack(queue[nextIdx]);
      },

      prevTrack: () => {
        const { queue, queueIndex, currentTime } = get();
        if (queue.length === 0) return;

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
