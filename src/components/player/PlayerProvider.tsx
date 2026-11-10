"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { audioEngine } from "@/lib/audio-engine";

interface PlayerContextValue {
  audioReady: boolean;
}

const PlayerContext = createContext<PlayerContextValue>({ audioReady: false });

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    settings,
    playTrack,
    togglePlay,
    pause,
    resume,
    nextTrack,
    prevTrack,
    seek,
  } = usePlayerStore();

  const isMountedRef = useRef(false);

  // Setup global audio engine listeners and Media Session handlers once at root
  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    // Connect audio engine state change callbacks
    audioEngine.setCallbacks(
      (audioState) => {
        usePlayerStore.setState({
          currentTime: audioState.currentTime,
          duration: audioState.duration || usePlayerStore.getState().currentTrack?.duration || 0,
          buffered: audioState.buffered,
          isPlaying: audioState.isPlaying,
          isLoading: audioState.isLoading,
          error: audioState.error,
        });
      },
      () => {
        // Track ended
        const state = usePlayerStore.getState();
        if (state.repeatMode === "one") {
          state.seek(0);
          audioEngine.play();
        } else {
          state.nextTrack();
        }
      }
    );

    // Media Session API registration
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      audioEngine.setupMediaSessionHandlers({
        onPlay: () => resume(),
        onPause: () => pause(),
        onNext: () => nextTrack(),
        onPrev: () => prevTrack(),
        onSeek: (time) => seek(time),
      });
    }
  }, [resume, pause, nextTrack, prevTrack, seek]);

  // Update Media Session metadata whenever currentTrack changes
  useEffect(() => {
    if (!currentTrack || typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || "InIsai Music",
        artwork: [
          {
            src: currentTrack.artworkUrl || "/icons/icon-192.png",
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });
    } catch (e) {
      console.warn("Failed updating MediaSession metadata:", e);
    }
  }, [currentTrack]);

  // Update Media Session playback state
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {}
  }, [isPlaying]);

  return (
    <PlayerContext.Provider value={{ audioReady: true }}>
      {children}
    </PlayerContext.Provider>
  );
};
