"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePlayerStore } from "@/stores/player-store";
import {
  parseLrc,
  getActiveLyricsIndex,
  hasTamilScript,
  transliterateTamil,
} from "@/lib/lyrics-parser";
import { musicSourceManager } from "@/music/adapters/MusicSourceManager";
import { Mic2, Clock, ArrowLeft, Languages, Loader2 } from "lucide-react";

const lyricsCache = new Map<string, string | null>();

export const LyricsView: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const storeTime = usePlayerStore((s) => s.currentTime);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const seek = usePlayerStore((s) => s.seek);
  const setActiveDrawerTab = usePlayerStore((s) => s.setActiveDrawerTab);

  const [rawLyrics, setRawLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [offsetSec, setOffsetSec] = useState<number>(0);
  const [showTranslit, setShowTranslit] = useState(false);
  const [smoothTime, setSmoothTime] = useState(storeTime);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLButtonElement | null>(null);

  // Smooth rAF clock interpolation (enhances 10Hz YT IFrame polling & <audio> timeupdate)
  useEffect(() => {
    setSmoothTime(storeTime);
    if (!isPlaying) return;

    let rafId: number;
    let lastStamp = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastStamp) / 1000;
      lastStamp = now;
      setSmoothTime((prev) => prev + dt);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [storeTime, isPlaying]);

  // Fetch & cache lyrics for track
  useEffect(() => {
    let isCancelled = false;
    async function loadLyrics() {
      if (!currentTrack) {
        setRawLyrics(null);
        return;
      }

      if (lyricsCache.has(currentTrack.id)) {
        setRawLyrics(lyricsCache.get(currentTrack.id) || null);
        return;
      }

      setIsLoading(true);
      const lyrics = await musicSourceManager.resolveLyrics(currentTrack);
      lyricsCache.set(currentTrack.id, lyrics);
      if (!isCancelled) {
        setRawLyrics(lyrics);
        setIsLoading(false);
      }
    }
    loadLyrics();
    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);

  const parsedLyrics = useMemo(() => {
    if (!rawLyrics) return [];
    return parseLrc(rawLyrics);
  }, [rawLyrics]);

  const containsTamil = useMemo(() => {
    return rawLyrics ? hasTamilScript(rawLyrics) : false;
  }, [rawLyrics]);

  const activeIndex = useMemo(() => {
    return getActiveLyricsIndex(parsedLyrics, smoothTime, offsetSec);
  }, [parsedLyrics, smoothTime, offsetSec]);

  // Eased auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-inisai-muted">
        <Mic2 className="w-12 h-12 mb-3 stroke-1 opacity-50" />
        <p className="text-sm">No track currently playing</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3 text-inisai-muted">
        <Loader2 className="w-8 h-8 animate-spin text-inisai-accent" />
        <p className="text-xs">Loading synchronized lyrics...</p>
      </div>
    );
  }

  if (!rawLyrics) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-inisai-muted space-y-3">
        <Mic2 className="w-12 h-12 stroke-1 text-inisai-accent opacity-50" />
        <p className="font-semibold text-white/85">Lyrics Unavailable</p>
        <p className="text-xs text-white/50 max-w-xs">
          Lyrics for &ldquo;{currentTrack.title}&rdquo; are not currently indexed in LRCLIB or YouTube Music.
        </p>
        <button
          onClick={() => setActiveDrawerTab("nowPlaying")}
          className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer"
        >
          Back to Artwork
        </button>
      </div>
    );
  }

  // Fallback for plain text lyrics (when timestamps absent)
  if (parsedLyrics.length === 0) {
    const plainLines = rawLyrics.split("\n");
    return (
      <div className="flex flex-col h-full max-w-xl mx-auto px-4 py-2 w-full">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 text-xs">
          <button
            onClick={() => setActiveDrawerTab("nowPlaying")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Artwork</span>
          </button>
          {containsTamil && (
            <button
              onClick={() => setShowTranslit((v) => !v)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
                showTranslit ? "bg-inisai-accent text-white" : "bg-white/10 text-white/75"
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Transliterate</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 text-base sm:text-lg leading-relaxed font-tamil text-white/85 scrollbar-none">
          {plainLines.map((line, idx) => (
            <p key={idx}>
              {showTranslit && containsTamil ? transliterateTamil(line) : line || "\u00A0"}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-3 sm:px-6 py-2 w-full">
      {/* Top Toolbar: Back + Tamil Transliteration + Offset Nudge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-white/10 text-xs">
        <button
          onClick={() => setActiveDrawerTab("nowPlaying")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Artwork</span>
        </button>

        <div className="flex items-center space-x-2">
          {containsTamil && (
            <button
              onClick={() => setShowTranslit((v) => !v)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
                showTranslit ? "bg-inisai-accent text-white" : "bg-white/10 text-white/75 hover:bg-white/20"
              }`}
              title="Toggle Tamil Latin transliteration"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>அ→Aa</span>
            </button>
          )}

          {/* Sync Offset Controls (±0.5s) */}
          <div className="flex items-center space-x-1 bg-white/5 border border-white/10 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3 text-inisai-accent mr-0.5" />
            <button
              onClick={() => setOffsetSec((v) => Math.max(-5, v - 0.5))}
              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono cursor-pointer"
              title="Delay lyrics -0.5s"
            >
              -0.5s
            </button>
            <span className="font-mono text-[11px] text-white/80 min-w-[36px] text-center">
              {offsetSec > 0 ? `+${offsetSec.toFixed(1)}` : offsetSec.toFixed(1)}s
            </span>
            <button
              onClick={() => setOffsetSec((v) => Math.min(5, v + 0.5))}
              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono cursor-pointer"
              title="Advance lyrics +0.5s"
            >
              +0.5s
            </button>
          </div>
        </div>
      </div>

      {/* Apple-Style Synchronized Scrolling Lyrics Viewport */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-16 space-y-5 scrollbar-none scroll-smooth"
      >
        {parsedLyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isPast = idx < activeIndex;
          const nextLineTime = parsedLyrics[idx + 1]?.time ?? line.time + 4;
          const lineDuration = Math.max(0.5, nextLineTime - line.time);
          const adjustedTime = smoothTime + offsetSec;
          const lineProgress = isActive
            ? Math.max(0, Math.min(1, (adjustedTime - line.time) / lineDuration))
            : isPast
            ? 1
            : 0;

          const displayLine =
            showTranslit && hasTamilScript(line.text)
              ? transliterateTamil(line.text)
              : line.text;

          const words = line.words || displayLine.split(/\s+/).filter(Boolean).map((w, wi, arr) => ({
            text: showTranslit && hasTamilScript(w) ? transliterateTamil(w) : w,
            time: line.time + (wi / Math.max(1, arr.length)) * lineDuration,
          }));

          return (
            <button
              key={`${line.time}-${idx}`}
              ref={isActive ? activeLineRef : null}
              onClick={() => seek(Math.max(0, line.time - offsetSec))}
              className={`block w-full text-left px-3 py-1.5 rounded-2xl transition-all duration-300 font-tamil cursor-pointer ${
                isActive
                  ? "text-2xl sm:text-3xl font-extrabold text-white scale-[1.02] origin-left drop-shadow-[0_2px_12px_rgba(255,255,255,0.2)]"
                  : isPast
                  ? "text-lg sm:text-xl font-bold text-white/35 blur-[0.4px] hover:blur-none hover:text-white/80"
                  : "text-lg sm:text-xl font-bold text-white/45 blur-[0.5px] hover:blur-none hover:text-white/85"
              }`}
            >
              {isActive && words.length > 0 ? (
                <span className="inline-flex flex-wrap gap-x-2">
                  {words.map((word, wIdx) => {
                    const isWordSung = adjustedTime >= word.time || lineProgress > (wIdx + 0.3) / words.length;
                    return (
                      <span
                        key={wIdx}
                        className={`transition-all duration-150 ${
                          isWordSung ? "text-white scale-[1.01]" : "text-white/45"
                        }`}
                      >
                        {word.text}
                      </span>
                    );
                  })}
                </span>
              ) : (
                <span>{displayLine}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
