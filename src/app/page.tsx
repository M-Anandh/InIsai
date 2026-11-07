"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CURATED_TRACKS, FEATURED_PLAYLISTS, EXPLORE_CATEGORIES } from "@/music/curated-data";
import { TrackCard } from "@/components/music/TrackCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { Play, Sparkles, Compass, Disc3, Disc } from "lucide-react";

export default function HomePage() {
  const { playTrack, currentTrack } = usePlayerStore();
  const { initialize, user } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const tamilTracks = CURATED_TRACKS.filter((t) => t.language === "Tamil");
  const instrumentalTracks = CURATED_TRACKS.filter((t) => t.language === "Instrumental" || t.genre?.includes("Classical"));
  const globalTracks = CURATED_TRACKS.filter((t) => t.language !== "Tamil" && t.language !== "Instrumental");

  const heroTrack = CURATED_TRACKS[0];

  return (
    <div className="space-y-10">
      {/* Hero Featured Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-inisai-card via-[#16132b] to-[#0c1f2d] border border-white/10 p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl z-10 text-center md:text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-inisai-accent/20 border border-inisai-accent/30 text-inisai-accent text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured InIsai Special (சிறப்புப் பாடல்)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Malarndhum Malaraadha
          </h1>
          <p className="text-sm sm:text-base text-inisai-muted font-medium">
            T. M. Soundararajan, P. Susheela • Pasamalar Classics
          </p>
          <p className="text-xs sm:text-sm text-white/70 max-w-md font-tamil">
            இனிமையான தமிழ் மெல்லிசைப் பாடல்களை உயர் தரத்தில் கேட்டு மகிழுங்கள்.
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

        {/* Hero Artwork with Glowing Arc */}
        <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-2xl overflow-hidden shadow-2xl shadow-inisai-accent/30 border border-white/15 flex-shrink-0 group">
          <Image
            src={heroTrack.artworkUrl}
            alt={heroTrack.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            priority
            sizes="240px"
          />
        </div>
      </div>

      {/* Quick Category Shortcuts */}
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

      {/* Section 1: Tamil Classics & Melodies */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Tamil Golden Melodies</span>
              <span className="text-xs font-normal text-inisai-accent font-tamil px-2 py-0.5 rounded-md bg-inisai-accent/15">
                தமிழ் ராகங்கள்
              </span>
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
              playlistContext={CURATED_TRACKS}
            />
          ))}
        </div>
      </section>

      {/* Section 2: Featured Playlists */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Featured Collections (தொகுப்புகள்)
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

      {/* Section 3: Classical & Instrumental Acoustics */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Instrumental & Meditation</span>
              <span className="text-xs font-normal text-inisai-teal font-tamil px-2 py-0.5 rounded-md bg-inisai-teal/15">
                நாத அலைகள்
              </span>
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

      {/* Section 4: Global Hits & Indie */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Global Beats & Ambient
            </h2>
            <p className="text-xs sm:text-sm text-inisai-muted">
              Synthwave, Sufi rhythms, and international melodies
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {globalTracks.map((track) => (
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
