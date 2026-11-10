"use client";

import React, { useState, useEffect, useRef } from "react";
import { Track, PlaybackContext } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { usePlayerStore } from "@/stores/player-store";
import {
  Search,
  X,
  History,
  Sparkles,
  Play,
  Pause,
  Music2,
  Check,
  Disc3,
} from "lucide-react";

const LANGUAGE_FILTERS = [
  "All",
  "Tamil",
  "English",
  "Hindi",
  "Telugu",
  "Malayalam",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [topResult, setTopResult] = useState<Track | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("inisai_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
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

  const performSearch = async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (!q) {
      setResults([]);
      setTopResult(null);
      setIsLoading(false);
      return;
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/music/search?q=${encodeURIComponent(q)}`,
        { signal: abortControllerRef.current.signal }
      );

      if (res.ok) {
        const data = await res.json();
        const tracks: Track[] = data.results || [];
        setResults(tracks);
        setTopResult(data.topResult || (tracks.length > 0 ? tracks[0] : null));
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Search failure:", e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search (300ms) with AbortController
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTopResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) {
        saveRecentSearch(query);
        performSearch(query);
      }
    }
  };

  // Filter results by language if a chip is selected
  const filteredResults =
    selectedLanguage === "All"
      ? results
      : results.filter(
          (t) =>
            t.language?.toLowerCase() === selectedLanguage.toLowerCase()
        );

  const searchContext: PlaybackContext = {
    id: `search-${query.trim() || "query"}`,
    type: "search",
    title: `Search: "${query.trim() || "Results"}"`,
    trackIds: filteredResults.map((r) => r.id),
  };

  const isTopPlaying =
    topResult && currentTrack?.id === topResult.id && isPlaying;

  const handlePlayTopResult = () => {
    if (!topResult) return;
    if (currentTrack?.id === topResult.id) {
      togglePlay();
    } else {
      saveRecentSearch(topResult.title);
      playTrack(topResult, filteredResults, searchContext);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Search Input Box */}
      <div className="relative">
        <div className="relative flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 sm:p-3.5 focus-within:border-inisai-accent focus-within:ring-2 focus-within:ring-inisai-accent/20 transition-all shadow-inner">
          <Search className="w-5 h-5 text-inisai-accent ml-2 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any song, artist, album (e.g. Believer, On My Way, Naa Ready, Ilaiyaraaja)..."
            className="w-full bg-transparent px-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-inisai-muted/60 text-sm sm:text-base outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setTopResult(null);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:text-white/50 dark:hover:text-white mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Language Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {LANGUAGE_FILTERS.map((lang) => {
          const isSelected = selectedLanguage === lang;
          return (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30 scale-105"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5"
              }`}
            >
              {lang}
            </button>
          );
        })}
      </div>

      {/* Recent Searches (when query is empty) */}
      {!query && recentSearches.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-inisai-muted">
            <span className="flex items-center space-x-1.5 font-semibold uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-inisai-accent" />
              <span>Recent Searches</span>
            </span>
            <button
              onClick={clearRecentSearches}
              className="text-slate-400 dark:text-white/40 hover:text-rose-500 cursor-pointer"
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
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-white/80 transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {isLoading ? (
        /* Skeleton Loaders */
        <div className="space-y-6 pt-2 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-48 rounded-3xl bg-slate-200 dark:bg-white/5" />
            <div className="md:col-span-2 space-y-3">
              <div className="h-14 rounded-2xl bg-slate-200 dark:bg-white/5" />
              <div className="h-14 rounded-2xl bg-slate-200 dark:bg-white/5" />
              <div className="h-14 rounded-2xl bg-slate-200 dark:bg-white/5" />
            </div>
          </div>
        </div>
      ) : query && filteredResults.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-inisai-muted space-y-2">
          <p className="text-base text-slate-800 dark:text-white/80 font-medium">
            No results found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs">
            Try searching for &ldquo;Believer&rdquo;, &ldquo;On My Way&rdquo;, &ldquo;Naa Ready&rdquo;, &ldquo;Ilaiyaraaja&rdquo;, or &ldquo;Anirudh&rdquo;.
          </p>
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="space-y-6">
          {/* Top Result Card & Quick Songs Layout (Spotify / Apple Music pattern) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Top Result Card */}
            {topResult && (
              <div className="lg:col-span-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-inisai-muted/80 mb-3">
                  Top Result
                </h3>
                <div
                  onClick={handlePlayTopResult}
                  className="group relative p-5 rounded-3xl bg-slate-100 dark:bg-gradient-to-b dark:from-white/[0.07] dark:to-white/[0.02] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl mb-4 bg-slate-200 dark:bg-black/40">
                    <ArtworkImage
                      src={topResult.artworkUrl}
                      alt={topResult.title}
                      type="track"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        isTopPlaying
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTopResult();
                        }}
                        className="w-12 h-12 rounded-full bg-inisai-accent text-white flex items-center justify-center shadow-lg shadow-inisai-accent/40 hover:scale-110 active:scale-95 transition-transform"
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
                  <p className="text-xs text-slate-600 dark:text-inisai-muted mt-1 truncate">
                    {topResult.artist}
                  </p>

                  <div className="flex items-center space-x-2 mt-4 text-[10px] font-semibold">
                    <span className="px-2.5 py-1 rounded-full bg-inisai-accent/10 text-inisai-accent border border-inisai-accent/20 uppercase tracking-wider">
                      Song
                    </span>
                    {topResult.language && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/80 border border-slate-300 dark:border-white/10">
                        {topResult.language}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      320 kbps High Fidelity
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Songs List */}
            <div className={topResult ? "lg:col-span-2 space-y-2" : "lg:col-span-3 space-y-2"}>
              <div className="flex justify-between items-center text-xs text-slate-400 dark:text-inisai-muted/80 mb-3 px-1">
                <h3 className="font-bold uppercase tracking-wider">
                  Songs ({filteredResults.length})
                </h3>
                <span>Click to play</span>
              </div>

              {filteredResults.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => saveRecentSearch(track.title)}
                >
                  <TrackRow
                    track={track}
                    index={idx}
                    playlistContext={filteredResults}
                    context={searchContext}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Suggestions */
        <div className="pt-8 text-center text-slate-500 dark:text-inisai-muted space-y-4">
          <Sparkles className="w-8 h-8 mx-auto text-inisai-accent opacity-60" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80">
            Explore Tamil, Indian & Global Melodies
          </h3>
          <p className="text-xs max-w-sm mx-auto leading-relaxed">
            Instant search across Billboard hits, Tamil classics, Rahman soundtracks, and indie tracks.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              "Believer",
              "On My Way",
              "Chinna Thamarai",
              "Naa Ready",
              "Arabic Kuthu",
              "Nilaave Vaa",
              "Ilaiyaraaja Melodies",
              "A.R. Rahman Live",
              "Hukum",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  saveRecentSearch(suggestion);
                }}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
