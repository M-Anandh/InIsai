"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Track, PlaybackContext } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { CoverImage } from "@/components/ui/CoverImage";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { usePlayerStore } from "@/stores/player-store";
import { Play, Shuffle, Loader2 } from "lucide-react";

interface AlbumData {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  tracks: Track[];
}

export default function AlbumPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/api/yt/album?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAlbum(data))
      .catch(() => setAlbum(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-inisai-muted">
        <Loader2 className="w-8 h-8 animate-spin text-inisai-accent" />
        <p className="text-xs">Loading album tracks...</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="space-y-6">
        <BackNavigation fallbackUrl="/explore" />
        <div className="py-16 text-center text-inisai-muted">Album not found.</div>
      </div>
    );
  }

  const context: PlaybackContext = {
    id: `album-${album.id}`,
    type: "album",
    title: album.title,
    trackIds: album.tracks.map((t) => t.id),
  };

  return (
    <div className="space-y-8 pb-16">
      <BackNavigation fallbackUrl="/explore" />

      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0">
          <CoverImage src={album.artworkUrl} alt={album.title} type="album" aspect="square" />
        </div>
        <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-widest text-inisai-accent">
            Album
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {album.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-inisai-muted font-medium">
            {album.artist} • {album.tracks.length} tracks
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
            <button
              onClick={() => album.tracks[0] && playTrack(album.tracks[0], album.tracks, context)}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-inisai-accent text-white text-xs font-bold shadow-lg shadow-inisai-accent/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Album</span>
            </button>
            <button
              onClick={() => {
                if (album.tracks.length === 0) return;
                const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
                playTrack(shuffled[0], shuffled, context);
              }}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/15 transition-all cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {album.tracks.map((track, idx) => (
          <TrackRow
            key={`${track.id}-${idx}`}
            track={track}
            index={idx}
            playlistContext={album.tracks}
            context={context}
          />
        ))}
      </div>
    </div>
  );
}
