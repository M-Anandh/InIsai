"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { EXPLORE_CATEGORIES, CATEGORY_QUERY_MAP, CURATED_TRACKS } from "@/music/curated-data";
import { TrackCard } from "@/components/music/TrackCard";
import { TrackRow } from "@/components/music/TrackRow";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { useSearchParams } from "next/navigation";
import { Track, PlaybackContext } from "@/types";
import { Compass, LayoutGrid, List, Loader2 } from "lucide-react";

function ExploreContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || "all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [onlineTracks, setOnlineTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync category state when URL query parameter changes
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  // Fetch online tracks matching the selected category
  useEffect(() => {
    let isCancelled = false;

    if (selectedCategory === "all") {
      setOnlineTracks([]);
      setIsLoading(false);
      return;
    }

    const query = CATEGORY_QUERY_MAP[selectedCategory] || `${selectedCategory} songs`;
    setIsLoading(true);

    fetch(`/api/music/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isCancelled && data.results) {
          setOnlineTracks(data.results);
        }
      })
      .catch((err) => {
        console.warn("Category tracks fetch error:", err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory]);

  const displayedTracks = useMemo(() => {
    // 1. Filter local curated tracks matching category
    let localMatches = CURATED_TRACKS;
    if (selectedCategory !== "all") {
      const cat = selectedCategory.toLowerCase();
      localMatches = CURATED_TRACKS.filter((track) => {
        const lang = (track.language || "").toLowerCase();
        const genre = (track.genre || "").toLowerCase();
        return (
          lang.includes(cat) ||
          genre.includes(cat) ||
          (cat === "classical" && (genre.includes("carnatic") || genre.includes("classical"))) ||
          (cat === "lofi" && (genre.includes("lofi") || genre.includes("chill"))) ||
          (cat === "devotional" && (genre.includes("devotional") || lang.includes("sanskrit")))
        );
      });
    }

    // 2. Merge local and online tracks (avoiding duplicate IDs)
    const combined = [...localMatches];
    const seenIds = new Set(localMatches.map((t) => t.id));

    for (const ot of onlineTracks) {
      if (!seenIds.has(ot.id)) {
        combined.push(ot);
        seenIds.add(ot.id);
      }
    }

    return combined;
  }, [selectedCategory, onlineTracks]);

  return (
    <div className="space-y-8">
      <BackNavigation fallbackUrl="/" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Compass className="w-7 h-7 text-inisai-accent" />
            <span>Explore & Discover</span>
          </h1>
          <p className="text-xs sm:text-sm text-inisai-muted mt-1">
            Browse top hits by language, mood, genre, or regional classical traditions.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "grid" ? "bg-inisai-accent text-white" : "text-white/50 hover:text-white"
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "list" ? "bg-inisai-accent text-white" : "text-white/50 hover:text-white"
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === "all"
              ? "bg-inisai-accent text-white shadow-lg shadow-inisai-accent/30 font-bold"
              : "bg-white/5 hover:bg-white/10 text-white/70"
          }`}
        >
          All Genres
        </button>

        {EXPLORE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? "bg-inisai-accent text-white shadow-lg shadow-inisai-accent/30 font-bold"
                : "bg-white/5 hover:bg-white/10 text-white/70"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-inisai-muted">
        <span>Showing {displayedTracks.length} tracks</span>
        {isLoading && (
          <span className="flex items-center space-x-1.5 text-inisai-accent">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading {selectedCategory} songs...</span>
          </span>
        )}
      </div>

      {/* Track Grid / List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {displayedTracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              playlistContext={displayedTracks}
              context={{
                id: `explore-${selectedCategory}`,
                type: "trending",
                title: `Explore: ${selectedCategory}`,
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
                id: `explore-${selectedCategory}`,
                type: "trending",
                title: `Explore: ${selectedCategory}`,
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
