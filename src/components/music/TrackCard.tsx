"use client";

import React from "react";
import Image from "next/image";
import { Track } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { Play, Pause, Heart, MoreHorizontal, Plus } from "lucide-react";

interface TrackCardProps {
  track: Track;
  playlistContext?: Track[];
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  playlistContext,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } =
    usePlayerStore();
  const { isLiked, toggleLikeTrack } = useAuthStore();

  const isCurrent = currentTrack?.id === track.id;
  const liked = isLiked(track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, playlistContext);
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className="group relative bg-inisai-card hover:bg-inisai-cardHover p-3 rounded-2xl border border-white/5 hover:border-inisai-accent/30 transition-all duration-300 cursor-pointer flex flex-col space-y-2.5 shadow-sm hover:shadow-xl hover:shadow-inisai-accent/10"
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40">
        <Image
          src={track.artworkUrl}
          alt={track.title}
          fill
          className={`object-cover group-hover:scale-105 transition-transform duration-500 ${
            isCurrent && isPlaying ? "opacity-90" : ""
          }`}
          sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 240px"
        />

        {/* Hover/Active Play Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
            isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            onClick={handlePlayClick}
            className="w-11 h-11 rounded-full bg-inisai-accent text-white flex items-center justify-center shadow-lg shadow-inisai-accent/50 hover:scale-110 active:scale-95 transition-transform"
            title={isCurrent && isPlaying ? "Pause" : "Play"}
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Quick Like Overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLikeTrack(track);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md transition-all ${
            liked
              ? "opacity-100 text-rose-500"
              : "opacity-0 group-hover:opacity-100 text-white hover:text-rose-500"
          }`}
          title={liked ? "Unlike" : "Like"}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? "fill-rose-500" : ""}`} />
        </button>

        {/* Source Badge */}
        {track.sourceType && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-mono bg-black/60 backdrop-blur-md text-inisai-teal border border-white/10">
            {track.sourceType}
          </span>
        )}
      </div>

      {/* Track Metadata */}
      <div className="flex flex-col min-w-0">
        <h4
          className={`text-sm font-semibold truncate ${
            isCurrent ? "text-inisai-accent" : "text-white"
          }`}
        >
          {track.title}
        </h4>
        <p className="text-xs text-inisai-muted truncate mt-0.5">
          {track.artist}
        </p>
      </div>

      {/* Quick Add To Queue */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-inisai-muted">
        <span>{track.genre || track.language || "Music"}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(track);
          }}
          className="text-white/40 hover:text-inisai-accent p-1"
          title="Add to queue"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
