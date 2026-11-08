"use client";

import React, { useState } from "react";
import { Track, PlaybackContext } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { Play, Pause, Heart, Plus, ListPlus, Music } from "lucide-react";

interface TrackCardProps {
  track: Track;
  playlistContext?: Track[];
  context?: PlaybackContext;
  carouselItem?: boolean;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  playlistContext,
  context,
  carouselItem = false,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue, playNext } =
    usePlayerStore();
  const { isLiked, toggleLikeTrack } = useAuthStore();
  const [imgError, setImgError] = useState(false);
  const mounted = useMounted();

  const isCurrent = mounted && currentTrack?.id === track.id;
  const liked = mounted && isLiked(track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, playlistContext, context);
    }
  };

  const artworkSrc =
    !imgError && track.artworkUrl
      ? track.artworkUrl
      : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

  return (
    <div
      onClick={handlePlayClick}
      className={`group relative bg-inisai-surface/60 hover:bg-inisai-surfaceElevated/80 backdrop-blur-md p-3 rounded-2xl border border-white/5 hover:border-inisai-accent/40 transition-all duration-300 cursor-pointer flex flex-col space-y-2.5 shadow-sm hover:shadow-xl hover:shadow-inisai-accent/15 ${
        carouselItem
          ? "w-36 xs:w-44 sm:w-48 flex-shrink-0 snap-start"
          : "w-full"
      }`}
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-tr from-purple-950/40 via-black/40 to-slate-900 border border-white/5 shadow-inner">
        {!imgError ? (
          <img
            src={artworkSrc}
            alt={track.title}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
              isCurrent && isPlaying ? "opacity-90" : ""
            }`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-purple-900/30 via-slate-950 to-cyan-900/20 text-inisai-accent">
            <Music className="w-8 h-8 opacity-60 mb-1" />
            <span className="text-[10px] text-inisai-muted font-mono uppercase tracking-wider">
              {track.language || "InIsai"}
            </span>
          </div>
        )}

        {/* Ambient Back Glow on Hover */}
        <div className="absolute inset-0 bg-inisai-accent/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Floating Play Circle Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
            isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            onClick={handlePlayClick}
            className="w-11 h-11 rounded-full bg-inisai-accent text-white flex items-center justify-center shadow-lg shadow-inisai-accent/50 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title={isCurrent && isPlaying ? "Pause" : "Play"}
            aria-label={isCurrent && isPlaying ? "Pause track" : "Play track"}
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
          className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md transition-all cursor-pointer ${
            liked
              ? "opacity-100 text-rose-500"
              : "opacity-0 group-hover:opacity-100 text-white hover:text-rose-500"
          }`}
          title={liked ? "Unlike" : "Like"}
          aria-label={liked ? "Unlike track" : "Like track"}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? "fill-rose-500" : ""}`} />
        </button>
      </div>

      {/* Track Metadata */}
      <div className="flex flex-col min-w-0">
        <h4
          className={`text-sm font-semibold truncate ${
            isCurrent ? "text-inisai-accent" : "text-white"
          }`}
          title={track.title}
        >
          {track.title}
        </h4>
        <p className="text-xs text-inisai-muted truncate mt-0.5" title={track.artist}>
          {track.artist}
        </p>
      </div>

      {/* Quick Add To Queue & Play Next */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-inisai-muted">
        <span className="truncate max-w-[80px]">
          {track.genre || track.language || "Music"}
        </span>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              playNext(track);
            }}
            className="text-white/40 hover:text-inisai-teal p-1 cursor-pointer transition-colors"
            title="Play next"
            aria-label="Play next"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToQueue(track);
            }}
            className="text-white/40 hover:text-inisai-accent p-1 cursor-pointer transition-colors"
            title="Add to queue"
            aria-label="Add to queue"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
