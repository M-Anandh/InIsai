"use client";

import React, { useState, useEffect } from "react";
import { musicSourceManager } from "@/music/adapters/MusicSourceManager";
import { Track, PlaybackContext } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { Search, X, History, Sparkles, Disc3, Youtube, Music } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

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
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Search high-fidelity audio catalog
      const onlineTracks = await musicSourceManager.searchAll(q);

      // 2. Search local device tracks
      let localTracks: Track[] = [];
      try {
        localTracks = await musicSourceManager.getLocalAdapter().search(q);
      } catch {}

      let merged = [...localTracks, ...onlineTracks];

      // 3. If results are scarce, seamlessly search YouTube bridge internally
      if (merged.length < 5) {
        try {
          const ytRes = await fetch(`/api/music/youtube?q=${encodeURIComponent(q)}`);
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            const ytTracks = (ytData.results || []).filter(
              (yt: Track) => !merged.some((m) => m.title.toLowerCase() === yt.title.toLowerCase())
            );
            merged = [...merged, ...ytTracks];
          }
        } catch {}
      }

      setResults(merged);
    } catch (e) {
      console.error("Search failure:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      performSearch(query);
    }, 400);

    return () => clearTimeout(timer);
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

  const searchContext: PlaybackContext = {
    id: `search-${query.trim() || "query"}`,
    type: "search",
    title: `Search: "${query.trim() || "Results"}"`,
    trackIds: results.map((r) => r.id),
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Search Input Box */}
      <div className="relative">
        <div className="relative flex items-center bg-white/[0.04] border border-white/10 rounded-2xl p-2.5 sm:p-3.5 focus-within:border-inisai-accent transition-all shadow-inner">
          <Search className="w-5 h-5 text-inisai-accent ml-2 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any song, artist, album (e.g. Believer, Naa Ready, Ilaiyaraaja)..."
            className="w-full bg-transparent px-3 text-white placeholder-inisai-muted/60 text-sm sm:text-base outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-full text-white/50 hover:text-white mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Recent Searches (when query is empty) */}
      {!query && recentSearches.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-inisai-muted">
            <span className="flex items-center space-x-1.5 font-semibold uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-inisai-accent" />
              <span>Recent Searches</span>
            </span>
            <button
              onClick={clearRecentSearches}
              className="text-white/40 hover:text-rose-400 cursor-pointer"
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
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/80 transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-inisai-muted space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-inisai-accent border-t-transparent animate-spin" />
          <p className="text-xs">
            Searching across all music catalogs...
          </p>
        </div>
      ) : query && results.length === 0 ? (
        <div className="py-16 text-center text-inisai-muted space-y-2">
          <p className="text-base text-white/80 font-medium">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-xs">
            Try searching for &ldquo;Chinna Thamarai&rdquo;, &ldquo;Vettaikaaran&rdquo;, &ldquo;Naa Ready&rdquo;, &ldquo;Ilaiyaraaja&rdquo;, or &ldquo;Anirudh&rdquo;.
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-inisai-muted pb-1">
            <span>
              Found {results.length} songs
            </span>
            <span>Click to play</span>
          </div>
          {results.map((track, idx) => (
            <div
              key={`${track.id}-${idx}`}
              onClick={() => saveRecentSearch(track.title)}
            >
              <TrackRow
                track={track}
                index={idx}
                playlistContext={results}
                context={searchContext}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Empty State Suggestions */
        <div className="pt-8 text-center text-inisai-muted space-y-4">
          <Sparkles className="w-8 h-8 mx-auto text-inisai-accent opacity-50" />
          <h3 className="text-sm font-semibold text-white/80">Explore Tamil, Indian & World Music</h3>
          <p className="text-xs max-w-sm mx-auto leading-relaxed">
            Search songs across streaming catalogs, YouTube Music, or load tracks stored directly on your phone or PC.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              "Chinna Thamarai",
              "Naa Ready",
              "Arabic Kuthu",
              "Nilaave Vaa",
              "Malarndhum Malaraadha",
              "Ilaiyaraaja Melodies",
              "A.R. Rahman Live",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  saveRecentSearch(suggestion);
                }}
                className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white transition-all cursor-pointer"
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
