"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CURATED_TRACKS, FEATURED_PLAYLISTS, EXPLORE_CATEGORIES } from "@/music/curated-data";
import { TrackCard } from "@/components/music/TrackCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { Track, PlaybackContext } from "@/types";
import {
  Play,
  Sparkles,
  Compass,
  Disc3,
  HeartHandshake,
  Flame,
  Music2,
  History,
  Radio,
  Globe2,
} from "lucide-react";

export default function HomePage() {
  const { playTrack, currentTrack, history } = usePlayerStore();
  const { initialize, user } = useAuthStore();

  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [loveSongs, setLoveSongs] = useState<Track[]>([]);
  const [melodySongs, setMelodySongs] = useState<Track[]>([]);
  const [globalHits, setGlobalHits] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize();

    const fetchDiscoveryData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Trending Tamil Hits
        const trendRes = await fetch("/api/music/trending?category=tamil");
        if (trendRes.ok) {
          const d = await trendRes.json();
          if (d.results?.length > 0) setTrendingTracks(d.results.slice(0, 8));
        }

        // 2. Fetch Tamil Love Songs
        const loveRes = await fetch("/api/music/trending?category=tamil_love");
        if (loveRes.ok) {
          const d = await loveRes.json();
          if (d.results?.length > 0) setLoveSongs(d.results.slice(0, 8));
        }

        // 3. Fetch Evergreen Melodies
        const melRes = await fetch("/api/music/trending?category=tamil_melody");
        if (melRes.ok) {
          const d = await melRes.json();
          if (d.results?.length > 0) setMelodySongs(d.results.slice(0, 8));
        }

        // 4. Fetch Global / Bollywood
        const globRes = await fetch("/api/music/trending?category=english");
        if (globRes.ok) {
          const d = await globRes.json();
          if (d.results?.length > 0) setGlobalHits(d.results.slice(0, 8));
        }
      } catch (err) {
        console.warn("Dynamic home discovery fallback triggered:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscoveryData();
  }, [initialize]);

  const heroTrack = CURATED_TRACKS[0];

  // Fallbacks if network didn't return songs
  const activeTrending = trendingTracks.length > 0 ? trendingTracks : CURATED_TRACKS.slice(0, 8);
  const activeLove = loveSongs.length > 0 ? loveSongs : CURATED_TRACKS.filter((t) => t.genre?.includes("Melody")).slice(0, 8);
  const activeMelody = melodySongs.length > 0 ? melodySongs : CURATED_TRACKS.filter((t) => t.language === "Tamil").slice(0, 8);

  const heroContext: PlaybackContext = {
    id: "home-hero",
    type: "home_recommendations",
    title: "InIsai Featured Track",
  };

  const trendingContext: PlaybackContext = {
    id: "home-trending",
    type: "trending",
    title: "Trending Music Hits",
    trackIds: activeTrending.map((t) => t.id),
  };

  const loveContext: PlaybackContext = {
    id: "home-love-melodies",
    type: "home_recommendations",
    title: "Tamil Love Songs",
    trackIds: activeLove.map((t) => t.id),
  };

  const melodyContext: PlaybackContext = {
    id: "home-golden-melodies",
    type: "home_recommendations",
    title: "Tamil Golden Melodies",
    trackIds: activeMelody.map((t) => t.id),
  };

  return (
    <div className="space-y-10 pb-12">
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
            Stream timeless melodies and latest chartbusters in ultra high fidelity.
          </p>

          <div className="pt-2 flex items-center justify-center md:justify-start space-x-3">
            <button
              onClick={() => playTrack(heroTrack, CURATED_TRACKS, heroContext)}
              className="flex items-center space-x-2 px-6 py-3 rounded-full bg-white text-black font-bold text-sm shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Listen Now</span>
            </button>

            <Link
              href="/local"
              className="flex items-center space-x-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors cursor-pointer"
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

      {/* Quick Category Shortcuts */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {EXPLORE_CATEGORIES.slice(0, 7).map((cat) => (
          <Link
            key={cat.id}
            href={`/explore?category=${cat.id}`}
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold whitespace-nowrap text-white transition-all hover:scale-105 cursor-pointer"
          >
            <span>{cat.label}</span>
          </Link>
        ))}
        <Link
          href="/explore"
          className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-inisai-accent/20 border border-inisai-accent/40 text-xs font-semibold whitespace-nowrap text-inisai-accent hover:bg-inisai-accent/30 transition-all cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>View All</span>
        </Link>
      </div>

      {/* Continue Listening (if history has tracks) */}
      {history && history.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                <History className="w-5 h-5 text-inisai-teal" />
                <span>Continue Listening</span>
              </h2>
              <p className="text-xs sm:text-sm text-inisai-muted">
                Pick up where you left off from your recent listening history
              </p>
            </div>
            <Link
              href="/history"
              className="text-xs font-semibold text-inisai-teal hover:underline cursor-pointer"
            >
              History
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {history.slice(0, 4).map((track) => (
              <TrackCard
                key={`hist-${track.id}`}
                track={track}
                playlistContext={history}
                context={{
                  id: "history-context",
                  type: "history",
                  title: "Listening History",
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 1: Trending Now (Live Data) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Flame className="w-6 h-6 text-amber-500" />
              <span>Trending Now</span>
            </h2>
            <p className="text-xs sm:text-sm text-inisai-muted">
              Current chartbusters and most popular tracks
            </p>
          </div>
          <Link
            href="/explore?category=tamil"
            className="text-xs font-semibold text-inisai-teal hover:underline cursor-pointer"
          >
            See all
          </Link>
        </div>

        {isLoading && activeTrending.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {activeTrending.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                playlistContext={activeTrending}
                context={trendingContext}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Tamil Love Melodies */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <HeartHandshake className="w-6 h-6 text-rose-500" />
              <span>Tamil Love Songs</span>
            </h2>
            <p className="text-xs sm:text-sm text-inisai-muted">
              Romantic melodies, heartwarming duets, and evergreen love hits
            </p>
          </div>
          <Link
            href="/search?q=tamil+love+songs"
            className="text-xs font-semibold text-inisai-teal hover:underline cursor-pointer"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {activeLove.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              playlistContext={activeLove}
              context={loveContext}
            />
          ))}
        </div>
      </section>

      {/* Section 3: Tamil Golden Melodies */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Music2 className="w-5 h-5 text-inisai-accent" />
              <span>Tamil Golden Melodies</span>
            </h2>
            <p className="text-xs sm:text-sm text-inisai-muted">
              Timeless classics and soothing lyrical masterpieces
            </p>
          </div>
          <Link
            href="/explore?category=tamil"
            className="text-xs font-semibold text-inisai-teal hover:underline cursor-pointer"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {activeMelody.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              playlistContext={activeMelody}
              context={melodyContext}
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
            className="text-xs font-semibold text-inisai-teal hover:underline cursor-pointer"
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

      {/* Section 5: Global English & Bollywood (if available) */}
      {globalHits.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                <Globe2 className="w-5 h-5 text-inisai-teal" />
                <span>Global English & Bollywood</span>
              </h2>
              <p className="text-xs sm:text-sm text-inisai-muted">
                Worldwide top charting pop and cross-cultural melodies
              </p>
            </div>
            <Link
              href="/explore?category=english"
              className="text-xs font-semibold text-inisai-teal hover:underline cursor-pointer"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {globalHits.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                playlistContext={globalHits}
                context={{
                  id: "home-global",
                  type: "trending",
                  title: "Global Hits",
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
