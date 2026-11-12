"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
import {
  audioElementEngine,
  PERSISTENT_AUDIO_ELEMENT_ID,
} from "@/lib/player/AudioElementEngine";

interface PlayerContextValue {
  audioReady: boolean;
}

const PlayerContext = createContext<PlayerContextValue>({ audioReady: false });

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    toastMessage,
    isPlaying,
    isFullScreenOpen,
  } = usePlayerStore();

  const isMountedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bind persistent root DOM <audio> and EngineCoordinator / Media Session handlers once
  useEffect(() => {
    if (audioRef.current) {
      audioElementEngine.bindDomElement(audioRef.current);
    }

    if (isMountedRef.current) return;
    isMountedRef.current = true;

    engineCoordinator.setCallbacks(
      (engineState) => {
        const currentStore = usePlayerStore.getState();
        const dur = engineState.duration || currentStore.currentTrack?.duration || 0;
        usePlayerStore.setState({
          currentTime: engineState.currentTime,
          duration: dur,
          buffered: engineState.buffered,
          isPlaying: engineState.isPlaying,
          isLoading: engineState.isLoading,
          error: engineState.error,
          engineId: engineState.engineId,
          engineCapabilities: { ...engineCoordinator.getCapabilities() },
          videoQuality: engineState.videoQuality,
          latencyMs: engineState.latencyMs,
        });
        currentStore.preResolveNextTrackIfNeeded(engineState.currentTime, dur);
      },
      () => {
        usePlayerStore.getState().handleTrackEndedFastAdvance();
      },
      (code, track) => {
        void usePlayerStore.getState().handleEngineFatalError(code, track);
      }
    );

    engineCoordinator.setupMediaSessionHandlers({
      onPlay: () => usePlayerStore.getState().resume(),
      onPause: () => usePlayerStore.getState().pause(),
      onNext: () => void usePlayerStore.getState().nextTrack(),
      onPrev: () => usePlayerStore.getState().prevTrack(),
      onSeek: (time) => usePlayerStore.getState().seek(time),
    });

    // Background resilience: NEVER pause on visibilitychange / blur / pagehide / freeze.
    // On returning visible, if !userPaused and OS paused active audio, resume cleanly.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const state = usePlayerStore.getState();
      if (!state.currentTrack || state.userPaused) return;

      if (state.engineId === "audio") {
        if (engineCoordinator.isAudioElementPaused()) {
          engineCoordinator.play();
        }
      } else if (state.engineId === "youtube" && !state.isPlaying) {
        engineCoordinator.play();
        state.setToastMessage("Some songs only play while the app is open");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Keep WakeLock synchronized cleanly while FullScreen player is open and playing
  useEffect(() => {
    engineCoordinator.setWakeLock(isFullScreenOpen && isPlaying);
  }, [isFullScreenOpen, isPlaying]);

  return (
    <PlayerContext.Provider value={{ audioReady: true }}>
      {/* Single persistent DOM audio element reused across tracks to maintain mobile OS session */}
      <audio
        ref={audioRef}
        id={PERSISTENT_AUDIO_ELEMENT_ID}
        playsInline
        preload="auto"
        aria-hidden="true"
        className="hidden"
      />
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
