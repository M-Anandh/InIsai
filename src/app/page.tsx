"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { CURATED_TRACKS, FEATURED_PLAYLISTS, EXPLORE_CATEGORIES } from "@/music/curated-data";
import { TrackCard } from "@/components/music/TrackCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { MusicCarousel } from "@/components/music/MusicCarousel";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { Track, PlaybackContext } from "@/types";
import { buildUserMusicProfile } from "@/lib/recommendations/user-music-profile";
import {
  selectDynamicFeaturedTrack,
  rankPersonalizedRecommendations,
} from "@/lib/recommendations/recommendation-engine";
import {
  Play,
  Pause,
  Sparkles,
  Compass,
  Disc3,
  HeartHandshake,
  Flame,
  Music2,
  History,
  Radio,
  Globe2,
  Heart,
  Plus,
} from "lucide-react";

export default function HomePage() {
  const { playTrack, currentTrack, isPlaying, togglePlay, history, addToQueue } =
    usePlayerStore();
  const { initialize, user, likedTrackIds } = useAuthStore();

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
        // Fetch trending categories in parallel
        const [trendRes, loveRes, melRes, globRes] = await Promise.all([
          fetch("/api/music/trending?category=tamil").catch(() => null),
          fetch("/api/music/trending?category=tamil_love").catch(() => null),
          fetch("/api/music/trending?category=tamil_melody").catch(() => null),
          fetch("/api/music/trending?category=english").catch(() => null),
        ]);

        if (trendRes?.ok) {
          const d = await trendRes.json();
          if (d.results?.length > 0) setTrendingTracks(d.results);
        }
        if (loveRes?.ok) {
          const d = await loveRes.json();
          if (d.results?.length > 0) setLoveSongs(d.results);
        }
        if (melRes?.ok) {
          const d = await melRes.json();
          if (d.results?.length > 0) setMelodySongs(d.results);
        }
        if (globRes?.ok) {
          const d = await globRes.json();
          if (d.results?.length > 0) setGlobalHits(d.results);
        }
      } catch (err) {
        console.warn("Home discovery fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscoveryData();
  }, [initialize]);

  // Combine online and curated pool
  const allCandidates = useMemo(() => {
    const pool = [...trendingTracks, ...loveSongs, ...melodySongs, ...globalHits, ...CURATED_TRACKS];
    const seen = new Set<string>();
    return pool.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [trendingTracks, loveSongs, melodySongs, globalHits]);

  // Build dynamic user profile
  const userAffinity = useMemo(() => {
    const likedTracks = CURATED_TRACKS.filter((t) => likedTrackIds.includes(t.id));
    return buildUserMusicProfile(user, history, likedTracks);
  }, [user, history, likedTrackIds]);

  // Dynamically select featured track based on real user affinity
  const dynamicFeaturedTrack = useMemo(() => {
    return selectDynamicFeaturedTrack(allCandidates, userAffinity, history) || CURATED_TRACKS[0];
  }, [allCandidates, userAffinity, history]);

  // Dynamically rank "Made for you"
  const personalizedTracks = useMemo(() => {
    return rankPersonalizedRecommendations(allCandidates, userAffinity, history, 10);
  }, [allCandidates, userAffinity, history]);

  const activeTrending = trendingTracks.length > 0 ? trendingTracks : CURATED_TRACKS.slice(0, 10);
  const activeLove = loveSongs.length > 0 ? loveSongs : CURATED_TRACKS.filter((t) => t.genre?.includes("Melody")).slice(0, 10);
  const activeMelody = melodySongs.length > 0 ? melodySongs : CURATED_TRACKS.filter((t) => t.language === "Tamil").slice(0, 10);

  const isHeroPlaying = currentTrack?.id === dynamicFeaturedTrack?.id && isPlaying;

  const heroContext: PlaybackContext = {
    id: `home-hero-${dynamicFeaturedTrack?.id}`,
    type: "home_recommendations",
    title: `Featured: ${dynamicFeaturedTrack?.title}`,
  };

  const trendingContext: PlaybackContext = {
    id: "home-trending",
    type: "trending",
    title: "Trending Music Hits",
    trackIds: activeTrending.map((t) => t.id),
  };

  const personalizedContext: PlaybackContext = {
    id: "home-personalized",
    type: "home_recommendations",
    title: "Made For You",
    trackIds: personalizedTracks.map((t) => t.id),
  };

  const handleHeroPlay = () => {
    if (!dynamicFeaturedTrack) return;
    if (currentTrack?.id === dynamicFeaturedTrack.id) {
      togglePlay();
    } else {
      playTrack(dynamicFeaturedTrack, allCandidates, heroContext);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Aurora Glass Featured Hero Banner */}
      {dynamicFeaturedTrack && (
        <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 group">
          {/* Ambient Radial Aurora Glow */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-inisai-accent/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-inisai-teal/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 max-w-xl z-10 text-center md:text-left">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-inisai-accent/20 border border-inisai-accent/30 text-inisai-accent text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended For You</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {dynamicFeaturedTrack.title}
            </h1>
            <p className="text-sm sm:text-base text-inisai-muted font-medium">
              {dynamicFeaturedTrack.artist}
              {dynamicFeaturedTrack.album && ` • ${dynamicFeaturedTrack.album}`}
            </p>
            <p className="text-xs sm:text-sm text-white/70 max-w-md">
              High fidelity audio stream with synchronized lyrics and dynamic equalizer support.
            </p>

            <div className="pt-2 flex items-center justify-center md:justify-start space-x-3">
              <button
                onClick={handleHeroPlay}
                className="flex items-center space-x-2 px-6 py-3 rounded-full bg-white text-black font-bold text-sm shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                {isHeroPlaying ? (
                  <Pause className="w-4 h-4 fill-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black translate-x-0.5" />
                )}
                <span>{isHeroPlaying ? "Pause" : "Listen Now"}</span>
              </button>

              <button
                onClick={() => addToQueue(dynamicFeaturedTrack)}
                className="flex items-center space-x-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Queue</span>
              </button>

              <Link
                href="/local"
                className="hidden sm:flex items-center space-x-2 px-4 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <Disc3 className="w-4 h-4 text-inisai-teal" />
                <span>Local Music</span>
              </Link>
            </div>
          </div>

          {/* Dynamic Artwork with Ambient Projection */}
          <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-2xl overflow-hidden shadow-2xl shadow-inisai-accent/30 border border-white/15 flex-shrink-0 group-hover:scale-[1.02] transition-transform duration-500 bg-black/40">
            <img
              src={dynamicFeaturedTrack.artworkUrl}
              alt={dynamicFeaturedTrack.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* 2. Quick Spotify-Style Recents Grid (Top 6 songs) */}
      {history && history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-inisai-muted flex items-center space-x-2">
            <History className="w-4 h-4 text-inisai-teal" />
            <span>Jump Back In</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.slice(0, 6).map((track) => {
              const isTrackCurrent = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={`rec-${track.id}`}
                  onClick={() => playTrack(track, history, { id: "history-quick", type: "history", title: "Recently Played" })}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-inisai-accent/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-black/40"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-inisai-accent transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-inisai-muted truncate">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <button
                    className={`w-9 h-9 rounded-full bg-inisai-accent text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 mr-2 flex-shrink-0 ${
                      isTrackCurrent ? "opacity-100" : ""
                    }`}
                  >
                    {isTrackCurrent ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white translate-x-0.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Category Filter Shortcuts */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {EXPLORE_CATEGORIES.slice(0, 8).map((cat) => (
          <Link
            key={cat.id}
            href={`/explore?category=${cat.id}`}
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-xs font-semibold whitespace-nowrap text-white/90 hover:text-white transition-all hover:scale-105 cursor-pointer"
          >
            <span>{cat.label}</span>
          </Link>
        ))}
        <Link
          href="/explore"
          className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-inisai-accent/20 border border-inisai-accent/40 text-xs font-semibold whitespace-nowrap text-inisai-accent hover:bg-inisai-accent/30 transition-all cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Explore All</span>
        </Link>
      </div>

      {/* 4. Made For You (Dynamic Personalization Carousel) */}
      <MusicCarousel
        title="Made For You"
        subtitle="Intelligent selections based on your listening profile and preferred languages"
        icon={<Sparkles className="w-5 h-5 text-inisai-accent" />}
      >
        {personalizedTracks.map((track) => (
          <TrackCard
            key={`pf-${track.id}`}
            track={track}
            playlistContext={personalizedTracks}
            context={personalizedContext}
            carouselItem
          />
        ))}
      </MusicCarousel>

      {/* 5. Trending Now (Live Data Carousel) */}
      <MusicCarousel
        title="Trending Music"
        subtitle="Chart-topping hits and viral streams updated regularly"
        seeAllHref="/explore?category=tamil"
        icon={<Flame className="w-5 h-5 text-amber-500" />}
      >
        {activeTrending.map((track) => (
          <TrackCard
            key={`tr-${track.id}`}
            track={track}
            playlistContext={activeTrending}
            context={trendingContext}
            carouselItem
          />
        ))}
      </MusicCarousel>

      {/* 6. Tamil Love & Romantic Melodies */}
      <MusicCarousel
        title="Tamil Love Songs"
        subtitle="Heartwarming romantic melodies, evergreen duets, and soulful classics"
        seeAllHref="/search?q=tamil+love+songs"
        icon={<HeartHandshake className="w-5 h-5 text-rose-500" />}
      >
        {activeLove.map((track) => (
          <TrackCard
            key={`lv-${track.id}`}
            track={track}
            playlistContext={activeLove}
            context={{
              id: "home-love",
              type: "home_recommendations",
              title: "Tamil Love Songs",
            }}
            carouselItem
          />
        ))}
      </MusicCarousel>

      {/* 7. Tamil Golden Melodies */}
      <MusicCarousel
        title="Tamil Golden Melodies"
        subtitle="Ilaiyaraaja, SPB, and evergreen lyrical gems that stand the test of time"
        seeAllHref="/explore?category=tamil"
        icon={<Music2 className="w-5 h-5 text-inisai-teal" />}
      >
        {activeMelody.map((track) => (
          <TrackCard
            key={`gm-${track.id}`}
            track={track}
            playlistContext={activeMelody}
            context={{
              id: "home-melody",
              type: "home_recommendations",
              title: "Tamil Golden Melodies",
            }}
            carouselItem
          />
        ))}
      </MusicCarousel>

      {/* 8. Hand-Crafted Featured Playlists */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <Radio className="w-5 h-5 text-purple-400" />
              <span>Featured Collections</span>
            </h2>
            <p className="text-xs sm:text-sm text-inisai-muted">
              Expertly curated playlists for study, night drives, and relaxation
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

      {/* 9. Global & Bollywood Hits (if available) */}
      {globalHits.length > 0 && (
        <MusicCarousel
          title="Global Hits & Bollywood"
          subtitle="Worldwide popular singles and cross-cultural music trends"
          seeAllHref="/explore?category=english"
          icon={<Globe2 className="w-5 h-5 text-inisai-teal" />}
        >
          {globalHits.map((track) => (
            <TrackCard
              key={`gl-${track.id}`}
              track={track}
              playlistContext={globalHits}
              context={{
                id: "home-global",
                type: "trending",
                title: "Global Hits",
              }}
              carouselItem
            />
          ))}
        </MusicCarousel>
      )}
    </div>
  );
}
