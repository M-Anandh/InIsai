"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { CURATED_TRACKS, EXPLORE_CATEGORIES } from "@/music/curated-data";
import { INISAI_OFFICIAL_COLLECTIONS } from "@/music/collections";
import { TrackCard } from "@/components/music/TrackCard";
import { MusicCarousel } from "@/components/music/MusicCarousel";
import { CoverImage } from "@/components/ui/CoverImage";
import { PWAInstaller } from "@/components/pwa/PWAInstaller";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { useLanguageStore, AVAILABLE_LANGUAGES } from "@/stores/language-store";
import { isTrackBlocked } from "@/config/blocklist";
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
  Globe,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

interface FeaturedMovieSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  filmTitle: string;
  releaseStatus: "released" | "upcoming";
  releaseLabel: string;
  releaseDate?: string;
  language: string;
  youtubeVideoId?: string;
  streamUrl?: string;
  isPlayable: boolean;
}

const FEATURE_NEW_RELEASES = false;

export default function HomePage() {
  const { playTrack, currentTrack, isPlaying, togglePlay, history, addToQueue } =
    usePlayerStore();
  const { initialize, user, likedTrackIds } = useAuthStore();
  const { selectedLanguages, toggleLanguage } = useLanguageStore();

  const [ytShelves, setYtShelves] = useState<Shelf[]>([]);
  const [saavnTrending, setSaavnTrending] = useState<Track[]>([]);
  const [seedRelated, setSeedRelated] = useState<Track[]>([]);
  const [tasteSummary, setTasteSummary] = useState<ComputedTasteSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [langModalOpen, setLangModalOpen] = useState(false);

  const safeLanguages = useMemo(() => {
    return Array.isArray(selectedLanguages) && selectedLanguages.length > 0
      ? selectedLanguages
      : ["Tamil", "English"];
  }, [selectedLanguages]);

  const safeLikedTrackIds = useMemo(() => {
    return Array.isArray(likedTrackIds) ? likedTrackIds : [];
  }, [likedTrackIds]);

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

  // Combine online discovery pool
  const allCandidates = useMemo(() => {
    const shelfTracks = ytShelves.flatMap((s) => s.items || []);
    const pool = [...seedRelated, ...shelfTracks, ...saavnTrending];
    const seen = new Set<string>();
    return pool.filter((t) => {
      if (seen.has(t.id)) return false;
      if (isTrackBlocked(t)) return false;
      seen.add(t.id);
      return true;
    });
  }, [ytShelves, saavnTrending, seedRelated]);

  // Build dynamic user profile
  const userAffinity = useMemo(() => {
    const likedTracks = allCandidates.filter((t) => safeLikedTrackIds.includes(t.id));
    const profile = buildUserMusicProfile(user, history || [], likedTracks, tasteSummary);
    for (const l of safeLanguages) {
      if (l && typeof l === "string") {
        profile.preferredLanguages[l.toLowerCase()] = (profile.preferredLanguages[l.toLowerCase()] || 0) + 20;
      }
    }
    return profile;
  }, [user, history, safeLikedTrackIds, allCandidates, tasteSummary, safeLanguages]);

  // Daily Mixes & Discover Weekly-style recommendations
  const dailyMixes = useMemo(() => {
    return buildDailyMixes(allCandidates, userAffinity, history);
  }, [allCandidates, userAffinity, history]);

  // User Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Quick picks: 2x3 grid (up to 6 items)
  // If user has history: pick from history & daily mixes
  // If guest / no history: 3 Daily Mixes + 3 top collections
  const quickPicks = useMemo(() => {
    interface QuickPickItem {
      id: string;
      title: string;
      subtitle: string;
      artworkUrl?: string;
      track?: Track;
      mixId?: string;
      collectionId?: string;
      type: "track" | "mix" | "collection";
    }

    const items: QuickPickItem[] = [];

    if (history && history.length > 0) {
      for (const t of history.slice(0, 3)) {
        items.push({
          id: `hist-${t.id}`,
          title: t.title,
          subtitle: t.artist,
          artworkUrl: t.artworkUrl,
          track: t,
          type: "track",
        });
      }
      for (const m of dailyMixes.slice(0, 3)) {
        if (items.length >= 6) break;
        items.push({
          id: `mix-${m.id}`,
          title: m.title,
          subtitle: "Daily Mix",
          artworkUrl: m.tracks[0]?.artworkUrl,
          mixId: m.id,
          type: "mix",
        });
      }
    } else {
      for (const m of dailyMixes.slice(0, 3)) {
        items.push({
          id: `mix-${m.id}`,
          title: m.title,
          subtitle: "Daily Mix",
          artworkUrl: m.tracks[0]?.artworkUrl,
          mixId: m.id,
          type: "mix",
        });
      }
      for (const col of INISAI_OFFICIAL_COLLECTIONS.slice(0, 3)) {
        if (items.length >= 6) break;
        items.push({
          id: `col-${col.id}`,
          title: col.title,
          subtitle: "Official Collection",
          artworkUrl: col.artworkUrl,
          collectionId: col.id,
          type: "collection",
        });
      }
    }

    return items.slice(0, 6);
  }, [history, dailyMixes]);

  // Dynamically rank "Made for you"
  const personalizedTracks = useMemo(() => {
    return rankPersonalizedRecommendations(allCandidates, userAffinity, history, 12);
  }, [allCandidates, userAffinity, history]);

  const personalizedContext: PlaybackContext = {
    id: "home-personalized",
    type: "home_recommendations",
    title: "Made For You",
    trackIds: personalizedTracks.map((t) => t.id),
  };

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* Dismissible Mobile / Desktop PWA Install Banner */}
      <PWAInstaller variant="banner" />

      {/* 1. Header Greeting & Quick Picks (2x3 Grid) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {greeting}
            {user?.displayName ? `, ${user.displayName}` : ""}
          </h1>
          <span className="text-xs font-semibold text-inisai-accent flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick picks</span>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickPicks.map((item) => {
            const isItemPlaying =
              item.track && currentTrack?.id === item.track.id && isPlaying;

            const handleClick = () => {
              if (item.type === "track" && item.track) {
                if (currentTrack?.id === item.track.id) {
                  togglePlay();
                } else {
                  playTrack(item.track, [item.track, ...allCandidates.slice(0, 20)], {
                    id: "quick-picks",
                    type: "home_recommendations",
                    title: "Quick picks",
                  });
                }
              }
            };

            const CardContent = (
              <div
                onClick={item.type === "track" ? handleClick : undefined}
                className="group relative flex items-center gap-3 p-2 sm:p-2.5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 hover:border-inisai-accent/40 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden select-none"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden flex-shrink-0 relative shadow-sm">
                  <CoverImage
                    src={item.artworkUrl}
                    alt={item.title}
                    kind={item.type === "track" ? "song" : item.type === "mix" ? "playlist" : "collection"}
                    aspect="square"
                  />
                  {isItemPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Pause className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-inisai-muted truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
                <div className="pr-1 sm:pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-inisai-accent text-white flex items-center justify-center shadow-md">
                    <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                  </div>
                </div>
              </div>
            );

            if (item.type === "mix" && item.mixId) {
              return (
                <Link key={item.id} href={`/mix/${encodeURIComponent(item.mixId)}`}>
                  {CardContent}
                </Link>
              );
            }
            if (item.type === "collection" && item.collectionId) {
              return (
                <Link key={item.id} href={`/collection/${encodeURIComponent(item.collectionId)}`}>
                  {CardContent}
                </Link>
              );
            }
            return <div key={item.id}>{CardContent}</div>;
          })}
        </div>
      </div>

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

      {/* 3. Category & Language Filter Shortcuts */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setLangModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-inisai-accent/15 border border-inisai-accent/30 text-xs font-semibold whitespace-nowrap text-inisai-accent hover:bg-inisai-accent/25 transition-all cursor-pointer shadow-sm"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Languages ({safeLanguages.length})</span>
        </button>

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
          className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold whitespace-nowrap text-slate-700 dark:text-white/80 transition-all cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Explore All</span>
        </Link>
      </div>

      {/* 3b. New & Upcoming Movie Songs Shelf (Behind FEATURE_NEW_RELEASES flag) */}
      {FEATURE_NEW_RELEASES && (
        <MusicCarousel
          title="New & Upcoming Movie Songs"
          subtitle="Fresh theatrical drops & anticipated soundtracks in your languages"
          icon={<Flame className="w-5 h-5 text-inisai-turmeric" />}
          seeAllHref="/new"
        >
          {[]}
        </MusicCarousel>
      )}

      {/* 4. Made For You */}
      <MusicCarousel
        title="Made For You"
        subtitle="Personalized selections tailored to your listening affinity"
        icon={<Sparkles className="w-5 h-5 text-inisai-accent" />}
      >
        {personalizedTracks.map((track, idx) => (
          <TrackCard
            key={`pf-${track.id}`}
            track={track}
            index={idx}
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
          {seedRelated.slice(0, 12).map((track, idx) => (
            <TrackCard
              key={`rel-${track.id}`}
              track={track}
              index={idx}
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
              <Link
                key={mix.id}
                href={`/mix/${encodeURIComponent(mix.id)}`}
                className="group relative rounded-2xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 p-3.5 flex items-center space-x-4 cursor-pointer shadow-sm hover:shadow-xl transition-all"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-inner flex-shrink-0 bg-slate-200 dark:bg-black/40">
                  <CoverImage
                    src={mix.artworkUrl}
                    alt={mix.title}
                    fallbackTracks={mix.tracks}
                    type="playlist"
                    aspect="square"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (mix.tracks.length > 0) {
                          playTrack(mix.tracks[0], mix.tracks, {
                            id: mix.id,
                            type: "home_recommendations",
                            title: mix.title,
                            trackIds: mix.tracks.map((t) => t.id),
                          });
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-inisai-accent text-white flex items-center justify-center shadow-lg shadow-inisai-accent/40 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      title={`Play ${mix.title}`}
                      aria-label={`Play ${mix.title}`}
                    >
                      <Play className="w-4 h-4 fill-white translate-x-0.5" />
                    </button>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-inisai-accent">
                    {mix.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-inisai-muted line-clamp-2 mt-0.5">
                    {mix.subtitle}
                  </p>
                  <p className="text-[10px] text-inisai-teal font-semibold mt-1">
                    {mix.tracks.length} songs
                  </p>
                </div>
              </Link>
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
              href={`/collection/${encodeURIComponent(col.id)}`}
              className="group relative rounded-2xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-inisai-accent/40 p-3 flex flex-col space-y-3 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-inner group/cover">
                <CoverImage
                  id={`col-${col.id}`}
                  src={col.artworkUrl}
                  alt={col.title}
                  kind="collection"
                  aspect="square"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <ListMusic className="w-4 h-4 text-white/90" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        fetch(`/api/yt/collections?id=${encodeURIComponent(col.id)}`)
                          .then((r) => r.json())
                          .then((data) => {
                            if (data.tracks && data.tracks.length > 0) {
                              playTrack(data.tracks[0], data.tracks, {
                                id: `col-${col.id}`,
                                type: "playlist",
                                title: col.title,
                                trackIds: data.tracks.map((t: any) => t.id),
                              });
                            }
                          })
                          .catch(() => {});
                      }}
                      className="w-9 h-9 rounded-full bg-inisai-accent/90 hover:bg-inisai-accent backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-md cursor-pointer"
                      title={`Play ${col.title}`}
                      aria-label={`Play ${col.title}`}
                    >
                      <Play className="w-4 h-4 fill-white translate-x-0.5" />
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-inisai-accent drop-shadow">
                      InIsai Official
                    </span>
                    <p className="text-base sm:text-lg font-extrabold leading-tight line-clamp-2 text-white drop-shadow">
                      {col.title}
                    </p>
                  </div>
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
            {shelf.items.map((track, idx) => (
              <TrackCard
                key={`${shelf.id}-${track.id}`}
                track={track}
                index={idx}
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

      {/* Multi-Select Language Preference Modal */}
      {langModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-inisai-accent" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Music Languages</h3>
              </div>
              <button
                onClick={() => setLangModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-inisai-muted">
              Select one or more languages to tailor your home feed, daily mixes, and recommended charts:
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {AVAILABLE_LANGUAGES.map((lang) => {
                const isSelected = safeLanguages.includes(lang.id);
                return (
                  <button
                    key={lang.id}
                    onClick={() => toggleLanguage(lang.id)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-inisai-accent/15 border-inisai-accent text-inisai-accent"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-slate-300"
                    }`}
                  >
                    <span>{lang.nativeLabel} ({lang.label})</span>
                    {isSelected && <Check className="w-4 h-4 text-inisai-accent" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setLangModalOpen(false)}
                className="px-5 py-2.5 rounded-full bg-inisai-accent text-white font-bold text-xs shadow-md shadow-inisai-accent/30 hover:opacity-95"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
