"use client";

import React from "react";
import { Playlist } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { Play } from "lucide-react";

interface PlaylistCardProps {
  playlist: Playlist;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const { playTrack } = usePlayerStore();

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks, {
        id: `playlist-${playlist.id}`,
        type: "playlist",
        title: playlist.name,
      });
    }
  };

  return (
    <div
      onClick={handlePlay}
      className="group relative bg-inisai-surface/60 hover:bg-inisai-surfaceElevated/90 backdrop-blur-md p-3.5 rounded-2xl border border-white/5 hover:border-inisai-teal/40 transition-all duration-300 cursor-pointer flex flex-col space-y-3 shadow-sm hover:shadow-xl hover:shadow-inisai-teal/15"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 shadow-inner">
        <ArtworkImage
          src={playlist.artworkUrl}
          alt={playlist.name}
          fallbackTracks={playlist.tracks}
          type="playlist"
          className="group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handlePlay}
            className="w-12 h-12 rounded-full bg-inisai-teal text-black flex items-center justify-center shadow-lg shadow-inisai-teal/40 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title="Play playlist"
            aria-label="Play playlist"
          >
            <Play className="w-6 h-6 fill-black translate-x-0.5" />
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-white truncate group-hover:text-inisai-teal transition-colors">
          {playlist.name}
        </h4>
        <p className="text-xs text-inisai-muted truncate mt-0.5">
          {playlist.description || `${playlist.tracks?.length || 0} songs`}
        </p>
      </div>
    </div>
  );
};
