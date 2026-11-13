"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
import {
  audioElementEngine,
  PERSISTENT_AUDIO_ELEMENT_ID,
} from "@/lib/player/AudioElementEngine";
import { loadPersistedSession } from "@/lib/player/session-persistence";

interface PlayerContextValue {
  audioReady: boolean;
}

const PlayerContext = createContext<PlayerContextValue>({ audioReady: false });

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    toastMessage,
    youtubeBackgroundWarning,
    setYoutubeBackgroundWarning,
    switchToAudioVersion,
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

        // Throttled session save during active playback
        if (engineState.isPlaying) {
          currentStore.persistCurrentSession(false);
        }
      },
      () => {
        usePlayerStore.getState().handleTrackEndedFastAdvance();
      },
      (code, track) => {
        void usePlayerStore.getState().handleEngineFatalError(code, track);
      }
    );

    engineCoordinator.setupMediaSessionHandlers({
      onPlay: () => void usePlayerStore.getState().ensureReadyAndPlay(),
      onPause: () => usePlayerStore.getState().pause(),
      onNext: () => void usePlayerStore.getState().nextTrack(),
      onPrev: () => usePlayerStore.getState().prevTrack(),
      onSeek: (time) => usePlayerStore.getState().seek(time),
    });

    // Restore persisted playback session on launch
    loadPersistedSession().then((session) => {
      if (session && session.currentTrack) {
        usePlayerStore.getState().restoreSession(session);
      }
    });

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        loadPersistedSession().then((session) => {
          if (session && session.currentTrack) {
            usePlayerStore.getState().restoreSession(session);
          }
        });
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    // Background resilience: NEVER pause on visibilitychange / blur / pagehide / freeze.
    // On returning visible, if !userPaused and OS paused active audio, resume cleanly.
    const handleVisibilityChange = () => {
      const state = usePlayerStore.getState();
      if (!state.currentTrack) return;

      if (document.hidden) {
        // App backgrounded / page hidden
        if (state.engineId === "youtube" && state.isPlaying) {
          state.setYoutubeBackgroundWarning({
            visible: true,
            message:
              "This song plays only while InIsai is open. Choose the audio version for background play.",
            actionText: "Switch to Audio",
          });
        }
        state.persistCurrentSessionSync();
      } else {
        // Returning to foreground
        if (!state.userPaused) {
          if (state.engineId === "audio") {
            if (engineCoordinator.isAudioElementPaused()) {
              engineCoordinator.play();
            }
          } else if (state.engineId === "youtube" && !state.isPlaying) {
            engineCoordinator.play();
          }
        }
      }
    };

    const handleExit = () => {
      usePlayerStore.getState().persistCurrentSessionSync();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleExit);
    window.addEventListener("freeze", handleExit);
    window.addEventListener("beforeunload", handleExit);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handleExit);
      window.removeEventListener("freeze", handleExit);
      window.removeEventListener("beforeunload", handleExit);
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

      {/* Explicit YouTube Background Playback Alert with Switch-to-Audio CTA */}
      {youtubeBackgroundWarning && youtubeBackgroundWarning.visible && (
        <div
          role="alert"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[75] w-[92vw] max-w-md p-3.5 rounded-2xl bg-slate-900/95 dark:bg-[#1C1928]/95 border border-amber-500/35 text-white shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200"
          data-testid="yt-background-warning"
        >
          <div className="flex items-start space-x-2.5 min-w-0 flex-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0 mt-1 animate-pulse" />
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight text-white">
                {youtubeBackgroundWarning.message}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              onClick={() => void switchToAudioVersion()}
              className="px-3 py-1.5 rounded-xl bg-inisai-accent hover:bg-inisai-accent/90 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              data-testid="btn-switch-audio-version"
            >
              {youtubeBackgroundWarning.actionText || "Switch to Audio"}
            </button>
            <button
              onClick={() => setYoutubeBackgroundWarning(null)}
              className="p-1 rounded-lg text-white/50 hover:text-white cursor-pointer"
              aria-label="Dismiss warning"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
