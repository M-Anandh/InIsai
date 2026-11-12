"use client";

import React, { useRef } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { useLikesStore } from "@/stores/likes-store";
import { useMounted } from "@/hooks/use-mounted";
import { useHoldToSeek } from "@/hooks/use-hold-to-seek";
import { CoverImage } from "@/components/ui/CoverImage";
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
    isFullScreenOpen,
    setFullScreenOpen,
    setActiveDrawerTab,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLikesStore();
  const mounted = useMounted();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const haptic = () => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    } catch {}
  };

  const prevHold = useHoldToSeek({
    onTap: () => {
      haptic();
      if (currentTime > 3) {
        seek(0);
      } else {
        prevTrack();
      }
    },
    onSeekRelative: (delta) => {
      haptic();
      seek(Math.max(0, Math.min(duration || 0, currentTime + delta)));
    },
  });

  const nextHold = useHoldToSeek({
    onTap: () => {
      haptic();
      nextTrack();
    },
    onSeekRelative: (delta) => {
      haptic();
      seek(Math.max(0, Math.min(duration || 0, currentTime + delta)));
    },
  });

  if (!mounted || !currentTrack || isFullScreenOpen) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const liked = isLiked(currentTrack);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dy) > 40 && dy < 0 && Math.abs(dy) > Math.abs(dx)) {
      // Swipe up to expand player
      setActiveDrawerTab("nowPlaying");
      setFullScreenOpen(true);
    } else if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      haptic();
      if (dx < 0) nextTrack();
      else prevTrack();
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed bottom-[76px] md:bottom-3 left-3 right-3 md:left-[268px] md:right-4 z-40 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/[0.12] shadow-2xl overflow-hidden transition-all duration-300 select-none"
      role="region"
      aria-label="Mini Music Player"
    >
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3">
        {/* Track Info & Cover (Tap to expand) */}
        <div
          onClick={() => {
            setActiveDrawerTab("nowPlaying");
            setFullScreenOpen(true);
          }}
          role="button"
          tabIndex={0}
          aria-label="Expand full screen player"
          data-testid="mini-player-expand"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveDrawerTab("nowPlaying");
              setFullScreenOpen(true);
            }
          }}
          className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer group"
        >
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-md flex-shrink-0 border border-slate-200/60 dark:border-white/10">
            <CoverImage
              id={currentTrack.id}
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              youtubeVideoId={currentTrack.youtubeVideoId}
              kind="song"
              aspect="square"
            />
            <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {currentTrack.title}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-inisai-muted truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Mobile Compact Controls (<= 3 touch targets cleanly) */}
        <div className="flex md:hidden items-center space-x-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              haptic();
              togglePlay();
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-11 h-11 rounded-full bg-inisai-accent text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              haptic();
              nextTrack();
            }}
            aria-label="Next Track"
            className="w-11 h-11 rounded-full flex items-center justify-center text-slate-700 dark:text-white/80 hover:bg-slate-200/70 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Center Transport Controls */}
        <div className="hidden md:flex flex-col items-center justify-center space-y-0.5 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onMouseDown={() => prevHold.start(-1)}
              onMouseUp={prevHold.stop}
              onMouseLeave={prevHold.stop}
              onTouchStart={() => prevHold.start(-1)}
              onTouchEnd={prevHold.stop}
              aria-label="Previous Track (Hold to rewind)"
              className="p-1.5 text-slate-600 dark:text-white/75 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer relative"
            >
              <SkipBack className="w-4 h-4" />
              {prevHold.isHolding && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white whitespace-nowrap">
                  {prevHold.accumulatedSeconds}s &lt;&lt;
                </span>
              )}
            </button>

            <button
              onClick={() => {
                haptic();
                togglePlay();
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="w-9 h-9 rounded-full bg-inisai-accent dark:bg-white text-white dark:text-black flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              onMouseDown={() => nextHold.start(1)}
              onMouseUp={nextHold.stop}
              onMouseLeave={nextHold.stop}
              onTouchStart={() => nextHold.start(1)}
              onTouchEnd={nextHold.stop}
              aria-label="Next Track (Hold to fast forward)"
              className="p-1.5 text-slate-600 dark:text-white/75 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer relative"
            >
              <SkipForward className="w-4 h-4" />
              {nextHold.isHolding && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white whitespace-nowrap">
                  &gt;&gt; +{nextHold.accumulatedSeconds}s
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-500 dark:text-inisai-muted">
            <span>{formatDuration(currentTime)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Desktop Right Tools & Fine-Pointer Volume */}
        <div className="hidden md:flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={() => {
              haptic();
              toggleLike(currentTrack);
            }}
            aria-label={liked ? "Unlike" : "Like"}
            className="p-2 rounded-xl text-slate-500 dark:text-white/60 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>

          <button
            onClick={() => {
              setActiveDrawerTab("lyrics");
              setFullScreenOpen(true);
            }}
            aria-label="Open Lyrics"
            className="p-2 rounded-xl text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveDrawerTab("queue");
              setFullScreenOpen(true);
            }}
            aria-label="Open Queue"
            className="p-2 rounded-xl text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveDrawerTab("equalizer");
              setFullScreenOpen(true);
            }}
            aria-label="Audio Effects"
            className="p-2 rounded-xl text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Volume Slider strictly on fine-pointer desktop devices */}
          <div className="hidden [@media(pointer:fine)]:flex items-center space-x-1.5 pl-2 border-l border-slate-200 dark:border-white/10">
            <button
              onClick={toggleMute}
              aria-label={settings.isMuted ? "Unmute" : "Mute"}
              className="text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {settings.isMuted || settings.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              aria-label="Volume"
              value={settings.isMuted ? 0 : settings.volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 accent-inisai-accent h-1 bg-slate-200 dark:bg-white/20 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={() => {
              setActiveDrawerTab("nowPlaying");
              setFullScreenOpen(true);
            }}
            aria-label="Expand Player"
            className="p-2 rounded-xl text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thin Bottom Interactive Scrubber Line */}
      <div
        className="w-full h-1 bg-slate-200/80 dark:bg-white/10 cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          if (duration <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          seek(ratio * duration);
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-[#FF8A3D] via-[#FF3D77] to-[#7A5CFF] transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
