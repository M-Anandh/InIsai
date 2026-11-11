"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Track, AlbumSummary, ArtistSummary, PlaybackContext } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { CoverImage } from "@/components/ui/CoverImage";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { usePlayerStore } from "@/stores/player-store";
import { Play, Shuffle, Disc, Users, Loader2, RefreshCw, Music2, Info, Heart } from "lucide-react";

interface ArtistData {
  id: string;
  name: string;
  description?: string;
  artworkUrl: string;
  banner?: string;
  subscribers?: string;
  songs: Track[];
  albums: AlbumSummary[];
  singles: AlbumSummary[];
  relatedArtists: ArtistSummary[];
}

function ArtistPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = typeof params?.id === "string" ? params.id : "";
  const initialName = searchParams?.get("name") || "";
  const initialPhoto = searchParams?.get("photo") || "";

  // Initialize immediately from query params so header paints with 0ms delay!
  const [artist, setArtist] = useState<ArtistData | null>(() => {
    if (initialName) {
      return {
        id,
        name: initialName,
        artworkUrl: initialPhoto,
        songs: [],
        albums: [],
        singles: [],
        relatedArtists: [],
      };
    }
    return null;
  });

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isFollowing, setIsFollowing] = useState(false);
  const { playTrack } = usePlayerStore();

  const loadArtistData = useCallback(() => {
    if (!id) return;
    setStatus("loading");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    fetch(`/api/yt/artist?id=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data) {
          setArtist((prev) => ({
            id: data.id || id,
            name: data.name || prev?.name || id,
            artworkUrl: data.photo || data.artworkUrl || prev?.artworkUrl || "",
            banner: data.banner || prev?.banner,
            description: data.description || prev?.description || "",
            subscribers: data.subscribers || prev?.subscribers || "",
            songs: data.topSongs || data.songs || [],
            albums: data.albums || [],
            singles: data.singles || [],
            relatedArtists: data.related || data.relatedArtists || [],
          }));
          setStatus("ready");
        } else {
          throw new Error("Empty artist data");
        }
      })
      .catch((err) => {
        console.warn("Artist load exception:", err);
        setStatus("error");
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    loadArtistData();
  }, [loadArtistData]);

  if (!artist && status === "loading") {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-inisai-muted">
        <Loader2 className="w-8 h-8 animate-spin text-inisai-accent" />
        <p className="text-xs">Loading artist catalog...</p>
      </div>
    );
  }

  if (!artist || (status === "error" && artist.songs.length === 0)) {
    return (
      <div className="space-y-6">
        <BackNavigation fallbackUrl="/explore" />
        <div className="py-16 text-center space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-white/80">
            Couldn&apos;t load artist catalog.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={loadArtistData}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-full bg-inisai-accent text-white text-xs font-bold shadow hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <Link
              href={`/search?q=${encodeURIComponent(artist?.name || id)}`}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-semibold hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
            >
              <Music2 className="w-3.5 h-3.5" />
              <span>Songs by this artist</span>
            </Link>
          </div>
        </div>
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

  const handlePlayRow = (idx: number) => {
    if (artist.songs.length > idx) {
      const queueFromN = artist.songs.slice(idx);
      playTrack(artist.songs[idx], queueFromN, context);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <BackNavigation fallbackUrl="/explore" />

      {/* Artist Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-sm">
        {artist.banner && (
          <div className="absolute inset-0 -z-10 opacity-20 filter blur-xl scale-110">
            <img src={artist.banner} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden shadow-2xl flex-shrink-0 border-2 border-white/15 bg-slate-800">
          <CoverImage
            src={artist.artworkUrl}
            alt={artist.name}
            kind="artist"
            aspect="square"
            size="card"
            eager
          />
        </div>

        <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
          <div className="flex items-center justify-center sm:justify-start space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-inisai-accent">
              Artist
            </span>
            {artist.subscribers && (
              <span className="text-[11px] font-mono text-slate-500 dark:text-inisai-muted">
                • {artist.subscribers}
              </span>
            )}
          </div>

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
              disabled={artist.songs.length === 0}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-inisai-accent text-white text-xs font-bold shadow-lg shadow-inisai-accent/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play</span>
            </button>
            <button
              onClick={handleShuffle}
              disabled={artist.songs.length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/15 transition-all cursor-pointer disabled:opacity-50"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
            <button
              onClick={() => setIsFollowing((f) => !f)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                isFollowing
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-500"
                  : "border-slate-300 dark:border-white/10 bg-transparent text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFollowing ? "fill-current" : ""}`} />
              <span>{isFollowing ? "Following" : "Follow"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Songs */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Top Songs</h2>
        {artist.songs.length > 0 ? (
          <div className="space-y-1">
            {artist.songs.map((track, idx) => (
              <div key={`${track.id}-${idx}`} onClick={() => handlePlayRow(idx)}>
                <TrackRow
                  track={track}
                  index={idx}
                  playlistContext={artist.songs}
                  context={context}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 flex items-center justify-center space-x-2 text-xs text-inisai-muted">
            <Loader2 className="w-4 h-4 animate-spin text-inisai-accent" />
            <span>Loading top tracks...</span>
          </div>
        )}
      </section>

      {/* Albums Carousel */}
      {artist.albums.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Disc className="w-5 h-5 text-inisai-accent" />
            <span>Albums</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {artist.albums.map((alb) => (
              <Link
                key={alb.id}
                href={`/album/${encodeURIComponent(alb.id)}`}
                className="group p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 transition-all shadow-sm"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden mb-2.5">
                  <CoverImage src={alb.artworkUrl} alt={alb.title} kind="album" aspect="square" />
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

      {/* Singles Carousel */}
      {artist.singles && artist.singles.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Music2 className="w-5 h-5 text-inisai-turmeric" />
            <span>Singles & EPs</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {artist.singles.map((single) => (
              <Link
                key={single.id}
                href={`/album/${encodeURIComponent(single.id)}`}
                className="group p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 transition-all shadow-sm"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden mb-2.5">
                  <CoverImage src={single.artworkUrl} alt={single.title} kind="album" aspect="square" />
                </div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent">
                  {single.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-inisai-muted mt-0.5 truncate">
                  {single.year || "Single"}
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
                href={`/artist/${encodeURIComponent(rel.id)}?name=${encodeURIComponent(rel.name)}&photo=${encodeURIComponent(rel.artworkUrl || "")}`}
                className="group flex flex-col items-center text-center p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 transition-all"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden mb-2.5">
                  <CoverImage src={rel.artworkUrl} alt={rel.name} kind="artist" aspect="square" />
                </div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate w-full group-hover:text-inisai-accent">
                  {rel.name}
                </h4>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      {artist.description && (
        <section className="space-y-3 p-6 rounded-3xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Info className="w-4 h-4 text-inisai-accent" />
            <span>About {artist.name}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-inisai-muted leading-relaxed whitespace-pre-line">
            {artist.description}
          </p>
        </section>
      )}
    </div>
  );
}

export default function ArtistPage() {
  return (
    <ErrorBoundary fallbackTitle="Could not load artist page">
      <Suspense fallback={
        <div className="py-24 flex items-center justify-center text-inisai-muted space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-inisai-accent" />
          <span className="text-xs">Opening artist profile...</span>
        </div>
      }>
        <ArtistPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
