"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CURATED_TRACKS, FEATURED_PLAYLISTS, EXPLORE_CATEGORIES } from "@/music/curated-data";
import { TrackCard } from "@/components/music/TrackCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { Track } from "@/types";
import { Play, Sparkles, Compass, Disc3, HeartHandshake } from "lucide-react";

export default function HomePage() {
  const { playTrack, currentTrack } = usePlayerStore();
  const { initialize, user } = useAuthStore();
  const [loveSongs, setLoveSongs] = useState<Track[]>([]);
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);

  useEffect(() => {
    initialize();

    // Fetch popular Tamil Love Songs for quick discovery
    fetch("/api/music/search?q=tamil+love+songs")
      .then((r) => r.json())
      .then((d) => {
        if (d.results && d.results.length > 0) {
          setLoveSongs(d.results.slice(0, 8));
        }
      })
      .catch(() => {});

    // Fetch general trending recommended songs
    fetch("/api/music/recommend?artist=Anirudh")
      .then((r) => r.json())
      .then((d) => {
        if (d.results && d.results.length > 0) {
          setRecommendedTracks(d.results.slice(0, 8));
        }
      })
      .catch(() => {});
  }, [initialize]);

  const tamilTracks = CURATED_TRACKS.filter((t) => t.language === "Tamil");
  const instrumentalTracks = CURATED_TRACKS.filter(
    (t) => t.language === "Instrumental" || t.genre?.includes("Classical")
  );

  const heroTrack = CURATED_TRACKS[0];

  return (
    <div className="space-y-10">
      {/* Hero Featured Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-inisai-card via-[#16132b] to-[#0c1f2d] border border-white/10 p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl z-10 text-center md:text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-inisai-accent/20 border border-inisai-accent/30 text-inisai-accent text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured Track</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            {heroTrack.title}
          </h1>
          <p className="text-sm sm:text-base text-inisai-muted font-medium">
            {heroTrack.artist} • {heroTrack.album}
          </p>
          <p className="text-xs sm:text-sm text-white/70 max-w-md">
            Stream timeless melodies and latest hits in ultra high quality.
          </p>

          <div className="pt-2 flex items-center justify-center md:justify-start space-x-3">
            <button
              onClick={() => playTrack(heroTrack, CURATED_TRACKS)}
              className="flex items-center space-x-2 px-6 py-3 rounded-full bg-white text-black font-bold text-sm shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-transform"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Listen Now</span>
            </button>

            <Link
              href="/local"
              className="flex items-center space-x-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors"
            >
              <Disc3 className="w-4 h-4 text-inisai-teal" />
              <span>Play Local Songs</span>
            </Link>
          </div>
        </div>

        {/* Hero Artwork */}
        <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-2xl overflow-hidden shadow-2xl shadow-inisai-accent/30 border border-white/15 flex-shrink-0 group bg-black/40">
          <img
            src={heroTrack.artworkUrl}
            alt={heroTrack.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Quick Category Shortcuts (Clean English) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {EXPLORE_CATEGORIES.slice(0, 7).map((cat) => (
          <Link
            key={cat.id}
            href={`/explore?category=${cat.id}`}
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold whitespace-nowrap text-white transition-all hover:scale-105"
          >
            <span>{cat.label}</span>
          </Link>
        ))}
        <Link
          href="/explore"
          className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-inisai-accent/20 border border-inisai-accent/40 text-xs font-semibold whitespace-nowrap text-inisai-accent hover:bg-inisai-accent/30 transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>View All</span>
        </Link>
      </div>

      {/* Section 1: Tamil Love Songs & Melodies (Dynamic) */}
      {loveSongs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                <HeartHandshake className="w-6 h-6 text-rose-500" />
                <span>Tamil Love Songs</span>
              </h2>
              <p className="text-xs sm:text-sm text-inisai-muted">
                Heartwarming romantic melodies, duets, and evergreen love hits
              </p>
            </div>
            <Link
              href="/search?q=tamil+love+songs"
              className="text-xs font-semibold text-inisai-teal hover:underline"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {loveSongs.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                playlistContext={loveSongs}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Recommended For You (Auto Radio) */}
      {recommendedTracks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-inisai-accent" />
                <span>Recommended For You</span>
              </h2>
              <p className="text-xs sm:text-sm text-inisai-muted">
                Top charting hits, energetic rhythms, and trending tracks
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {recommendedTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                playlistContext={recommendedTracks}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Tamil Golden Melodies */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Tamil Golden Melodies
            </h2>
            <p className="text-xs sm:text-sm text-inisai-muted">
              Timeless classics and soothing lyrical masterpieces
            </p>
          </div>
          <Link
            href="/explore?category=tamil"
            className="text-xs font-semibold text-inisai-teal hover:underline"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {tamilTracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              playlistContext={tamilTracks}
            />
          ))}
        </div>
      </section>

      {/* Section 4: Featured Playlists */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Featured Collections
            </h2>
            <p className="text-xs sm:text-sm text-inisai-muted">
              Hand-crafted playlists for study, relaxation, and devotion
            </p>
          </div>
          <Link
            href="/playlists"
            className="text-xs font-semibold text-inisai-teal hover:underline"
          >
            All playlists
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURED_PLAYLISTS.map((pl) => {
            const tracks = CURATED_TRACKS.filter((t) => pl.trackIds.includes(t.id));
            const fullPl = { ...pl, tracks };
            return <PlaylistCard key={pl.id} playlist={fullPl} />;
          })}
        </div>
      </section>

      {/* Section 5: Classical & Instrumental Acoustics */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Instrumental & Meditation
            </h2>
            <p className="text-xs sm:text-sm text-inisai-muted">
              Veena, Carnatic acoustic fusion, and morning ragas
            </p>
          </div>
          <Link
            href="/explore?category=instrumental"
            className="text-xs font-semibold text-inisai-teal hover:underline"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {instrumentalTracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              playlistContext={CURATED_TRACKS}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
