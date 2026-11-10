"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { CoverImage } from "@/components/ui/CoverImage";
import { formatDuration } from "@/lib/utils";
import { extractArtworkPalette, DynamicPalette } from "@/lib/theme/palette-extractor";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
import { AudioVisualizer } from "./AudioVisualizer";
import { LyricsView } from "./LyricsView";
import { QueueView } from "./QueueView";
import { EqualizerDrawer } from "./EqualizerDrawer";
import {
  ChevronDown,
  MoreHorizontal,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  ListMusic,
  Mic2,
  Sliders,
  Moon,
  Video,
  Radio,
  Activity,
  X,
} from "lucide-react";

export const FullScreenPlayer: React.FC = () => {
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    buffered,
    engineId,
    engineCapabilities,
    videoQuality,
    latencyMs,
    sleepTimerEndOfTrack,
    playbackContext,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    repeatMode,
    setRepeatMode,
    isShuffle,
    toggleShuffle,
    settings,
    setVolume,
    toggleMute,
    setSleepTimer,
    setPreference,
    isFullScreenOpen,
    setFullScreenOpen,
    activeDrawerTab,
    setActiveDrawerTab,
  } = usePlayerStore();

  const { isLiked, toggleLikeTrack } = useAuthStore();
  const mounted = useMounted();

  const [palette, setPalette] = useState<DynamicPalette>({
    primary: "#7A5CFF",
    secondary: "#FF3D77",
    glow: "rgba(122, 92, 255, 0.35)",
  });
  const [mediaMode, setMediaMode] = useState<"audio" | "video">("audio");
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [sleepSheetOpen, setSleepSheetOpen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverXPercent, setHoverXPercent] = useState<number>(0);

  const videoSlotRef = useRef<HTMLDivElement | null>(null);
  const swipeStartY = useRef<number | null>(null);

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    } catch {}
  };

  // Extract dynamic artwork palette with 600ms transition
  useEffect(() => {
    if (!currentTrack) return;
    let cancelled = false;
    extractArtworkPalette(currentTrack.artworkUrl, currentTrack.id).then((pal) => {
      if (!cancelled && pal) {
        setPalette(pal);
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--accent-dynamic", pal.primary);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentTrack]);

  // Body scroll lock & overscroll containment when sheet is open
  useEffect(() => {
    if (!isFullScreenOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullScreenOpen]);

  // Reset video mode if active track has no YT videoId
  useEffect(() => {
    if (engineId !== "youtube") {
      setMediaMode("audio");
    }
  }, [engineId, currentTrack?.id]);

  // Sync single persistent YT IFrame bounding box cleanly
  useEffect(() => {
    const syncRect = () => {
      if (
        isFullScreenOpen &&
        activeDrawerTab === "nowPlaying" &&
        mediaMode === "video" &&
        engineId === "youtube" &&
        videoSlotRef.current
      ) {
        const rect = videoSlotRef.current.getBoundingClientRect();
        engineCoordinator.setYouTubeViewportRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        engineCoordinator.setYouTubeViewportRect(null);
      }
    };

    syncRect();
    window.addEventListener("resize", syncRect);
    return () => {
      window.removeEventListener("resize", syncRect);
      engineCoordinator.setYouTubeViewportRect(null);
    };
  }, [isFullScreenOpen, mediaMode, engineId, activeDrawerTab]);

  // Global keyboard shortcuts (Space, ArrowLeft/Right, M, L, Escape)
  useEffect(() => {
    if (!currentTrack) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (e.key === "Escape" && isFullScreenOpen) {
        setFullScreenOpen(false);
      } else if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        seek(Math.max(0, currentTime - 5));
      } else if (e.key === "ArrowRight") {
        seek(Math.min(duration || currentTime + 5, currentTime + 5));
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      } else if (e.key.toLowerCase() === "l") {
        if (!isFullScreenOpen) setFullScreenOpen(true);
        setActiveDrawerTab(activeDrawerTab === "lyrics" ? "nowPlaying" : "lyrics");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentTrack,
    isFullScreenOpen,
    currentTime,
    duration,
    activeDrawerTab,
    togglePlay,
    seek,
    toggleMute,
    setFullScreenOpen,
    setActiveDrawerTab,
  ]);

  if (!mounted || !isFullScreenOpen || !currentTrack) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const liked = isLiked(currentTrack.id);

  const cycleRepeat = () => {
    if (repeatMode === "off") setRepeatMode("all");
    else if (repeatMode === "all") setRepeatMode("one");
    else setRepeatMode("off");
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeDrawerTab !== "nowPlaying") return;
    swipeStartY.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartY.current === null || activeDrawerTab !== "nowPlaying") return;
    const endY = e.changedTouches[0]?.clientY ?? swipeStartY.current;
    const dy = endY - swipeStartY.current;
    swipeStartY.current = null;
    if (dy > 80) {
      setFullScreenOpen(false);
    }
  };

  const updateHoverScrub = (clientX: number, rect: DOMRect) => {
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHoverXPercent(ratio * 100);
    setHoverTime(ratio * (duration || 0));
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 h-[100dvh] flex flex-col bg-[#0B0A10] text-[#F6F3EE] overflow-hidden overscroll-contain transition-colors duration-500"
      role="dialog"
      aria-label="Full Screen Music Player"
    >
      {/* Dynamic Artwork-Driven Aurora Backdrop (600ms smooth color transitions) */}
      <div
        className="absolute inset-0 opacity-35 blur-3xl scale-125 -z-10 bg-cover bg-center pointer-events-none transition-all duration-[600ms]"
        style={{ backgroundImage: currentTrack.artworkUrl ? `url(${currentTrack.artworkUrl})` : undefined }}
      />
      <div
        className="absolute inset-0 -z-10 pointer-events-none transition-all duration-[600ms]"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${palette.glow} 0%, rgba(19, 17, 27, 0.88) 55%, #0B0A10 100%)`,
        }}
      />

      {/* Mobile Top Sheet Drag Handle */}
      <div className="w-full flex justify-center pt-2.5 pb-1 md:hidden">
        <div className="w-10 h-1 rounded-full bg-white/25" />
      </div>

      {/* Top Header: ChevronDown Left, Centered Label, Overflow Menu Right */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 flex-shrink-0">
        <button
          onClick={() => setFullScreenOpen(false)}
          aria-label="Collapse Player"
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center min-w-0 px-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
            Now Playing
          </p>
          {playbackContext?.title && (
            <p className="text-xs font-medium text-white/90 truncate max-w-[180px] sm:max-w-xs">
              {playbackContext.title}
            </p>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setOverflowOpen((o) => !o)}
            aria-label="Player options"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {overflowOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-12 z-50 w-56 rounded-2xl bg-[#1C1928]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-1.5 text-xs font-medium space-y-0.5"
            >
              {currentTrack.youtubeVideoId && engineId === "youtube" && (
                <button
                  onClick={() => {
                    setMediaMode((m) => (m === "video" ? "audio" : "video"));
                    setOverflowOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Video className="w-4 h-4 text-rose-400" />
                    <span>{mediaMode === "video" ? "Switch to Artwork" : "Watch Official Video"}</span>
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  setPreference("statsForNerd", !settings.statsForNerd);
                  setOverflowOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-inisai-teal" />
                  <span>Stats for Nerds</span>
                </span>
                <span className="text-[10px] text-white/50">
                  {settings.statsForNerd ? "On" : "Off"}
                </span>
              </button>

              <button
                onClick={() => {
                  setOverflowOpen(false);
                  setFullScreenOpen(false);
                  router.push("/settings/sources");
                }}
                className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <Radio className="w-4 h-4 text-inisai-accent" />
                <span>Manage Audio Sources</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Stage */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-between px-5 sm:px-8 pb-4 pt-2 scrollbar-none">
        {activeDrawerTab === "lyrics" && <LyricsView />}
        {activeDrawerTab === "queue" && <QueueView />}
        {activeDrawerTab === "equalizer" && <EqualizerDrawer />}

        {activeDrawerTab === "nowPlaying" && (
          <div className="flex flex-col items-center justify-between w-full max-w-md mx-auto flex-1 py-1 space-y-4">
            {/* Optional Audio / Video Switcher when YT engine active */}
            {currentTrack.youtubeVideoId && engineId === "youtube" && (
              <div className="flex items-center space-x-1 p-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
                <button
                  onClick={() => setMediaMode("audio")}
                  className={`flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    mediaMode === "audio" ? "bg-white text-black shadow" : "text-white/70 hover:text-white"
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Audio</span>
                </button>
                <button
                  onClick={() => setMediaMode("video")}
                  className={`flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    mediaMode === "video" ? "bg-rose-600 text-white shadow" : "text-white/70 hover:text-white"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>
              </div>
            )}

            {/* Visual Centerpiece: Video Viewport OR Dynamic Parallax Artwork */}
            <div className="w-full flex items-center justify-center my-auto py-1">
              {mediaMode === "video" && currentTrack.youtubeVideoId && engineId === "youtube" ? (
                <div
                  ref={videoSlotRef}
                  className="w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-black flex items-center justify-center"
                >
                  <span className="text-xs text-white/40 font-mono">Syncing YouTube Video...</span>
                </div>
              ) : (
                <div
                  className={`relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden border border-white/15 transition-all duration-700 ${
                    isPlaying ? "scale-100" : "scale-[0.94] opacity-90"
                  }`}
                  style={{
                    boxShadow: isPlaying
                      ? `0 24px 60px -10px ${palette.glow}`
                      : "0 16px 40px -12px rgba(0,0,0,0.65)",
                  }}
                >
                  <CoverImage
                    src={currentTrack.artworkUrl}
                    alt={currentTrack.title}
                    youtubeVideoId={currentTrack.youtubeVideoId}
                    type="track"
                    aspect="square"
                  />
                </div>
              )}
            </div>

            {/* Stats for Nerds Telemetry Card */}
            {settings.statsForNerd && (
              <div className="w-full p-3 rounded-2xl bg-black/50 border border-white/15 text-[11px] font-mono text-white/80 grid grid-cols-2 gap-x-4 gap-y-1">
                <span>Engine: {engineId === "youtube" ? "YT.Player IFrame" : "WebAudio <audio>"}</span>
                <span>Source: {currentTrack.providerId || currentTrack.sourceType}</span>
                <span className="truncate">ID: {currentTrack.youtubeVideoId || currentTrack.sourceId}</span>
                <span>Rate: {settings.playbackRate}x {videoQuality ? `(${videoQuality})` : ""}</span>
                <span>Buffered: {Math.round(buffered || 0)}%</span>
                <span>Latency: {latencyMs !== undefined ? `${latencyMs}ms` : "Live"}</span>
              </div>
            )}

            {/* Track Info & Like on One Row */}
            <div className="w-full flex items-center justify-between gap-3 pt-1">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-extrabold truncate tracking-tight">
                  {currentTrack.title}
                </h2>
                <p className="text-sm text-white/65 truncate mt-0.5">
                  {currentTrack.artist}
                  {currentTrack.album && currentTrack.album !== "YouTube Music" && ` • ${currentTrack.album}`}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-medium text-white/70">
                    {currentTrack.sourceAttribution ||
                      (engineId === "youtube" ? "YouTube Music" : "InIsai Audio")}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerHaptic();
                  toggleLikeTrack(currentTrack);
                }}
                aria-label={liked ? "Unlike" : "Like"}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform cursor-pointer"
              >
                <Heart
                  className={`w-6 h-6 transition-transform ${
                    liked ? "fill-[#FF3D77] text-[#FF3D77] scale-110" : "text-white/80"
                  }`}
                />
              </button>
            </div>

            {/* Honest Engine-Aware Visualizer / Ambient Ribbon */}
            <div className="w-full max-w-sm">
              <AudioVisualizer className="w-full h-8" />
            </div>

            {/* Scrubber with Hover/Drag Preview Tooltip & Buffered Bar */}
            <div className="w-full space-y-1.5 relative">
              {hoverTime !== null && (
                <div
                  className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded-md bg-white text-black text-[11px] font-mono font-bold shadow-lg pointer-events-none"
                  style={{ left: `${hoverXPercent}%` }}
                >
                  {formatDuration(hoverTime)}
                </div>
              )}

              <div
                className="w-full h-2.5 bg-white/15 rounded-full cursor-pointer relative overflow-hidden"
                onMouseMove={(e) => updateHoverScrub(e.clientX, e.currentTarget.getBoundingClientRect())}
                onMouseLeave={() => setHoverTime(null)}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seek(ratio * (duration || 0));
                }}
              >
                {/* Buffered Range */}
                <div
                  className="absolute inset-y-0 left-0 bg-white/20 transition-all"
                  style={{ width: `${Math.min(100, buffered || 0)}%` }}
                />
                {/* Active Progress */}
                <div
                  className="relative h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${progressPercent}%`,
                    background: "linear-gradient(90deg, #FF8A3D 0%, #FF3D77 50%, #7A5CFF 100%)",
                  }}
                />
              </div>

              <div className="flex justify-between text-xs font-mono text-white/55">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Transport Row */}
            <div className="flex items-center justify-between w-full pt-1">
              <button
                onClick={toggleShuffle}
                aria-label="Toggle Shuffle"
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isShuffle ? "text-[#FF8A3D]" : "text-white/45 hover:text-white"
                }`}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  triggerHaptic();
                  prevTrack();
                }}
                aria-label="Previous Track"
                className="w-12 h-12 rounded-full flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition-transform cursor-pointer"
              >
                <SkipBack className="w-7 h-7 fill-current" />
              </button>

              <button
                onClick={() => {
                  triggerHaptic();
                  togglePlay();
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-black" />
                ) : (
                  <Play className="w-8 h-8 fill-black translate-x-0.5" />
                )}
              </button>

              <button
                onClick={() => {
                  triggerHaptic();
                  nextTrack();
                }}
                aria-label="Next Track"
                className="w-12 h-12 rounded-full flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition-transform cursor-pointer"
              >
                <SkipForward className="w-7 h-7 fill-current" />
              </button>

              <button
                onClick={cycleRepeat}
                aria-label={`Repeat Mode: ${repeatMode}`}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  repeatMode !== "off" ? "text-[#7A5CFF]" : "text-white/45 hover:text-white"
                }`}
              >
                {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            {/* Volume Slider (Fine-Pointer Desktop Only) */}
            <div className="hidden [@media(pointer:fine)]:flex items-center space-x-3 w-full max-w-xs pt-1">
              <button
                onClick={toggleMute}
                aria-label={settings.isMuted ? "Unmute" : "Mute"}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                {settings.isMuted || settings.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                aria-label="Volume"
                value={settings.isMuted ? 0 : settings.volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet Triggers Row (Lyrics · Queue · FX · Sleep) */}
      <div className="px-4 sm:px-8 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 border-t border-white/10 bg-black/40 backdrop-blur-2xl flex items-center justify-around max-w-md w-full mx-auto">
        <button
          onClick={() => setActiveDrawerTab(activeDrawerTab === "lyrics" ? "nowPlaying" : "lyrics")}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
            activeDrawerTab === "lyrics" ? "text-[#FF8A3D]" : "text-white/65 hover:text-white"
          }`}
        >
          <Mic2 className="w-4 h-4 mb-0.5" />
          <span>Lyrics</span>
        </button>

        <button
          onClick={() => setActiveDrawerTab(activeDrawerTab === "queue" ? "nowPlaying" : "queue")}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
            activeDrawerTab === "queue" ? "text-[#FF3D77]" : "text-white/65 hover:text-white"
          }`}
        >
          <ListMusic className="w-4 h-4 mb-0.5" />
          <span>Queue</span>
        </button>

        {engineCapabilities.eq || engineCapabilities.speed ? (
          <button
            onClick={() => setActiveDrawerTab(activeDrawerTab === "equalizer" ? "nowPlaying" : "equalizer")}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
              activeDrawerTab === "equalizer" ? "text-[#7A5CFF]" : "text-white/65 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4 mb-0.5" />
            <span>FX</span>
          </button>
        ) : null}

        <button
          onClick={() => setSleepSheetOpen(true)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
            settings.sleepTimerMinutes || sleepTimerEndOfTrack
              ? "text-amber-400"
              : "text-white/65 hover:text-white"
          }`}
        >
          <Moon className="w-4 h-4 mb-0.5" />
          <span>
            {sleepTimerEndOfTrack
              ? "End"
              : settings.sleepTimerMinutes
              ? `${settings.sleepTimerMinutes}m`
              : "Sleep"}
          </span>
        </button>
      </div>

      {/* Sleep Timer Quick Bottom Sheet */}
      {sleepSheetOpen && (
        <div
          onClick={() => setSleepSheetOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-[#1C1928] border border-white/15 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base flex items-center space-x-2">
                <Moon className="w-4 h-4 text-amber-400" />
                <span>Sleep Timer</span>
              </h4>
              <button
                onClick={() => setSleepSheetOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
                aria-label="Close sleep timer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
              {[
                { label: "Off", value: null },
                { label: "15 Minutes", value: 15 },
                { label: "30 Minutes", value: 30 },
                { label: "60 Minutes", value: 60 },
                { label: "End of Track", value: "end_of_track" as const },
              ].map((item) => {
                const isActive =
                  item.value === "end_of_track"
                    ? sleepTimerEndOfTrack
                    : item.value === null
                    ? !sleepTimerEndOfTrack && settings.sleepTimerMinutes === null
                    : settings.sleepTimerMinutes === item.value;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSleepTimer(item.value);
                      setSleepSheetOpen(false);
                    }}
                    className={`py-3 px-4 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-amber-400 text-black border-amber-400"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
