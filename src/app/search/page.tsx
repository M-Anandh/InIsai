"use client";

import React, { useState, useEffect, useRef } from "react";
import { musicSourceManager } from "@/music/adapters/MusicSourceManager";
import { Track } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { Search, X, History, Sparkles, Disc3 } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "local" | "online">("all");
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
    if (!term.trim()) return;
    const updated = [term.trim(), ...recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 8);
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

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        let tracks: Track[] = [];
        if (activeFilter === "local") {
          tracks = await musicSourceManager.getLocalAdapter().search(query);
        } else {
          tracks = await musicSourceManager.searchAll(query);
        }
        setResults(tracks);
        saveRecentSearch(query);
      } catch (e) {
        console.error("Search failure:", e);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeFilter]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Search Input Box */}
      <div className="relative">
        <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 sm:p-3 focus-within:border-inisai-accent transition-all shadow-inner">
          <Search className="w-5 h-5 text-inisai-accent ml-2 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Tamil classics, songs, artists, albums, or local files..."
            className="w-full bg-transparent px-3 text-white placeholder-inisai-muted/60 text-sm sm:text-base outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-full text-white/50 hover:text-white mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeFilter === "all"
              ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
              : "bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          All Sources
        </button>

        <button
          onClick={() => setActiveFilter("local")}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeFilter === "local"
              ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
              : "bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          <Disc3 className="w-3.5 h-3.5 text-inisai-teal" />
          <span>Local Device Only</span>
        </button>
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
              className="text-white/40 hover:text-rose-400"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/80 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-inisai-muted space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-inisai-accent border-t-transparent animate-spin" />
          <p className="text-xs">Searching InIsai & local libraries...</p>
        </div>
      ) : query && results.length === 0 ? (
        <div className="py-16 text-center text-inisai-muted space-y-2">
          <p className="text-base text-white/80 font-medium">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-xs">
            Try searching for &ldquo;Pasamalar&rdquo;, &ldquo;Malarndhum&rdquo;, &ldquo;Veena&rdquo;, or load files via Local Music.
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-inisai-muted pb-1">
            <span>Found {results.length} songs</span>
            <span>Click to play</span>
          </div>
          {results.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              playlistContext={results}
            />
          ))}
        </div>
      ) : (
        /* Empty State Suggestions */
        <div className="pt-8 text-center text-inisai-muted space-y-4">
          <Sparkles className="w-8 h-8 mx-auto text-inisai-accent opacity-50" />
          <h3 className="text-sm font-semibold text-white/80">Explore Tamil & World Music</h3>
          <p className="text-xs max-w-sm mx-auto leading-relaxed">
            Search for classic Tamil singers like T. M. Soundararajan, P. Susheela, Ilaiyaraaja, or meditative Veena ragas.
          </p>
        </div>
      )}
    </div>
  );
}
