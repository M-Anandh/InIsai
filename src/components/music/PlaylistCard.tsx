"use client";

import React from "react";
import Link from "next/link";
import { Playlist } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import { CoverImage } from "@/components/ui/CoverImage";
import { Play } from "lucide-react";

interface PlaylistCardProps {
  playlist: Playlist;
  href?: string;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, href }) => {
  const { playTrack } = usePlayerStore();

  const handlePlay = (e: React.MouseEvent) => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      playTrack(playlist.tracks[0], playlist.tracks, {
        id: `playlist-${playlist.id}`,
        type: "playlist",
        title: playlist.name,
      });
    }
  };

  const targetHref = href || `/playlist/${encodeURIComponent(playlist.id)}`;

  return (
    <Link
      href={targetHref}
      className="group relative bg-white/80 dark:bg-inisai-surface/70 hover:bg-white dark:hover:bg-inisai-surfaceElevated backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-inisai-accent/40 transition-all duration-300 cursor-pointer flex flex-col space-y-3 shadow-sm hover:shadow-xl"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-black/40 shadow-inner">
        <CoverImage
          src={playlist.artworkUrl}
          alt={playlist.name}
          fallbackTracks={playlist.tracks}
          type="playlist"
          aspect="square"
          className="group-hover:scale-105 transition-transform duration-500"
        />

        {playlist.tracks && playlist.tracks.length > 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handlePlay}
              className="w-12 h-12 rounded-full bg-inisai-accent text-white flex items-center justify-center shadow-lg shadow-inisai-accent/40 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              title="Play playlist"
              aria-label="Play playlist"
            >
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            </button>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent transition-colors">
          {playlist.name}
        </h4>
        <p className="text-xs text-slate-500 dark:text-inisai-muted truncate mt-0.5">
          {playlist.description || `${playlist.tracks?.length || 0} songs`}
        </p>
      </div>
    </Link>
  );
};
