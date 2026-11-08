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
  const [activeFilter, setActiveFilter] = useState<"all" | "youtube" | "local">("all");
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
      let tracks: Track[] = [];

      if (activeFilter === "local") {
        tracks = await musicSourceManager.getLocalAdapter().search(q);
      } else if (activeFilter === "youtube") {
        // Query YouTube Music API endpoint
        const ytRes = await fetch(`/api/music/youtube?q=${encodeURIComponent(q)}`);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          tracks = ytData.results || [];
        }
      } else {
        // All online sources: query standard catalog + merge
        tracks = await musicSourceManager.searchAll(q);
      }

      setResults(tracks);
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
  }, [query, activeFilter]);

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
    id: `search-${activeFilter}-${query.trim() || "query"}`,
    type: "search",
    title: `Search: "${query.trim() || "Results"}" (${activeFilter.toUpperCase()})`,
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
            placeholder="Search Tamil songs, artists, YouTube Music (e.g. Chinna Thamarai, Naa Ready, Ilaiyaraaja)..."
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

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <button
          onClick={() => setActiveFilter("all")}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === "all"
              ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
              : "bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>All Online Sources</span>
        </button>

        <button
          onClick={() => setActiveFilter("youtube")}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === "youtube"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
              : "bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          <Youtube className="w-3.5 h-3.5 text-rose-500 group-hover:text-white" />
          <span>YouTube Music</span>
        </button>

        <button
          onClick={() => setActiveFilter("local")}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === "local"
              ? "bg-inisai-teal text-black shadow-md shadow-inisai-teal/30 font-bold"
              : "bg-white/5 text-white/70 hover:bg-white/10"
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
            Searching {activeFilter === "youtube" ? "YouTube Music" : "InIsai & Tamil catalogs"}...
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
              Found {results.length} songs {activeFilter === "youtube" ? "on YouTube Music" : ""}
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
