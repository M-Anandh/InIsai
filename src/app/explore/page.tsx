"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { EXPLORE_CATEGORIES, CATEGORY_QUERY_MAP, CURATED_TRACKS } from "@/music/curated-data";
import { TrackCard } from "@/components/music/TrackCard";
import { TrackRow } from "@/components/music/TrackRow";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { useSearchParams } from "next/navigation";
import { Track } from "@/types";
import { Compass, LayoutGrid, List, Loader2, Globe2 } from "lucide-react";

const CHART_REGIONS = [
  { code: "IN", label: "India Top Charts" },
  { code: "TN", label: "Tamil Nadu Hits" },
  { code: "US", label: "USA Charts" },
  { code: "GLOBAL", label: "Global Top 50" },
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || "all");
  const [selectedCountry, setSelectedCountry] = useState<string>("IN");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [onlineTracks, setOnlineTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const endpoint =
      selectedCategory === "all"
        ? `/api/yt/charts?country=${encodeURIComponent(selectedCountry)}`
        : `/api/yt/search?q=${encodeURIComponent(
            CATEGORY_QUERY_MAP[selectedCategory] || `${selectedCategory} songs`
          )}&type=song`;

    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        if (!isCancelled) {
          setOnlineTracks(data.songs || data.results || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory, selectedCountry]);

  const displayedTracks = useMemo(() => {
    const localMatches =
      selectedCategory === "all"
        ? []
        : CURATED_TRACKS.filter((track) => {
            const cat = selectedCategory.toLowerCase();
            const lang = (track.language || "").toLowerCase();
            const genre = (track.genre || "").toLowerCase();
            return lang.includes(cat) || genre.includes(cat);
          });

    const combined = [...onlineTracks];
    const seenIds = new Set(onlineTracks.map((t) => t.id));
    for (const loc of localMatches) {
      if (!seenIds.has(loc.id)) {
        combined.push(loc);
        seenIds.add(loc.id);
      }
    }
    return combined.length > 0 ? combined : CURATED_TRACKS;
  }, [selectedCategory, onlineTracks]);

  return (
    <div className="space-y-6 pb-16">
      <BackNavigation fallbackUrl="/" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Compass className="w-7 h-7 text-inisai-accent" />
            <span>Explore & Charts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-inisai-muted mt-1">
            Browse real-time country charts, languages, moods, and classical ragas.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {selectedCategory === "all" && (
            <div className="flex items-center space-x-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs">
              <Globe2 className="w-3.5 h-3.5 text-inisai-teal" />
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                aria-label="Chart Region"
                className="bg-transparent text-slate-900 dark:text-white font-semibold outline-none cursor-pointer"
              >
                {CHART_REGIONS.map((r) => (
                  <option key={r.code} value={r.code} className="bg-white dark:bg-[#1C1928]">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1 bg-white dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-inisai-accent text-white"
                  : "text-slate-400 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-inisai-accent text-white"
                  : "text-slate-400 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="List view"
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === "all"
              ? "bg-inisai-accent text-white shadow-lg shadow-inisai-accent/30 font-bold"
              : "bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white/75 border border-slate-200 dark:border-white/10"
          }`}
        >
          Live Charts
        </button>

        {EXPLORE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? "bg-inisai-accent text-white shadow-lg shadow-inisai-accent/30 font-bold"
                : "bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white/75 border border-slate-200 dark:border-white/10"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-inisai-muted">
        <span>Showing {displayedTracks.length} tracks</span>
        {isLoading && (
          <span className="flex items-center space-x-1.5 text-inisai-accent font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing live catalog...</span>
          </span>
        )}
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {displayedTracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              playlistContext={displayedTracks}
              context={{
                id: `explore-${selectedCategory}-${selectedCountry}`,
                type: "trending",
                title: selectedCategory === "all" ? `Top Charts (${selectedCountry})` : `Explore: ${selectedCategory}`,
                trackIds: displayedTracks.map((t) => t.id),
              }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {displayedTracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              playlistContext={displayedTracks}
              context={{
                id: `explore-${selectedCategory}-${selectedCountry}`,
                type: "trending",
                title: selectedCategory === "all" ? `Top Charts (${selectedCountry})` : `Explore: ${selectedCategory}`,
                trackIds: displayedTracks.map((t) => t.id),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-inisai-muted">Loading Explore...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
