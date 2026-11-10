"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { CURATED_TRACKS, EXPLORE_CATEGORIES } from "@/music/curated-data";
import { INISAI_OFFICIAL_COLLECTIONS } from "@/music/collections";
import { TrackCard } from "@/components/music/TrackCard";
import { MusicCarousel } from "@/components/music/MusicCarousel";
import { CoverImage } from "@/components/ui/CoverImage";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { Track, PlaybackContext, Shelf } from "@/types";
import { buildUserMusicProfile } from "@/lib/recommendations/user-music-profile";
import {
  selectDynamicFeaturedTrack,
  rankPersonalizedRecommendations,
  buildDailyMixes,
} from "@/lib/recommendations/recommendation-engine";
import {
  getAllSignals,
  computeTasteSummary,
  ComputedTasteSummary,
} from "@/lib/personalization/signal-tracker";
import {
  Play,
  Pause,
  Sparkles,
  Compass,
  Disc3,
  Flame,
  History,
  Radio,
  Plus,
  ListMusic,
} from "lucide-react";

export default function HomePage() {
  const { playTrack, currentTrack, isPlaying, togglePlay, history, addToQueue } =
    usePlayerStore();
  const { initialize, user, likedTrackIds } = useAuthStore();

  const [ytShelves, setYtShelves] = useState<Shelf[]>([]);
  const [saavnTrending, setSaavnTrending] = useState<Track[]>([]);
  const [seedRelated, setSeedRelated] = useState<Track[]>([]);
  const [tasteSummary, setTasteSummary] = useState<ComputedTasteSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize();

    const fetchDiscoveryData = async () => {
      setIsLoading(true);
      try {
        const signals = await getAllSignals();
        const summary = computeTasteSummary(signals);
        setTasteSummary(summary);

        const seedVid = summary.seedVideoIds[0] || history[0]?.youtubeVideoId;

        const [ytHomeRes, saavnRes, relatedRes] = await Promise.allSettled([
          fetch("/api/yt/home").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/music/trending?category=tamil").then((r) => (r.ok ? r.json() : null)),
          seedVid
            ? fetch(`/api/yt/related?videoId=${encodeURIComponent(seedVid)}`).then((r) =>
                r.ok ? r.json() : null
              )
            : Promise.resolve(null),
        ]);

        if (ytHomeRes.status === "fulfilled" && ytHomeRes.value?.shelves?.length > 0) {
          setYtShelves(ytHomeRes.value.shelves);
        }
        if (saavnRes.status === "fulfilled" && saavnRes.value?.results?.length > 0) {
          setSaavnTrending(saavnRes.value.results);
        }
        if (relatedRes.status === "fulfilled" && relatedRes.value?.results?.length > 0) {
          setSeedRelated(relatedRes.value.results);
        }
      } catch (err) {
        console.warn("Home discovery fetch note:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscoveryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialize]);

  // Combine online and curated pool
  const allCandidates = useMemo(() => {
    const shelfTracks = ytShelves.flatMap((s) => s.items || []);
    const pool = [...seedRelated, ...shelfTracks, ...saavnTrending, ...CURATED_TRACKS];
    const seen = new Set<string>();
    return pool.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [ytShelves, saavnTrending, seedRelated]);

  // Build dynamic user profile
  const userAffinity = useMemo(() => {
    const likedTracks = allCandidates.filter((t) => likedTrackIds.includes(t.id));
    return buildUserMusicProfile(user, history, likedTracks, tasteSummary);
  }, [user, history, likedTrackIds, allCandidates, tasteSummary]);

  // Daily Mixes & Discover Weekly-style recommendations
  const dailyMixes = useMemo(() => {
    return buildDailyMixes(allCandidates, userAffinity, history);
  }, [allCandidates, userAffinity, history]);

  // Dynamically select featured track based on user affinity
  const dynamicFeaturedTrack = useMemo(() => {
    return selectDynamicFeaturedTrack(allCandidates, userAffinity, history) || CURATED_TRACKS[0];
  }, [allCandidates, userAffinity, history]);

  // Dynamically rank "Made for you"
  const personalizedTracks = useMemo(() => {
    return rankPersonalizedRecommendations(allCandidates, userAffinity, history, 12);
  }, [allCandidates, userAffinity, history]);

  const isHeroPlaying = currentTrack?.id === dynamicFeaturedTrack?.id && isPlaying;

  const heroContext: PlaybackContext = {
    id: `home-hero-${dynamicFeaturedTrack?.id}`,
    type: "home_recommendations",
    title: `Featured: ${dynamicFeaturedTrack?.title}`,
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
      playTrack(dynamicFeaturedTrack, allCandidates.slice(0, 20), heroContext);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Aurora Glass Featured Hero Banner */}
      {dynamicFeaturedTrack && (
        <div className="relative rounded-3xl overflow-hidden glass-panel border border-slate-200/80 dark:border-white/10 p-6 sm:p-10 shadow-xl dark:shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 group">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-inisai-accent/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-inisai-teal/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 max-w-xl z-10 text-center md:text-left">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-inisai-accent/15 border border-inisai-accent/30 text-inisai-accent text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended For You</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {dynamicFeaturedTrack.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-inisai-muted font-medium">
              {dynamicFeaturedTrack.artist}
              {dynamicFeaturedTrack.album && dynamicFeaturedTrack.album !== "YouTube Music" && ` • ${dynamicFeaturedTrack.album}`}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-white/70 max-w-md">
              Every Beat, Your World — high fidelity streaming, word-synced lyrics, and intelligent personalization.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={handleHeroPlay}
                className="flex items-center space-x-2 px-6 py-3 rounded-full bg-inisai-accent dark:bg-white text-white dark:text-black font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                {isHeroPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                )}
                <span>{isHeroPlaying ? "Pause" : "Listen Now"}</span>
              </button>

              <button
                onClick={() => addToQueue(dynamicFeaturedTrack)}
                className="flex items-center space-x-2 px-5 py-3 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-900 dark:text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Queue</span>
              </button>

              <Link
                href="/local"
                className="hidden sm:flex items-center space-x-2 px-4 py-3 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 font-semibold text-sm transition-colors cursor-pointer"
              >
                <Disc3 className="w-4 h-4 text-inisai-teal" />
                <span>Local Music</span>
              </Link>
            </div>
          </div>

          <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/15 flex-shrink-0 group-hover:scale-[1.02] transition-transform duration-500">
            <CoverImage
              src={dynamicFeaturedTrack.artworkUrl}
              alt={dynamicFeaturedTrack.title}
              youtubeVideoId={dynamicFeaturedTrack.youtubeVideoId}
              type="track"
              aspect="square"
            />
          </div>
        </div>
      )}

      {/* 2. Quick Spotify-Style Jump Back In Grid (Top 6 recents) */}
      {history && history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-inisai-muted flex items-center space-x-2">
            <History className="w-4 h-4 text-inisai-teal" />
            <span>Jump Back In</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.slice(0, 6).map((track) => {
              const isTrackCurrent = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={`rec-${track.id}`}
                  onClick={() =>
                    playTrack(track, history, {
                      id: "history-quick",
                      type: "history",
                      title: "Recently Played",
                    })
                  }
                  className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/5 hover:border-inisai-accent/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <CoverImage
                        src={track.artworkUrl}
                        alt={track.title}
                        youtubeVideoId={track.youtubeVideoId}
                        aspect="square"
                      />
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-inisai-muted truncate">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <button
                    aria-label={isTrackCurrent ? "Pause" : "Play"}
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
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/5 text-xs font-semibold whitespace-nowrap text-slate-800 dark:text-white/90 hover:text-inisai-accent transition-all cursor-pointer shadow-sm"
          >
            <span>{cat.label}</span>
          </Link>
        ))}
        <Link
          href="/explore"
          className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-inisai-accent/15 border border-inisai-accent/30 text-xs font-semibold whitespace-nowrap text-inisai-accent hover:bg-inisai-accent/25 transition-all cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Explore All</span>
        </Link>
      </div>

      {/* 4. Made For You */}
      <MusicCarousel
        title="Made For You"
        subtitle="Personalized selections tailored to your listening affinity"
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

      {/* 4b. Because you listened to {topArtist} (Seeded from YT Music Related Radio) */}
      {seedRelated.length > 0 && (
        <MusicCarousel
          title={`Because you listened to ${tasteSummary?.topArtists?.[0]?.name || history[0]?.artist?.split(",")[0] || "your favorites"}`}
          subtitle="Fresh related radio & similar soundscapes discovered for you"
          icon={<Disc3 className="w-5 h-5 text-inisai-teal" />}
        >
          {seedRelated.slice(0, 12).map((track) => (
            <TrackCard
              key={`rel-${track.id}`}
              track={track}
              playlistContext={seedRelated}
              context={{
                id: "home-related-seed",
                type: "home_recommendations",
                title: "Because you listened",
                trackIds: seedRelated.map((t) => t.id),
              }}
              carouselItem
            />
          ))}
        </MusicCarousel>
      )}

      {/* 4c. Your Daily Mixes (Taste Profile Clusters) */}
      {dailyMixes.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-inisai-teal" />
              <span>Your Daily Mixes</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-inisai-muted">
              Evolving 30-day decayed mixes tuned to your time of day
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dailyMixes.map((mix) => (
              <div
                key={mix.id}
                onClick={() =>
                  playTrack(mix.tracks[0], mix.tracks, {
                    id: mix.id,
                    type: "home_recommendations",
                    title: mix.title,
                  })
                }
                className="group relative rounded-2xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 p-4 flex items-center space-x-4 cursor-pointer shadow-sm hover:shadow-xl transition-all"
              >
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${mix.gradient} flex items-center justify-center text-white font-extrabold text-sm shadow-inner flex-shrink-0`}
                >
                  <Play className="w-6 h-6 fill-white translate-x-0.5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent">
                    {mix.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-inisai-muted line-clamp-2 mt-0.5">
                    {mix.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. InIsai Official Collections (Runtime-Resolved 25+ Track Playlists) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <Radio className="w-5 h-5 text-inisai-accent" />
              <span>InIsai Official Collections</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-inisai-muted">
              Curated multi-era collections resolved live — open any card for 25+ tracks
            </p>
          </div>
          <Link
            href="/explore"
            className="text-xs font-semibold text-inisai-accent hover:underline cursor-pointer"
          >
            Browse charts
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {INISAI_OFFICIAL_COLLECTIONS.map((col) => (
            <Link
              key={col.id}
              href={`/playlist/${encodeURIComponent(col.id)}`}
              className="group relative rounded-2xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 p-3 flex flex-col space-y-3 shadow-sm hover:shadow-xl transition-all"
            >
              <div
                className={`relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br ${col.gradient} p-4 flex flex-col justify-between text-white shadow-inner`}
              >
                <ListMusic className="w-6 h-6 opacity-80" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-75">
                    InIsai Official
                  </span>
                  <p className="text-base sm:text-lg font-extrabold leading-tight line-clamp-2 drop-shadow">
                    {col.title}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent">
                  {col.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-inisai-muted line-clamp-1 mt-0.5">
                  {col.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Dynamic YouTube Music Home Shelves */}
      {isLoading && ytShelves.length === 0 ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="flex space-x-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="w-44 h-56 rounded-2xl bg-slate-200 dark:bg-white/5 flex-shrink-0" />
            ))}
          </div>
        </div>
      ) : (
        ytShelves.map((shelf) => (
          <MusicCarousel
            key={shelf.id}
            title={shelf.title}
            subtitle={shelf.subtitle}
            icon={<Flame className="w-5 h-5 text-amber-500" />}
          >
            {shelf.items.map((track) => (
              <TrackCard
                key={`${shelf.id}-${track.id}`}
                track={track}
                playlistContext={shelf.items}
                context={{
                  id: `shelf-${shelf.id}`,
                  type: "trending",
                  title: shelf.title,
                  trackIds: shelf.items.map((t) => t.id),
                }}
                carouselItem
              />
            ))}
          </MusicCarousel>
        ))
      )}
    </div>
  );
}
