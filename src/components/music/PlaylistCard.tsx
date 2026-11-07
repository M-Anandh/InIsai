"use client";

import React, { useState } from "react";
import { Playlist, Track } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import { Play, ListMusic } from "lucide-react";

interface PlaylistCardProps {
  playlist: Playlist;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const { playTrack } = usePlayerStore();

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  return (
    <div
      onClick={handlePlay}
      className="group relative bg-inisai-card hover:bg-inisai-cardHover p-3.5 rounded-2xl border border-white/5 hover:border-inisai-teal/30 transition-all duration-300 cursor-pointer flex flex-col space-y-3 shadow-sm hover:shadow-xl hover:shadow-inisai-teal/10"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40">
        {playlist.artworkUrl ? (
          <img
            src={playlist.artworkUrl}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-inisai-accent/30 to-inisai-teal/30">
            <ListMusic className="w-12 h-12 text-white/50" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handlePlay}
            className="w-12 h-12 rounded-full bg-inisai-teal text-black flex items-center justify-center shadow-lg shadow-inisai-teal/40 hover:scale-110 active:scale-95 transition-transform"
            title="Play playlist"
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
          {playlist.description || `${playlist.tracks.length} songs`}
        </p>
      </div>
    </div>
  );
};

