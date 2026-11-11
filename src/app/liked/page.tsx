"use client";

import React, { useState, useMemo } from "react";
import { useLikesStore } from "@/stores/likes-store";
import { usePlayerStore } from "@/stores/player-store";
import { useMounted } from "@/hooks/use-mounted";
import { TrackRow } from "@/components/music/TrackRow";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { formatTotalDuration } from "@/lib/music-matching";
import {
  Heart,
  Play,
  Shuffle,
  Search,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
} from "lucide-react";

type SortMode = "recent" | "title" | "artist";

export default function LikedSongsPage() {
  const { likedSongs, lastUndoneSong, undoUnlike } = useLikesStore();
  const { playTrack } = usePlayerStore();
  const mounted = useMounted();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const rawTracks = useMemo(() => {
    return mounted ? likedSongs.map((s) => s.track) : [];
  }, [mounted, likedSongs]);

  const totalDuration = useMemo(() => {
    return rawTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [rawTracks]);

  const filteredTracks = useMemo(() => {
    let list = [...rawTracks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.album && t.album.toLowerCase().includes(q))
      );
    }

    if (sortMode === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === "artist") {
      list.sort((a, b) => a.artist.localeCompare(b.artist));
    }
    // "recent" is already sorted by likedAt desc

    return list;
  }, [rawTracks, searchQuery, sortMode]);

  const handlePlayInOrder = () => {
    if (filteredTracks.length > 0) {
      playTrack(filteredTracks[0], filteredTracks, {
        id: "liked-songs",
        type: "liked",
        title: "Liked Songs",
        trackIds: filteredTracks.map((t) => t.id),
      });
    }
  };

  const handleShufflePlay = () => {
    if (filteredTracks.length === 0) return;
    const shuffled = [...filteredTracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playTrack(shuffled[0], shuffled, {
      id: "liked-songs-shuffled",
      type: "liked",
      title: "Liked Songs (Shuffled)",
      trackIds: shuffled.map((t) => t.id),
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <BackNavigation fallbackUrl="/library" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-950/60 via-purple-950/40 to-black/70 border border-rose-500/20 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center space-x-5">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-rose-500 to-inisai-accent flex items-center justify-center text-white shadow-2xl shadow-rose-500/40 flex-shrink-0">
            <Heart className="w-10 h-10 sm:w-14 sm:h-14 fill-white" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-mono tracking-widest text-rose-400 font-extrabold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personal Collection</span>
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Liked Songs
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 dark:text-inisai-muted">
              {rawTracks.length} {rawTracks.length === 1 ? "saved song" : "saved songs"} • {formatTotalDuration(totalDuration)}
            </p>
          </div>
        </div>

        {rawTracks.length > 0 && (
          <div className="flex items-center space-x-3 pt-2 sm:pt-0">
            <button
              onClick={handlePlayInOrder}
              className="flex items-center space-x-2 px-6 py-3 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-rose-500/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Play All</span>
            </button>
            <button
              onClick={handleShufflePlay}
              className="flex items-center space-x-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Shuffle playback"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
          </div>
        )}
      </div>

      {/* Undo Banner if recently unliked */}
      {lastUndoneSong && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-fadeIn">
          <span>
            Removed &ldquo;{lastUndoneSong.track.title}&rdquo; from Liked Songs.
          </span>
          <button
            onClick={undoUnlike}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Search & Sort Toolbar */}
      {rawTracks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search within liked songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-inisai-muted">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </div>
            {(["recent", "title", "artist"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  sortMode === mode
                    ? "bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/40"
                    : "bg-white/50 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white border border-transparent"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tracks List */}
      {filteredTracks.length > 0 ? (
        <div className="space-y-1.5">
          {filteredTracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              playlistContext={filteredTracks}
              context={{
                id: "liked-songs",
                type: "liked",
                title: "Liked Songs",
                trackIds: filteredTracks.map((t) => t.id),
              }}
            />
          ))}
        </div>
      ) : rawTracks.length > 0 ? (
        <div className="py-16 text-center text-inisai-muted space-y-2">
          <p className="text-sm">No songs match &ldquo;{searchQuery}&rdquo;</p>
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-rose-400 hover:underline cursor-pointer"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="py-20 text-center text-inisai-muted space-y-3">
          <Heart className="w-12 h-12 mx-auto text-rose-500/40" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No liked songs yet</h3>
          <p className="text-xs max-w-xs mx-auto text-slate-500 dark:text-inisai-muted">
            Tap the heart icon on any song across Search, Explore, or Now Playing to save it here.
          </p>
        </div>
      )}
    </div>
  );
}
