"use client";

import React, { useState } from "react";
import { Track, PlaybackContext } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { CoverImage } from "@/components/ui/CoverImage";
import { formatDuration } from "@/lib/utils";
import {
  Play,
  Pause,
  Heart,
  Plus,
  Trash2,
  ListPlus,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface TrackRowProps {
  track: Track;
  index?: number;
  playlistContext?: Track[];
  context?: PlaybackContext;
  onRemove?: () => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  playlistContext,
  context,
  onRemove,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue, playNext, setToastMessage } =
    usePlayerStore();
  const { isLiked, toggleLikeTrack } = useAuthStore();
  const mounted = useMounted();
  const [menuOpen, setMenuOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const isCurrent = mounted && currentTrack?.id === track.id;
  const liked = mounted && isLiked(track.id);

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    } catch {}
  };

  const handleClick = () => {
    triggerHaptic();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, playlistContext, context);
    }
  };

  const hasVersions = Array.isArray(track.versions) && track.versions.length > 0;

  return (
    <div className="space-y-1.5">
      <div
        onClick={handleClick}
        className={`group relative min-h-[64px] flex items-center justify-between px-3 py-2 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
          isCurrent
            ? "bg-inisai-accent/15 border-inisai-accent/40 shadow-sm"
            : "bg-white/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.07]"
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {index !== undefined && (
            <div className="hidden sm:flex w-6 items-center justify-center flex-shrink-0">
              {isCurrent && isPlaying ? (
                <div className="flex items-end space-x-0.5 h-3.5" aria-label="Playing">
                  <span className="w-0.5 h-3 bg-inisai-accent rounded-full animate-pulse" />
                  <span className="w-0.5 h-2 bg-inisai-teal rounded-full animate-pulse delay-75" />
                  <span className="w-0.5 h-3.5 bg-inisai-accent rounded-full animate-pulse delay-150" />
                </div>
              ) : (
                <span className="text-xs font-mono text-slate-400 dark:text-inisai-muted/70">
                  {index + 1}
                </span>
              )}
            </div>
          )}

          {/* 48x48 Thumbnail */}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-white/10">
            <CoverImage
              src={track.artworkUrl}
              alt={track.title}
              youtubeVideoId={track.youtubeVideoId}
              type="track"
              aspect="square"
            />
            <div
              className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {isCurrent && isPlaying ? (
                <Pause className="w-4 h-4 fill-white text-white" />
              ) : (
                <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
              )}
            </div>
          </div>

          {/* Title & Artist • Album */}
          <div className="min-w-0 flex-1">
            <h4
              className={`text-sm font-semibold truncate ${
                isCurrent ? "text-inisai-accent" : "text-slate-900 dark:text-white"
              }`}
            >
              {track.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-inisai-muted truncate mt-0.5">
              {track.artist}
              {track.album && track.album !== "YouTube Music" && ` • ${track.album}`}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2 pl-2 flex-shrink-0">
          {hasVersions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVersionsOpen((v) => !v);
              }}
              className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-white/5 text-[10px] font-medium text-slate-600 dark:text-white/70 hover:text-inisai-accent cursor-pointer"
              title="Toggle other versions"
            >
              <span>+{track.versions!.length}</span>
              {versionsOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}

          {/* Like button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              toggleLikeTrack(track);
            }}
            aria-label={liked ? "Unlike song" : "Like song"}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              liked
                ? "text-rose-500"
                : "hidden sm:inline-flex text-slate-400 dark:text-white/40 hover:text-rose-500"
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} />
          </button>

          <span className="hidden xs:inline-block text-xs font-mono text-slate-400 dark:text-inisai-muted w-10 text-right">
            {formatDuration(track.duration)}
          </span>

          {/* Overflow Context Menu Button (Touch-friendly >=44px area) */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              aria-label="Track options"
              className="p-2.5 rounded-xl text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-11 z-40 w-48 rounded-2xl bg-white dark:bg-[#1C1928] border border-slate-200 dark:border-white/15 shadow-2xl p-1.5 text-xs font-medium text-slate-800 dark:text-white space-y-0.5"
              >
                <button
                  onClick={() => {
                    triggerHaptic();
                    toggleLikeTrack(track);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Heart className={`w-3.5 h-3.5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                  <span>{liked ? "Remove from Liked" : "Like Song"}</span>
                </button>
                <button
                  onClick={() => {
                    playNext(track);
                    setToastMessage(`Playing "${track.title}" next`);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ListPlus className="w-3.5 h-3.5 text-inisai-teal" />
                  <span>Play Next</span>
                </button>
                <button
                  onClick={() => {
                    addToQueue(track);
                    setToastMessage(`Added "${track.title}" to queue`);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-inisai-accent" />
                  <span>Add to Queue</span>
                </button>
                {hasVersions && (
                  <button
                    onClick={() => {
                      setVersionsOpen((v) => !v);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>More versions ({track.versions!.length})</span>
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={() => {
                      onRemove();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsed "More versions" drawer */}
      {versionsOpen && hasVersions && (
        <div className="pl-6 sm:pl-10 space-y-1.5 border-l-2 border-inisai-accent/30 ml-4">
          {track.versions!.map((alt, i) => (
            <TrackRow
              key={`${alt.id}-alt-${i}`}
              track={alt}
              playlistContext={playlistContext}
              context={context}
            />
          ))}
        </div>
      )}
    </div>
  );
};
