"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Track, PlaybackContext } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { CoverImage } from "@/components/ui/CoverImage";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { usePlayerStore } from "@/stores/player-store";
import { formatDuration } from "@/lib/utils";
import { Play, Shuffle, RefreshCw, ArrowLeft, Disc } from "lucide-react";

interface AlbumData {
  id: string;
  title: string;
  artist: string;
  musicDirector?: string;
  year?: string;
  totalDurationSec?: number;
  totalDurationText?: string;
  artworkUrl: string;
  tracks: Track[];
}

function shuffleFisherYates<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const highlightId = searchParams.get("highlight") || "";
  const fromPlayer = searchParams.get("fromPlayer") === "1";

  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const { currentTrack, playTrack, setFullScreenOpen } = usePlayerStore();
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const loadAlbum = () => {
    if (!id) return;
    setIsLoading(true);
    setError(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    fetch(`/api/yt/album?id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.tracks)) {
          setAlbum(null);
          setError(true);
        } else {
          setAlbum(data);
        }
      })
      .catch(() => {
        setAlbum(null);
        setError(true);
      })
      .finally(() => {
        clearTimeout(timeout);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadAlbum();
  }, [id]);

  // Scroll the highlighted / currently playing track into view once tracks render
  useEffect(() => {
    if (isLoading || !album) return;
    const timer = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(timer);
  }, [isLoading, album, highlightId, currentTrack?.id]);

  const handleBackToPlayer = () => {
    setFullScreenOpen(true);
    router.back();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16" data-testid="album-loading-skeleton">
        <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 animate-pulse">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-slate-200 dark:bg-white/10 shrink-0" />
          <div className="space-y-3 flex-1 w-full">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-8 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
            <div className="flex gap-3 pt-2">
              <div className="h-10 w-28 rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="h-10 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <BackNavigation fallbackUrl="/explore" />
          {fromPlayer && (
            <button
              type="button"
              onClick={handleBackToPlayer}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-inisai-accent/15 text-inisai-accent text-xs font-bold hover:bg-inisai-accent/25 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to player</span>
            </button>
          )}
        </div>
        <div className="py-16 text-center space-y-3 text-slate-600 dark:text-inisai-muted">
          <p className="text-sm font-semibold">Could not load movie soundtrack tracks.</p>
          <button
            type="button"
            onClick={loadAlbum}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-inisai-accent text-white text-xs font-bold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const totalSec =
    album.totalDurationSec ||
    album.tracks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
  const formattedTotalDuration =
    totalSec >= 3600
      ? `${Math.floor(totalSec / 3600)} hr ${Math.floor((totalSec % 3600) / 60)} min`
      : totalSec > 0
      ? `${Math.max(1, Math.round(totalSec / 60))} min (${formatDuration(totalSec)})`
      : album.totalDurationText || "";

  const context: PlaybackContext = {
    id: `album-${album.id}`,
    type: "album",
    title: album.title,
    trackIds: album.tracks.map((t) => t.id),
  };

  return (
    <ErrorBoundary fallbackTitle="Could not load album">
      <div className="space-y-8 pb-16" data-testid="album-detail-page">
        <div className="flex items-center justify-between gap-3">
          <BackNavigation fallbackUrl="/explore" />
          {fromPlayer && (
            <button
              type="button"
              onClick={handleBackToPlayer}
              data-testid="back-to-player-btn"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-inisai-accent text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to player</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0">
            <CoverImage
              id={`album-${album.id}`}
              src={album.artworkUrl}
              alt={album.title}
              kind="album"
              aspect="square"
            />
          </div>
          <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
            <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-widest text-inisai-accent">
              <Disc className="w-3.5 h-3.5" />
              <span>Movie Soundtrack / Album</span>
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {album.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-inisai-muted font-medium">
              {album.musicDirector || album.artist}
              {album.year ? ` • ${album.year}` : ""}
              {` • ${album.tracks.length} tracks`}
              {formattedTotalDuration ? ` • ${formattedTotalDuration}` : ""}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  album.tracks[0] && playTrack(album.tracks[0], album.tracks, context)
                }
                data-testid="album-play-all"
                className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-inisai-accent text-white text-xs font-bold shadow-lg shadow-inisai-accent/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play all</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (album.tracks.length === 0) return;
                  const shuffled = shuffleFisherYates(album.tracks);
                  playTrack(shuffled[0], shuffled, context);
                }}
                data-testid="album-shuffle"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/15 transition-all cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2" data-testid="album-track-list">
          {album.tracks.map((track, idx) => {
            const isHighlighted =
              (currentTrack && currentTrack.id === track.id) ||
              (highlightId && track.id === highlightId);
            return (
              <div
                key={`${track.id}-${idx}`}
                ref={isHighlighted ? highlightRef : undefined}
                className={
                  isHighlighted
                    ? "rounded-2xl ring-2 ring-inisai-accent/70"
                    : undefined
                }
              >
                <TrackRow
                  track={track}
                  index={idx}
                  playlistContext={album.tracks}
                  context={context}
                />
              </div>
            );
          })}
        </div>
      </div>
    </ErrorBoundary>
  );
}
