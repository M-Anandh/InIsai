"use client";

import React, { useState, useMemo, Suspense } from "react";
import { EXPLORE_CATEGORIES, CURATED_TRACKS } from "@/music/curated-data";
import { TrackCard } from "@/components/music/TrackCard";
import { TrackRow } from "@/components/music/TrackRow";
import { useSearchParams } from "next/navigation";
import { Compass, LayoutGrid, List } from "lucide-react";

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredTracks = useMemo(() => {
    if (selectedCategory === "all") return CURATED_TRACKS;

    return CURATED_TRACKS.filter((track) => {
      const cat = selectedCategory.toLowerCase();
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
  }, [selectedCategory]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Compass className="w-7 h-7 text-inisai-accent" />
            <span>Explore & Discover (ஆராய்ந்து அறி)</span>
          </h1>
          <p className="text-xs sm:text-sm text-inisai-muted mt-1">
            Browse by language, mood, genre, or regional classical traditions.
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
          All Genres (அனைத்தும்)
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
        <span>Showing {filteredTracks.length} tracks</span>
        <span className="font-tamil">
          {selectedCategory === "tamil" ? "தூய தமிழ் ராகங்கள்" : "InIsai Collection"}
        </span>
      </div>

      {/* Track Grid / List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {filteredTracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              playlistContext={filteredTracks}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              playlistContext={filteredTracks}
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
