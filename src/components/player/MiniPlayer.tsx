"use client";

import React from "react";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { formatDuration } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  VolumeX,
  ListMusic,
  Mic2,
  Maximize2,
  Sliders,
} from "lucide-react";
import { ArtworkImage } from "@/components/ui/ArtworkImage";

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    settings,
    setVolume,
    toggleMute,
    setFullScreenOpen,
    setActiveDrawerTab,
  } = usePlayerStore();

  const { isLiked, toggleLikeTrack } = useAuthStore();

  const mounted = useMounted();
  const [imgError, setImgError] = React.useState(false);

  if (!mounted || !currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  const artworkSrc =
    !imgError && currentTrack.artworkUrl
      ? currentTrack.artworkUrl
      : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-inisai-dark/90 backdrop-blur-2xl border-t border-white/[0.08] shadow-2xl transition-all duration-300">
      {/* Interactive Progress Scrubber */}
      <div
        className="w-full h-1 bg-white/10 cursor-pointer group relative hover:h-1.5 transition-all"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          seek(ratio * duration);
        }}
        title="Seek position"
      >
        <div
          className="h-full bg-gradient-to-r from-inisai-accent via-purple-500 to-inisai-teal transition-all group-hover:h-1.5"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Track Info & Artwork */}
        <div
          className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1 max-w-[150px] xs:max-w-xs sm:max-w-sm cursor-pointer select-none"
          onClick={() => {
            setActiveDrawerTab("nowPlaying");
            setFullScreenOpen(true);
          }}
        >
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-gradient-to-tr from-purple-950/40 to-black/60 border border-white/10 group">
            <ArtworkImage
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              type="track"
              className={`w-full h-full object-cover ${isPlaying && currentTrack.sourceType !== "youtube" ? "animate-spin-slow" : ""}`}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <h4 className="text-xs sm:text-sm font-semibold text-white truncate hover:underline">
                {currentTrack.title}
              </h4>
              {currentTrack.sourceType === "youtube" && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600/90 text-white flex-shrink-0">
                  YT
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-inisai-muted truncate">
              {currentTrack.artist}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLikeTrack(currentTrack);
            }}
            className="hidden sm:block p-1 text-white/50 hover:text-rose-500 transition-colors cursor-pointer"
            title={liked ? "Unlike" : "Like"}
          >
            <Heart
              className={`w-4 h-4 ${
                liked ? "fill-rose-500 text-rose-500" : ""
              }`}
            />
          </button>
        </div>

        {/* Center Controls */}
        <div className="flex flex-col items-center justify-center space-y-1">
          <div className="flex items-center space-x-3 sm:space-x-5">
            <button
              onClick={prevTrack}
              className="text-white/70 hover:text-white transition-colors p-1 cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black translate-x-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="text-white/70 hover:text-white transition-colors p-1 cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Time indicator (desktop) */}
          <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-inisai-muted">
            <span>{formatDuration(currentTime)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Right Tools (Volume, Lyrics, Queue, Equalizer, Fullscreen) */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          <button
            onClick={() => {
              setActiveDrawerTab("lyrics");
              setFullScreenOpen(true);
            }}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveDrawerTab("queue");
              setFullScreenOpen(true);
            }}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveDrawerTab("equalizer");
              setFullScreenOpen(true);
            }}
            className="hidden sm:block p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Equalizer & Audio FX"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Volume slider (desktop) */}
          <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-white/10">
            <button
              onClick={toggleMute}
              className="text-white/60 hover:text-white cursor-pointer"
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
              className="w-20 accent-inisai-accent h-1 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={() => {
              setActiveDrawerTab("nowPlaying");
              setFullScreenOpen(true);
            }}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Expand Full Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
