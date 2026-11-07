"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Track } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatDuration } from "@/lib/utils";
import { Play, Pause, Heart, Plus, Trash2 } from "lucide-react";

interface TrackRowProps {
  track: Track;
  index?: number;
  playlistContext?: Track[];
  onRemove?: () => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  playlistContext,
  onRemove,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } =
    usePlayerStore();
  const { isLiked, toggleLikeTrack } = useAuthStore();
  const [imgError, setImgError] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const liked = isLiked(track.id);

  const handleClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, playlistContext);
    }
  };

  const artworkSrc =
    !imgError && track.artworkUrl
      ? track.artworkUrl
      : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
        isCurrent
          ? "bg-inisai-accent/15 border-inisai-accent/40 shadow-sm"
          : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
      }`}
    >
      <div className="flex items-center space-x-3.5 min-w-0 flex-1">
        {index !== undefined && (
          <span className="hidden sm:inline-block w-5 text-center text-xs font-mono text-inisai-muted/60">
            {index + 1}
          </span>
        )}

        {/* Thumbnail with overlay play */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-tr from-purple-950/40 to-black/60 border border-white/5">
          <Image
            src={artworkSrc}
            alt={track.title}
            fill
            onError={() => setImgError(true)}
            className="object-cover"
            sizes="48px"
          />
          <div
            className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
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

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <h4
            className={`text-sm font-semibold truncate ${
              isCurrent ? "text-inisai-accent" : "text-white"
            }`}
          >
            {track.title}
          </h4>
          <p className="text-xs text-inisai-muted truncate mt-0.5">
            {track.artist}
            {track.album && ` • ${track.album}`}
          </p>
        </div>
      </div>

      {/* Right meta and actions */}
      <div className="flex items-center space-x-3 pl-3">
        {track.language && (
          <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-inisai-muted">
            {track.language}
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLikeTrack(track);
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            liked
              ? "text-rose-500"
              : "text-white/30 hover:text-rose-500 opacity-0 group-hover:opacity-100"
          }`}
          title={liked ? "Unlike" : "Like"}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(track);
          }}
          className="p-1.5 rounded-lg text-white/30 hover:text-inisai-accent opacity-0 group-hover:opacity-100 transition-colors"
          title="Add to queue"
        >
          <Plus className="w-4 h-4" />
        </button>

        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <span className="text-xs font-mono text-inisai-muted w-10 text-right">
          {formatDuration(track.duration)}
        </span>
      </div>
    </div>
  );
};
