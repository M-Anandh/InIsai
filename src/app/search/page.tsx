"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Track, AlbumSummary, ArtistSummary, PlaylistSummary, PlaybackContext } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { CoverImage } from "@/components/ui/CoverImage";
import { usePlayerStore } from "@/stores/player-store";
import { providerRegistry } from "@/music/providers/ProviderRegistry";
import {
  Search,
  X,
  History,
  Sparkles,
  Play,
  Pause,
  TrendingUp,
  Disc,
  User,
  ListMusic,
  Video,
  ArrowUpRight,
} from "lucide-react";

const SEARCH_FILTERS = [
  "All",
  "Songs",
  "Albums",
  "Artists",
  "Playlists",
  "Tamil",
  "English",
  "Hindi",
  "Telugu",
  "Malayalam",
];

const TRENDING_SEARCHES = [
  "On My Way Alan Walker",
  "Believer Imagine Dragons",
  "Kolaveri",
  "Nilaave Vaa",
  "Hukum",
  "Jailer 2",
  "Ilaiyaraaja",
  "A. R. Rahman",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [topResult, setTopResult] = useState<Track | null>(null);
  const [songs, setSongs] = useState<Track[]>([]);
  const [videos, setVideos] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);

  const [activeFilter, setActiveFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const suggestAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("inisai_recent_searches");
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term || term.trim().length < 2) return;
    const clean = term.trim();
    const updated = [
      clean,
      ...recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase()),
    ].slice(0, 8);
    setRecentSearches(updated);
    try {
      localStorage.setItem("inisai_recent_searches", JSON.stringify(updated));
    } catch {}
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("inisai_recent_searches");
    } catch {}
  };

  // 1. Instant Suggest (150ms debounce)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (suggestAbortRef.current) suggestAbortRef.current.abort();
      suggestAbortRef.current = new AbortController();
      try {
        const res = await fetch(`/api/yt/suggest?q=${encodeURIComponent(q)}`, {
          signal: suggestAbortRef.current.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {}
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // 2. Full Multi-Section Search (300ms debounce or explicit language filter)
  const performSearch = async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (!q) {
      setTopResult(null);
      setSongs([]);
      setVideos([]);
      setAlbums([]);
      setArtists([]);
      setPlaylists([]);
      setIsLoading(false);
      return;
    }

    if (searchAbortRef.current) searchAbortRef.current.abort();
    searchAbortRef.current = new AbortController();
    const signal = searchAbortRef.current.signal;

    const langSuffix = ["Tamil", "English", "Hindi", "Telugu", "Malayalam"].includes(activeFilter)
      ? ` ${activeFilter}`
      : "";
    const effectiveQuery = `${q}${langSuffix}`.trim();

    setIsLoading(true);
    try {
      const [ytRes, localTracks] = await Promise.allSettled([
        fetch(`/api/yt/search?q=${encodeURIComponent(effectiveQuery)}`, { signal }).then((r) =>
          r.ok ? r.json() : null
        ),
        providerRegistry.isEnabled("local")
          ? providerRegistry.getProvider("local")!.search(q, { limit: 6 }, signal)
          : Promise.resolve([]),
      ]);

      const ytData = ytRes.status === "fulfilled" ? ytRes.value : null;
      const localList = localTracks.status === "fulfilled" ? localTracks.value : [];

      const mergedSongs: Track[] = [
        ...localList,
        ...(ytData?.songs || []),
      ];

      // Secondary fallback to Saavn catalog if YT Music returned sparse results
      if (mergedSongs.length < 4 && providerRegistry.isEnabled("saavn")) {
        try {
          const saavnTracks = await providerRegistry
            .getProvider("saavn")!
            .search(effectiveQuery, { limit: 15 }, signal);
          for (const st of saavnTracks) {
            if (!mergedSongs.some((m) => m.id === st.id)) {
              mergedSongs.push(st);
            }
          }
        } catch {}
      }

      setTopResult(ytData?.topResult || mergedSongs[0] || null);
      setSongs(mergedSongs);
      setVideos(ytData?.videos || []);
      setAlbums(ytData?.albums || []);
      setArtists(ytData?.artists || []);
      setPlaylists(ytData?.playlists || []);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("Search error:", e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setSongs([]);
      setTopResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeFilter]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setShowSuggestions(false);
      if (query.trim()) {
        saveRecentSearch(query);
        performSearch(query);
      }
    }
  };

  const searchContext: PlaybackContext = {
    id: `search-${query.trim() || "query"}`,
    type: "search",
    title: `Search: "${query.trim() || "Results"}"`,
    trackIds: songs.map((s) => s.id),
  };

  const isTopPlaying = topResult && currentTrack?.id === topResult.id && isPlaying;

  const handlePlayTopResult = () => {
    if (!topResult) return;
    if (currentTrack?.id === topResult.id) {
      togglePlay();
    } else {
      saveRecentSearch(topResult.title);
      playTrack(topResult, songs, searchContext);
    }
  };

  const showSongs = activeFilter === "All" || activeFilter === "Songs" || ["Tamil", "English", "Hindi", "Telugu", "Malayalam"].includes(activeFilter);
  const showAlbums = (activeFilter === "All" || activeFilter === "Albums") && albums.length > 0;
  const showArtists = (activeFilter === "All" || activeFilter === "Artists") && artists.length > 0;
  const showPlaylists = (activeFilter === "All" || activeFilter === "Playlists") && playlists.length > 0;
  const showVideos = activeFilter === "All" && videos.length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Search Input & Live Instant Suggestions */}
      <div className="relative z-30">
        <div className="relative flex items-center bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 sm:p-3.5 focus-within:border-inisai-accent focus-within:ring-2 focus-within:ring-inisai-accent/20 transition-all shadow-sm">
          <Search className="w-5 h-5 text-inisai-accent ml-2 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search songs, artists, albums, or lyrics..."
            className="w-full bg-transparent px-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-inisai-muted/60 text-sm sm:text-base outline-none"
            autoFocus
            aria-label="Search music"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setSongs([]);
                setTopResult(null);
              }}
              aria-label="Clear search"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:text-white/50 dark:hover:text-white mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Instant Suggestions Dropdown (< 300ms) */}
        {showSuggestions && query.trim().length >= 2 && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white dark:bg-[#1C1928] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden py-1.5">
            {suggestions.map((sug) => (
              <button
                key={sug}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery(sug);
                  setShowSuggestions(false);
                  saveRecentSearch(sug);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs sm:text-sm text-slate-700 dark:text-white/90 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-3 truncate">
                  <Search className="w-3.5 h-3.5 text-inisai-muted flex-shrink-0" />
                  <span className="truncate">{sug}</span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-inisai-muted flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category & Language Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {SEARCH_FILTERS.map((chip) => {
          const isSelected = activeFilter === chip;
          return (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
                  : "bg-white/80 dark:bg-white/5 text-slate-600 dark:text-white/75 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Results & Loading States */}
      {isLoading ? (
        <div className="space-y-6 pt-2 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-56 rounded-3xl bg-slate-200 dark:bg-white/5" />
            <div className="lg:col-span-2 space-y-2.5">
              {[1, 2, 3, 4].map((k) => (
                <div key={k} className="h-16 rounded-2xl bg-slate-200 dark:bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      ) : query && songs.length === 0 && albums.length === 0 && artists.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-inisai-muted space-y-3">
          <p className="text-base text-slate-900 dark:text-white font-semibold">
            No matches found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs">Did you mean one of these popular queries?</p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["On My Way Alan Walker", "Believer Imagine Dragons", "Kolaveri", "Hukum"].map((hint) => (
              <button
                key={hint}
                onClick={() => setQuery(hint)}
                className="px-3.5 py-1.5 rounded-full bg-inisai-accent/10 text-inisai-accent text-xs font-semibold hover:bg-inisai-accent/20 cursor-pointer"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      ) : query ? (
        <div className="space-y-10">
          {/* Top Result + Songs */}
          {showSongs && (songs.length > 0 || topResult) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {topResult && (
                <div className="lg:col-span-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-inisai-muted mb-3">
                    Top Result
                  </h3>
                  <div
                    onClick={handlePlayTopResult}
                    className="group relative p-5 rounded-3xl bg-white dark:bg-gradient-to-b dark:from-white/[0.08] dark:to-white/[0.02] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-xl mb-4">
                      <CoverImage
                        src={topResult.artworkUrl}
                        alt={topResult.title}
                        youtubeVideoId={topResult.youtubeVideoId}
                        type="track"
                        aspect="square"
                      />
                      <div
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                          isTopPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTopResult();
                          }}
                          aria-label={isTopPlaying ? "Pause" : "Play"}
                          className="w-12 h-12 rounded-full bg-inisai-accent text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                        >
                          {isTopPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current translate-x-0.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent transition-colors">
                      {topResult.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-inisai-muted mt-1 truncate">
                      {topResult.artist}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-[10px] font-semibold">
                      <span className="px-2.5 py-1 rounded-full bg-inisai-accent/15 text-inisai-accent uppercase">
                        Top Match
                      </span>
                      {topResult.album && topResult.album !== "YouTube Music" && (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/80 truncate max-w-[160px]">
                          {topResult.album}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className={topResult ? "lg:col-span-2 space-y-2" : "lg:col-span-3 space-y-2"}>
                <div className="flex justify-between items-center text-xs text-slate-400 dark:text-inisai-muted mb-3 px-1">
                  <h3 className="font-bold uppercase tracking-wider">
                    Songs ({songs.length})
                  </h3>
                  <span>Tap to play</span>
                </div>

                {songs.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    onClick={() => saveRecentSearch(track.title)}
                  >
                    <TrackRow
                      track={track}
                      index={idx}
                      playlistContext={songs}
                      context={searchContext}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artists Shelf */}
          {showArtists && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-inisai-muted flex items-center space-x-2">
                <User className="w-4 h-4 text-inisai-accent" />
                <span>Artists</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {artists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artist/${encodeURIComponent(artist.id)}`}
                    className="group flex flex-col items-center text-center p-3 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 transition-all shadow-sm"
                  >
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-2.5">
                      <CoverImage src={artist.artworkUrl} alt={artist.name} type="artist" aspect="square" />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate w-full group-hover:text-inisai-accent">
                      {artist.name}
                    </h4>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Albums Shelf */}
          {showAlbums && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-inisai-muted flex items-center space-x-2">
                <Disc className="w-4 h-4 text-inisai-teal" />
                <span>Albums</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {albums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/album/${encodeURIComponent(album.id)}`}
                    className="group p-3 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 transition-all shadow-sm"
                  >
                    <div className="aspect-square w-full rounded-xl overflow-hidden mb-2.5">
                      <CoverImage src={album.artworkUrl} alt={album.title} type="album" aspect="square" />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent">
                      {album.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-inisai-muted truncate mt-0.5">
                      {album.artist}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Playlists Shelf */}
          {showPlaylists && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-inisai-muted flex items-center space-x-2">
                <ListMusic className="w-4 h-4 text-inisai-accent" />
                <span>Playlists</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {playlists.map((pl) => (
                  <Link
                    key={pl.id}
                    href={`/playlist/${encodeURIComponent(pl.id)}`}
                    className="group p-3 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 transition-all shadow-sm"
                  >
                    <div className="aspect-square w-full rounded-xl overflow-hidden mb-2.5">
                      <CoverImage src={pl.artworkUrl} alt={pl.title} type="playlist" aspect="square" />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent">
                      {pl.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-inisai-muted truncate mt-0.5">
                      {pl.author || "Playlist"}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Videos & Live Versions */}
          {showVideos && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-inisai-muted flex items-center space-x-2">
                <Video className="w-4 h-4 text-rose-500" />
                <span>Videos & Live Versions</span>
              </h3>
              <div className="space-y-2">
                {videos.map((v, idx) => (
                  <TrackRow
                    key={`${v.id}-vid-${idx}`}
                    track={v}
                    playlistContext={videos}
                    context={searchContext}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Rich Empty State: Recent + Trending */
        <div className="space-y-8 pt-2">
          {recentSearches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-inisai-muted">
                <span className="flex items-center space-x-1.5 font-semibold uppercase tracking-wider">
                  <History className="w-3.5 h-3.5 text-inisai-accent" />
                  <span>Recent Searches</span>
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setQuery(term);
                      saveRecentSearch(term);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-white/85 transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-inisai-muted">
              <TrendingUp className="w-3.5 h-3.5 text-inisai-teal" />
              <span>Trending Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setQuery(suggestion);
                    saveRecentSearch(suggestion);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-white/80 hover:text-inisai-accent transition-all cursor-pointer shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 text-center text-slate-500 dark:text-inisai-muted space-y-2">
            <Sparkles className="w-7 h-7 mx-auto text-inisai-accent opacity-60" />
            <p className="text-xs max-w-sm mx-auto">
              Powered by YouTube Music Catalog & InIsai Audio — stream anything globally or from your own device.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
