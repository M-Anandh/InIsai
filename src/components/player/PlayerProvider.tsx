"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
import { recordSignal } from "@/lib/personalization/signal-tracker";

interface PlayerContextValue {
  audioReady: boolean;
}

const PlayerContext = createContext<PlayerContextValue>({ audioReady: false });

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentTrack,
    isPlaying,
    toastMessage,
    engineId,
    isFullScreenOpen,
    pause,
    resume,
    nextTrack,
    prevTrack,
    seek,
    setToastMessage,
    handleEngineFatalError,
  } = usePlayerStore();

  const isMountedRef = useRef(false);
  const intendedPlayingBeforeBackgroundRef = useRef(false);

  // Setup persistent EngineCoordinator & Media Session handlers once at root
  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    engineCoordinator.setCallbacks(
      (engineState) => {
        const currentStore = usePlayerStore.getState();
        usePlayerStore.setState({
          currentTime: engineState.currentTime,
          duration: engineState.duration || currentStore.currentTrack?.duration || 0,
          buffered: engineState.buffered,
          isPlaying: engineState.isPlaying,
          isLoading: engineState.isLoading,
          error: engineState.error,
          engineId: engineState.engineId,
          engineCapabilities: { ...engineCoordinator.getCapabilities() },
          videoQuality: engineState.videoQuality,
          latencyMs: engineState.latencyMs,
        });
      },
      () => {
        const state = usePlayerStore.getState();
        if (state.currentTrack) {
          recordSignal(state.repeatMode === "one" ? "repeat" : "completion", state.currentTrack);
        }
        if (state.repeatMode === "one") {
          state.seek(0);
          engineCoordinator.play();
        } else {
          state.nextTrack();
        }
      },
      (code, track) => {
        usePlayerStore.getState().handleEngineFatalError(code, track);
      }
    );

    engineCoordinator.setupMediaSessionHandlers({
      onPlay: () => usePlayerStore.getState().resume(),
      onPause: () => usePlayerStore.getState().pause(),
      onNext: () => usePlayerStore.getState().nextTrack(),
      onPrev: () => usePlayerStore.getState().prevTrack(),
      onSeek: (time) => usePlayerStore.getState().seek(time),
    });

    // Mobile/PWA visibility resilience: NEVER pause on background; attempt clean resume on foreground return
    const handleVisibilityChange = () => {
      const state = usePlayerStore.getState();
      if (document.visibilityState === "hidden") {
        intendedPlayingBeforeBackgroundRef.current = state.isPlaying;
      } else if (document.visibilityState === "visible") {
        if (intendedPlayingBeforeBackgroundRef.current && state.currentTrack && !state.isPlaying) {
          engineCoordinator.play();
          if (state.engineId === "youtube" && !state.settings.preferAudioFallback) {
            state.setToastMessage(
              "Background play works best with the InIsai audio source (Settings → Sources)"
            );
          }
        }
        intendedPlayingBeforeBackgroundRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resume, pause, nextTrack, prevTrack, seek, setToastMessage, handleEngineFatalError]);

  // Keep WakeLock synchronized cleanly while FullScreen player is open and playing
  useEffect(() => {
    engineCoordinator.setWakeLock(isFullScreenOpen && isPlaying);
  }, [isFullScreenOpen, isPlaying]);

  return (
    <PlayerContext.Provider value={{ audioReady: true }}>
      {children}

      {/* Non-intrusive global player toast notification (error recovery / sleep timer / mobile bg hint) */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-full bg-slate-900/95 dark:bg-[#1C1928]/95 text-white text-xs font-medium border border-white/15 shadow-2xl backdrop-blur-xl flex items-center space-x-2 max-w-[90vw] truncate animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-inisai-accent flex-shrink-0 animate-pulse" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}
    </PlayerContext.Provider>
  );
};
