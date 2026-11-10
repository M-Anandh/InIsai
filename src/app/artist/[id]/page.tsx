"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Track, AlbumSummary, ArtistSummary, PlaybackContext } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { CoverImage } from "@/components/ui/CoverImage";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { usePlayerStore } from "@/stores/player-store";
import { Play, Shuffle, Disc, Users, Loader2 } from "lucide-react";

interface ArtistData {
  id: string;
  name: string;
  description?: string;
  artworkUrl: string;
  songs: Track[];
  albums: AlbumSummary[];
  relatedArtists: ArtistSummary[];
}

export default function ArtistPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/api/yt/artist?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setArtist(data))
      .catch(() => setArtist(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-inisai-muted">
        <Loader2 className="w-8 h-8 animate-spin text-inisai-accent" />
        <p className="text-xs">Loading artist catalog...</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="space-y-6">
        <BackNavigation fallbackUrl="/explore" />
        <div className="py-16 text-center text-inisai-muted">Artist not found.</div>
      </div>
    );
  }

  const context: PlaybackContext = {
    id: `artist-${artist.id}`,
    type: "artist",
    title: artist.name,
    trackIds: artist.songs.map((s) => s.id),
  };

  const handlePlayAll = () => {
    if (artist.songs.length > 0) {
      playTrack(artist.songs[0], artist.songs, context);
    }
  };

  const handleShuffle = () => {
    if (artist.songs.length === 0) return;
    const shuffled = [...artist.songs].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled, context);
  };

  return (
    <div className="space-y-8 pb-16">
      <BackNavigation fallbackUrl="/explore" />

      {/* Artist Hero */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden shadow-2xl flex-shrink-0 border-2 border-white/10">
          <CoverImage src={artist.artworkUrl} alt={artist.name} type="artist" aspect="square" />
        </div>
        <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-widest text-inisai-accent">
            Artist
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            {artist.name}
          </h1>
          {artist.description && (
            <p className="text-xs text-slate-600 dark:text-inisai-muted line-clamp-2 max-w-2xl">
              {artist.description}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
            <button
              onClick={handlePlayAll}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-inisai-accent text-white text-xs font-bold shadow-lg shadow-inisai-accent/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Top Songs</span>
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/15 transition-all cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Songs */}
      {artist.songs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Popular Songs</h2>
          <div className="space-y-2">
            {artist.songs.map((track, idx) => (
              <TrackRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                playlistContext={artist.songs}
                context={context}
              />
            ))}
          </div>
        </section>
      )}

      {/* Albums & Singles */}
      {artist.albums.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Disc className="w-5 h-5 text-inisai-accent" />
            <span>Albums & Singles</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {artist.albums.map((alb) => (
              <Link
                key={alb.id}
                href={`/album/${encodeURIComponent(alb.id)}`}
                className="group p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 transition-all"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden mb-2.5">
                  <CoverImage src={alb.artworkUrl} alt={alb.title} type="album" aspect="square" />
                </div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent">
                  {alb.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-inisai-muted mt-0.5 truncate">
                  {alb.year || "Album"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Fans Also Like */}
      {artist.relatedArtists.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-inisai-teal" />
            <span>Fans Also Like</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {artist.relatedArtists.map((rel) => (
              <Link
                key={rel.id}
                href={`/artist/${encodeURIComponent(rel.id)}`}
                className="group flex flex-col items-center text-center p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 transition-all"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden mb-2.5">
                  <CoverImage src={rel.artworkUrl} alt={rel.name} type="artist" aspect="square" />
                </div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate w-full group-hover:text-inisai-accent">
                  {rel.name}
                </h4>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

