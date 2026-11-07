"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { parseLrc, getActiveLyricsIndex } from "@/lib/lyrics-parser";
import { musicSourceManager } from "@/music/adapters/MusicSourceManager";
import { Mic2, Clock } from "lucide-react";

export const LyricsView: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const seek = usePlayerStore((s) => s.seek);

  const [rawLyrics, setRawLyrics] = useState<string | null>(null);
  const [offsetSec, setOffsetSec] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  // Fetch or resolve lyrics for current track
  useEffect(() => {
    let isCancelled = false;
    async function loadLyrics() {
      if (!currentTrack) {
        setRawLyrics(null);
        return;
      }
      const lyrics = await musicSourceManager.resolveLyrics(currentTrack);
      if (!isCancelled) {
        setRawLyrics(lyrics);
      }
    }
    loadLyrics();
    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);

  // Parse synchronized LRC lines
  const parsedLyrics = useMemo(() => {
    if (!rawLyrics) return [];
    return parseLrc(rawLyrics);
  }, [rawLyrics]);

  const activeIndex = useMemo(() => {
    return getActiveLyricsIndex(parsedLyrics, currentTime, offsetSec);
  }, [parsedLyrics, currentTime, offsetSec]);

  // Auto-scroll to active line
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
        <p>No track currently playing</p>
      </div>
    );
  }

  if (!rawLyrics && parsedLyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-inisai-muted">
        <Mic2 className="w-12 h-12 mb-3 stroke-1 text-inisai-accent opacity-50" />
        <p className="font-medium text-white/80">Lyrics Unavailable (வரிகள் கிடைக்கவில்லை)</p>
        <p className="text-xs text-inisai-muted mt-1 max-w-xs">
          Lyrics for &ldquo;{currentTrack.title}&rdquo; are not currently indexed or licensed for display.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-4 py-2">
      {/* Sync Offset Controls (only shown if time-synced) */}
      {parsedLyrics.length > 0 && (
        <div className="flex items-center justify-between text-xs py-2 px-3 mb-2 rounded-xl bg-white/5 border border-white/5 text-inisai-muted">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-inisai-accent" />
            <span>Sync Calibration:</span>
            <span className="font-mono text-white">
              {offsetSec > 0 ? `+${offsetSec.toFixed(1)}s` : `${offsetSec.toFixed(1)}s`}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setOffsetSec((v) => Math.max(-5, v - 0.5))}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono"
            >
              -0.5s
            </button>
            <button
              onClick={() => setOffsetSec(0)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono"
            >
              Reset
            </button>
            <button
              onClick={() => setOffsetSec((v) => Math.min(5, v + 0.5))}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono"
            >
              +0.5s
            </button>
          </div>
        </div>
      )}

      {/* Lyrics Scroll View */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-6 py-12 px-2 scroll-smooth text-center"
      >
        {parsedLyrics.length > 0 ? (
          parsedLyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <p
                key={`${line.time}-${idx}`}
                ref={isActive ? activeLineRef : null}
                onClick={() => seek(line.time)}
                className={`transition-all duration-300 cursor-pointer font-medium select-none ${
                  isActive
                    ? "text-2xl sm:text-3xl text-white font-bold scale-105 drop-shadow-[0_0_15px_rgba(139,92,246,0.6)]"
                    : "text-lg sm:text-xl text-white/30 hover:text-white/60"
                }`}
              >
                {line.text}
              </p>
            );
          })
        ) : (
          <div className="whitespace-pre-line text-lg leading-relaxed text-white/70">
            {rawLyrics}
          </div>
        )}
      </div>
    </div>
  );
};

