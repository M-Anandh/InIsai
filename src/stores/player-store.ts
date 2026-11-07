import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Track, RepeatMode, PlayerSettings } from "@/types";
import { audioEngine } from "@/lib/audio-engine";
import { musicSourceManager } from "@/music/adapters/MusicSourceManager";

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

interface PlayerState {
  // Current playback
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  error: string | null;

  // Queue
  queue: Track[];
  queueIndex: number;
  originalQueue: Track[];
  history: Track[];

  // Modes
  repeatMode: RepeatMode;
  isShuffle: boolean;

  // UI state
  isFullScreenOpen: boolean;
  activeDrawerTab: "nowPlaying" | "queue" | "lyrics" | "equalizer";

  // Audio settings
  settings: PlayerSettings;

  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
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

  // Equalizer & FX
  setEQPreset: (presetKey: string) => void;
  setEQBand: (bandIndex: number, gainDb: number) => void;
  setBassBoost: (val: number) => void;
  setTrebleBoost: (val: number) => void;
  toggleEqualizer: (enabled?: boolean) => void;
  setCrossfade: (durationSec: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimer: (minutes: number | null) => void;
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
};

let sleepTimerInterval: NodeJS.Timeout | null = null;

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => {
      // Wire audio engine event listeners
      if (typeof window !== "undefined") {
        audioEngine.setCallbacks(
          (audioState) => {
            set({
              currentTime: audioState.currentTime,
              duration: audioState.duration || get().currentTrack?.duration || 0,
              buffered: audioState.buffered,
              isPlaying: audioState.isPlaying,
              isLoading: audioState.isLoading,
              error: audioState.error,
            });
          },
          () => {
            // Track ended handler
            const { repeatMode, nextTrack, seek } = get();
            if (repeatMode === "one") {
              seek(0);
              audioEngine.play();
            } else {
              nextTrack();
            }
          }
        );

        // Media Session controls
        audioEngine.setupMediaSessionHandlers({
          onPlay: () => get().resume(),
          onPause: () => get().pause(),
          onNext: () => get().nextTrack(),
          onPrev: () => get().prevTrack(),
          onSeek: (time) => get().seek(time),
        });
      }

      return {
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        buffered: 0,
        error: null,

        queue: [],
        queueIndex: -1,
        originalQueue: [],
        history: [],

        repeatMode: "off",
        isShuffle: false,

        isFullScreenOpen: false,
        activeDrawerTab: "nowPlaying",

        settings: defaultSettings,

        playTrack: async (track: Track, newQueue?: Track[]) => {
          let updatedQueue = newQueue ? [...newQueue] : get().queue;
          let index = updatedQueue.findIndex((t) => t.id === track.id);

          if (index === -1) {
            updatedQueue = [track, ...updatedQueue];
            index = 0;
          }

          set({
            currentTrack: track,
            queue: updatedQueue,
            queueIndex: index,
            isLoading: true,
            error: null,
          });

          // Resolve playable stream URL
          const resolvedStream = await musicSourceManager.resolveStreamUrl(track);
          const { crossfadeDuration } = get().settings;

          await audioEngine.playTrack(track, resolvedStream, crossfadeDuration);

          // Update history
          const history = [track, ...get().history.filter((t) => t.id !== track.id)].slice(0, 50);
          set({ history });

          // Auto-Radio recommendation: If queue has only 1 or 2 items, fetch recommended tracks
          if (updatedQueue.length <= 2) {
            try {
              const recoRes = await fetch(
                `/api/music/recommend?id=${encodeURIComponent(
                  track.sourceId || ""
                )}&artist=${encodeURIComponent(track.artist || "")}`
              );
              if (recoRes.ok) {
                const recoData = await recoRes.json();
                const recoTracks: Track[] = (recoData.results || []).filter(
                  (rt: Track) => rt.id !== track.id
                );
                if (recoTracks.length > 0) {
                  set((s) => ({ queue: [...s.queue, ...recoTracks] }));
                }
              }
            } catch (err) {
              console.warn("Auto-radio recommendation fetch failed:", err);
            }
          }
        },

        togglePlay: () => {
          const { isPlaying, currentTrack, queue } = get();
          if (!currentTrack && queue.length > 0) {
            get().playTrack(queue[0]);
            return;
          }
          if (isPlaying) {
            audioEngine.pause();
          } else {
            audioEngine.play();
          }
        },

        pause: () => audioEngine.pause(),
        resume: () => audioEngine.play(),

        nextTrack: async () => {
          const { queue, queueIndex, repeatMode, currentTrack } = get();
          if (queue.length === 0) return;

          let nextIdx = queueIndex + 1;
          if (nextIdx >= queue.length) {
            if (repeatMode === "all") {
              nextIdx = 0;
            } else {
              // Try to fetch more recommendations seamlessly
              try {
                const recoRes = await fetch(
                  `/api/music/recommend?id=${encodeURIComponent(
                    currentTrack?.sourceId || ""
                  )}&artist=${encodeURIComponent(currentTrack?.artist || "")}`
                );
                if (recoRes.ok) {
                  const recoData = await recoRes.json();
                  const newTracks = (recoData.results || []).filter(
                    (rt: Track) => !queue.some((q) => q.id === rt.id)
                  );
                  if (newTracks.length > 0) {
                    const expandedQueue = [...queue, ...newTracks];
                    set({ queue: expandedQueue });
                    get().playTrack(expandedQueue[nextIdx]);
                    return;
                  }
                }
              } catch {}
              audioEngine.pause();
              return;
            }
          }

          get().playTrack(queue[nextIdx]);
        },

        prevTrack: () => {
          const { queue, queueIndex, currentTime } = get();
          if (queue.length === 0) return;

          // If playing for >3s, restart track
          if (currentTime > 3) {
            get().seek(0);
            return;
          }

          let prevIdx = queueIndex - 1;
          if (prevIdx < 0) {
            prevIdx = queue.length - 1;
          }

          get().playTrack(queue[prevIdx]);
        },

        seek: (seconds: number) => {
          audioEngine.seek(seconds);
          set({ currentTime: seconds });
        },

        setVolume: (vol: number) => {
          audioEngine.setVolume(vol);
          set((s) => ({ settings: { ...s.settings, volume: vol, isMuted: false } }));
        },

        toggleMute: () => {
          const newMuted = !get().settings.isMuted;
          audioEngine.setMuted(newMuted);
          set((s) => ({ settings: { ...s.settings, isMuted: newMuted } }));
        },

        setRepeatMode: (mode: RepeatMode) => {
          set((s) => ({ repeatMode: mode, settings: { ...s.settings, repeatMode: mode } }));
        },

        toggleShuffle: () => {
          const isShuffled = !get().isShuffle;
          const { queue, currentTrack } = get();

          if (isShuffled) {
            // Shuffle keeping current track first
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
            // Restore original queue
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

        setFullScreenOpen: (open: boolean) => set({ isFullScreenOpen: open }),
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
          audioEngine.setEqualizer(newSettings);
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
          audioEngine.setEqualizer(newSettings);
          set({ settings: newSettings });
        },

        setBassBoost: (val: number) => {
          const newSettings = {
            ...get().settings,
            bassBoost: val,
            equalizerEnabled: true,
          };
          audioEngine.setEqualizer(newSettings);
          set({ settings: newSettings });
        },

        setTrebleBoost: (val: number) => {
          const newSettings = {
            ...get().settings,
            trebleBoost: val,
            equalizerEnabled: true,
          };
          audioEngine.setEqualizer(newSettings);
          set({ settings: newSettings });
        },

        toggleEqualizer: (enabled) => {
          const isEnabled = enabled !== undefined ? enabled : !get().settings.equalizerEnabled;
          const newSettings = { ...get().settings, equalizerEnabled: isEnabled };
          audioEngine.setEqualizer(newSettings);
          set({ settings: newSettings });
        },

        setCrossfade: (durationSec: number) => {
          set((s) => ({
            settings: { ...s.settings, crossfadeDuration: Math.max(0, Math.min(12, durationSec)) },
          }));
        },

        setPlaybackRate: (rate: number) => {
          audioEngine.setPlaybackRate(rate);
          set((s) => ({ settings: { ...s.settings, playbackRate: rate } }));
        },

        setSleepTimer: (minutes: number | null) => {
          if (sleepTimerInterval) {
            clearInterval(sleepTimerInterval);
            sleepTimerInterval = null;
          }

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
            } else {
              set((s) => ({
                settings: { ...s.settings, sleepTimerMinutes: currentMin - 1 },
              }));
            }
          }, 60000);
        },
      };
    },
    {
      name: "inisai_player_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        queue: state.queue,
        queueIndex: state.queueIndex,
        currentTrack: state.currentTrack,
        settings: state.settings,
        history: state.history,
      }),
    }
  )
);

