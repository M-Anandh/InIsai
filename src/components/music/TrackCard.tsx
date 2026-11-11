"use client";

import React, { useState } from "react";
import { Track, PlaybackContext } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import { useLikesStore } from "@/stores/likes-store";
import { useAddToPlaylistStore } from "@/stores/add-to-playlist-store";
import { useMounted } from "@/hooks/use-mounted";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { Play, Pause, Heart, Plus, ListPlus, FolderPlus } from "lucide-react";

interface TrackCardProps {
  track: Track;
  playlistContext?: Track[];
  context?: PlaybackContext;
  carouselItem?: boolean;
  index?: number;
  eager?: boolean;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  playlistContext,
  context,
  carouselItem = false,
  index,
  eager,
}) => {
  const isEager = eager || (index !== undefined && index < 6);
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue, playNext, setToastMessage } =
    usePlayerStore();
  const { isLiked, toggleLike } = useLikesStore();
  const [imgError, setImgError] = useState(false);
  const mounted = useMounted();

  const isCurrent = mounted && currentTrack?.id === track.id;
  const liked = mounted && isLiked(track);

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
      className={`group relative bg-white/80 dark:bg-inisai-surface/65 hover:bg-white dark:hover:bg-inisai-surfaceElevated backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-inisai-accent/40 transition-all duration-300 cursor-pointer flex flex-col space-y-2.5 shadow-sm hover:shadow-xl ${
        carouselItem
          ? "w-36 xs:w-44 sm:w-48 flex-shrink-0 snap-start"
          : "w-full"
      }`}
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 shadow-inner">
        <ArtworkImage
          src={track.artworkUrl}
          alt={track.title}
          youtubeVideoId={track.youtubeVideoId}
          type="track"
          aspect="square"
          eager={isEager}
          className={`group-hover:scale-105 transition-transform duration-500 ${
            isCurrent && isPlaying ? "opacity-90" : ""
          }`}
        />

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
            toggleLike(track, setToastMessage);
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
            isCurrent ? "text-inisai-accent" : "text-slate-900 dark:text-white"
          }`}
          title={track.title}
        >
          {track.title}
        </h4>
        <p className="text-xs text-slate-500 dark:text-inisai-muted truncate mt-0.5" title={track.artist}>
          {track.artist}
        </p>
      </div>

      {/* Quick Add To Queue & Play Next & Add to Playlist */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-inisai-muted">
        <span className="truncate max-w-[80px]">
          {track.genre || track.language || "Music"}
        </span>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              useAddToPlaylistStore.getState().open(track);
            }}
            className="text-white/40 hover:text-inisai-accent p-1 cursor-pointer transition-colors"
            title="Add to playlist"
            aria-label="Add to playlist"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
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
