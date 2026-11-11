"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useLanguageStore, AVAILABLE_LANGUAGES } from "@/stores/language-store";
import { usePlayerStore } from "@/stores/player-store";
import { CoverImage } from "@/components/ui/CoverImage";
import { Track, PlaybackContext } from "@/types";
import {
  Play,
  Pause,
  Flame,
  Calendar,
  Sparkles,
  Disc3,
  Clock,
  Plus,
  Check,
  Globe,
  ArrowLeft,
} from "lucide-react";

interface FeaturedMovieSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  filmTitle: string;
  releaseStatus: "released" | "upcoming";
  releaseLabel: string;
  releaseDate?: string;
  language: string;
  youtubeVideoId?: string;
  streamUrl?: string;
  isPlayable: boolean;
}

const FEATURE_NEW_RELEASES = false;

export default function NewAndUpcomingPage() {
  const { playTrack, currentTrack, isPlaying, togglePlay, addToQueue } = usePlayerStore();
  const { selectedLanguages, toggleLanguage } = useLanguageStore();

  const safeLanguages = useMemo(() => {
    return Array.isArray(selectedLanguages) && selectedLanguages.length > 0
      ? selectedLanguages
      : ["Tamil", "English"];
  }, [selectedLanguages]);

  const [songs, setSongs] = useState<FeaturedMovieSong[]>([]);
  const [filter, setFilter] = useState<"all" | "released" | "upcoming">("all");
  const [isLoading, setIsLoading] = useState(true);

  if (!FEATURE_NEW_RELEASES) {
    return (
      <div className="py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Releases</h1>
        <p className="text-slate-500 dark:text-inisai-muted text-sm">
          This feature is temporarily in preview mode while we upgrade our theatrical feeds.
        </p>
        <Link
          href="/explore"
          className="inline-block px-5 py-2.5 rounded-full bg-inisai-accent text-white text-xs font-bold"
        >
          Explore Music
        </Link>
      </div>
    );
  }

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const langQuery = safeLanguages
      .map((l) => (typeof l === "string" ? l.toLowerCase() : ""))
      .filter(Boolean)
      .join(",");
    fetch(`/api/featured?lang=${encodeURIComponent(langQuery)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!isCancelled && data?.featured) {
          setSongs(data.featured);
        }
      })
      .catch((err) => console.warn("Failed to load new & upcoming songs:", err))
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [safeLanguages]);

  const filteredSongs = useMemo(() => {
    if (filter === "all") return songs;
    return songs.filter((s) => s.releaseStatus === filter);
  }, [songs, filter]);

  const playlistTracks: Track[] = useMemo(() => {
    return filteredSongs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.filmTitle,
      artworkUrl: s.artworkUrl || "",
      youtubeVideoId: s.youtubeVideoId,
      streamUrl: s.streamUrl || "",
      language: s.language,
      duration: 210,
      sourceId: s.youtubeVideoId || s.id,
      isPlayable: true,
      sourceType: s.youtubeVideoId ? "youtube" : "curated",
      sourceAttribution: s.releaseLabel,
    }));
  }, [filteredSongs]);

  const context: PlaybackContext = {
    id: `new-upcoming-${filter}`,
    type: "playlist",
    title: `New & Upcoming (${filter})`,
    trackIds: playlistTracks.map((t) => t.id),
  };

  const handlePlaySong = (song: FeaturedMovieSong, index: number) => {
    const track = playlistTracks[index];
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, playlistTracks, context);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header with Navigation */}
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-inisai-muted hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-inisai-turmeric/15 border border-inisai-turmeric/30 text-inisai-turmeric text-xs font-bold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5" />
              <span>Theatrical & Studio Drops</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              New & Upcoming Movie Songs
            </h1>
            <p className="text-sm text-slate-600 dark:text-inisai-muted max-w-2xl">
              Discover newly released soundtracks and anticipated theatrical songs, tailored to your preferred listening languages.
            </p>
          </div>

          {playlistTracks.length > 0 && (
            <button
              onClick={() => handlePlaySong(filteredSongs[0], 0)}
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-inisai-accent hover:opacity-95 active:scale-95 text-white font-bold text-sm shadow-lg shadow-inisai-accent/30 transition-all cursor-pointer flex-shrink-0"
            >
              <Play className="w-4 h-4 fill-white translate-x-0.5" />
              <span>Play All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Language Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-slate-200 dark:border-white/10 pb-4">
        {/* Status Filters */}
        <div className="flex items-center space-x-2">
          {(
            [
              { id: "all", label: "All Drops" },
              { id: "released", label: "Just Released" },
              { id: "upcoming", label: "Upcoming Soon" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filter === tab.id
                  ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/25"
                  : "bg-white/80 dark:bg-white/5 text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Language Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 dark:text-inisai-muted flex items-center space-x-1 mr-1">
            <Globe className="w-3.5 h-3.5" />
            <span>Languages:</span>
          </span>
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isSelected = safeLanguages.includes(lang.id);
            return (
              <button
                key={lang.id}
                onClick={() => toggleLanguage(lang.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  isSelected
                    ? "bg-inisai-accent/20 border border-inisai-accent text-inisai-accent font-bold"
                    : "bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
                <span>{lang.nativeLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Songs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <div
              key={k}
              className="h-32 rounded-2xl bg-slate-200 dark:bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/60 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-3">
          <Calendar className="w-8 h-8 text-inisai-muted mx-auto opacity-60" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No releases found
          </h3>
          <p className="text-xs text-slate-500 dark:text-inisai-muted max-w-sm mx-auto">
            Try enabling more languages above or switching the filter tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSongs.map((song, idx) => {
            const isCurrent = currentTrack?.id === song.id;
            const isSongPlaying = isCurrent && isPlaying;
            return (
              <div
                key={song.id}
                className="group relative rounded-2xl p-4 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 shadow-sm hover:shadow-xl transition-all flex items-center justify-between gap-3.5"
              >
                <div
                  onClick={() => handlePlaySong(song, idx)}
                  className="flex items-center space-x-3.5 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                    <CoverImage
                      src={song.artworkUrl}
                      alt={song.title}
                      youtubeVideoId={song.youtubeVideoId}
                      type="track"
                      aspect="square"
                    />
                    <div
                      className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                        isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSongPlaying ? (
                        <Pause className="w-5 h-5 fill-white text-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          song.releaseStatus === "upcoming"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {song.releaseStatus === "upcoming" ? "Upcoming" : "Released"}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-inisai-muted">
                        {song.language}
                      </span>
                    </div>

                    <h3
                      className={`text-sm font-bold truncate ${
                        isCurrent ? "text-inisai-accent" : "text-slate-900 dark:text-white"
                      } group-hover:text-inisai-accent transition-colors`}
                    >
                      {song.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-inisai-muted truncate">
                      {song.artist}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-white/60 truncate">
                      Film: <span className="font-semibold">{song.filmTitle}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      addToQueue(playlistTracks[idx])
                    }
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 transition-colors"
                    title="Add to queue"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-slate-500 dark:text-inisai-muted whitespace-nowrap">
                    {song.releaseDate ? new Date(song.releaseDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
