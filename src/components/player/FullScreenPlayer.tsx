"use client";

import React from "react";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { formatDuration } from "@/lib/utils";
import {
  ChevronDown,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  ListMusic,
  Mic2,
  Sliders,
  Radio,
} from "lucide-react";
import { AudioVisualizer } from "./AudioVisualizer";
import { LyricsView } from "./LyricsView";
import { QueueView } from "./QueueView";
import { EqualizerDrawer } from "./EqualizerDrawer";

export const FullScreenPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    repeatMode,
    setRepeatMode,
    isShuffle,
    toggleShuffle,
    settings,
    setVolume,
    toggleMute,
    isFullScreenOpen,
    setFullScreenOpen,
    activeDrawerTab,
    setActiveDrawerTab,
  } = usePlayerStore();

  const { isLiked, toggleLikeTrack } = useAuthStore();
  const mounted = useMounted();
  const [imgError, setImgError] = React.useState(false);

  if (!mounted || !isFullScreenOpen || !currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  const artworkSrc =
    !imgError && currentTrack.artworkUrl
      ? currentTrack.artworkUrl
      : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

  const cycleRepeat = () => {
    if (repeatMode === "off") setRepeatMode("all");
    else if (repeatMode === "all") setRepeatMode("one");
    else setRepeatMode("off");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-inisai-dark/95 backdrop-blur-3xl text-white overflow-hidden transition-all duration-300">
      {/* Dynamic Ambient Blur Backdrop */}
      <div
        className="absolute inset-0 opacity-25 filter blur-3xl scale-125 -z-10 bg-cover bg-center pointer-events-none transition-all duration-700"
        style={{ backgroundImage: `url(${currentTrack.artworkUrl})` }}
      />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <button
          onClick={() => setFullScreenOpen(false)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
          title="Close player"
        >
          <X className="w-4 h-4 text-rose-400" />
          <span className="font-bold">Close</span>
        </button>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 sm:space-x-2 bg-black/40 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveDrawerTab("nowPlaying")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeDrawerTab === "nowPlaying"
                ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Now Playing</span>
          </button>

          <button
            onClick={() => setActiveDrawerTab("lyrics")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeDrawerTab === "lyrics"
                ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>Lyrics</span>
          </button>

          <button
            onClick={() => setActiveDrawerTab("queue")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeDrawerTab === "queue"
                ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Queue</span>
          </button>

          <button
            onClick={() => setActiveDrawerTab("equalizer")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeDrawerTab === "equalizer"
                ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Audio FX</span>
          </button>
        </div>

        {/* Like Button Header */}
        <button
          onClick={() => toggleLikeTrack(currentTrack)}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
          title={liked ? "Unlike" : "Like"}
        >
          <Heart
            className={`w-5 h-5 ${
              liked ? "fill-rose-500 text-rose-500" : ""
            }`}
          />
        </button>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-4 scrollbar-none">
        {activeDrawerTab === "lyrics" && <LyricsView />}
        {activeDrawerTab === "queue" && <QueueView />}
        {activeDrawerTab === "equalizer" && <EqualizerDrawer />}

        {activeDrawerTab === "nowPlaying" && (
          <div className="flex flex-col items-center justify-center max-w-md w-full mx-auto space-y-6">
            {/* Artwork Card */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-2xl shadow-inisai-accent/20 border border-white/10 group bg-gradient-to-tr from-purple-950/40 to-black/60">
              <img
                src={artworkSrc}
                alt={currentTrack.title}
                onError={() => setImgError(true)}
                className={`w-full h-full object-cover ${isPlaying ? "scale-105" : "scale-100"} transition-transform duration-700`}
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] uppercase font-mono tracking-wider text-inisai-teal border border-white/10">
                {currentTrack.sourceType}
              </div>
            </div>

            {/* Track Info */}
            <div className="text-center w-full px-4">
              <h2 className="text-xl sm:text-2xl font-bold truncate">
                {currentTrack.title}
              </h2>
              <p className="text-sm text-inisai-muted mt-1 truncate">
                {currentTrack.artist}
                {currentTrack.album && ` • ${currentTrack.album}`}
              </p>
            </div>

            {/* Audio Visualizer */}
            <div className="w-full max-w-xs">
              <AudioVisualizer className="w-full h-8" />
            </div>

            {/* Progress Bar & Timestamps */}
            <div className="w-full space-y-1">
              <div
                className="w-full h-2 bg-white/10 rounded-full cursor-pointer relative overflow-hidden group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  seek(ratio * duration);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-inisai-accent via-inisai-teal to-inisai-emerald rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-inisai-muted">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between w-full px-2">
              <button
                onClick={toggleShuffle}
                className={`p-2 transition-colors ${
                  isShuffle ? "text-inisai-teal" : "text-white/40 hover:text-white"
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={prevTrack}
                className="p-3 text-white/80 hover:text-white transition-colors"
                title="Previous Track"
              >
                <SkipBack className="w-7 h-7" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-black" />
                ) : (
                  <Play className="w-8 h-8 fill-black translate-x-1" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="p-3 text-white/80 hover:text-white transition-colors"
                title="Next Track"
              >
                <SkipForward className="w-7 h-7" />
              </button>

              <button
                onClick={cycleRepeat}
                className={`p-2 transition-colors ${
                  repeatMode !== "off"
                    ? "text-inisai-accent"
                    : "text-white/40 hover:text-white"
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Volume Row */}
            <div className="flex items-center space-x-3 w-full max-w-xs pt-2">
              <button
                onClick={toggleMute}
                className="text-white/60 hover:text-white"
              >
                {settings.isMuted || settings.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.isMuted ? 0 : settings.volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-inisai-accent h-1.5 bg-white/20 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

