"use client";

import React, { useEffect, useState } from "react";
import { Track } from "@/types";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import { AudioMatchCandidate } from "@/lib/audio/matcher";
import { Music, Check, Loader2, X, AlertCircle } from "lucide-react";

interface WrongVersionModalProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
}

export const WrongVersionModal: React.FC<WrongVersionModalProps> = ({
  track,
  isOpen,
  onClose,
}) => {
  const [candidates, setCandidates] = useState<AudioMatchCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const setToastMessage = usePlayerStore((s) => s.setToastMessage);

  useEffect(() => {
    if (!isOpen || !track) return;
    setIsLoading(true);
    setCandidates([]);
    setSelectedId(track.sourceId || null);

    const params = new URLSearchParams({
      title: track.title,
      artists: track.artist || "",
      duration: (track.duration || 0).toString(),
      debug: "1",
    });
    if (track.album) params.set("film", track.album);

    fetch(`/api/audio/match?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.candidates)) {
          setCandidates(data.candidates.slice(0, 5));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen, track]);

  if (!isOpen) return null;

  const handleSelect = async (cand: AudioMatchCandidate) => {
    setSelectedId(cand.id);

    try {
      // 1. Persist choice in server track_map
      await fetch("/api/audio/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackKey: track.id,
          choice: cand,
        }),
      }).catch(() => {});

      // 2. Switch live playback to selected candidate
      const store = usePlayerStore.getState();
      const updatedTrack: Track = {
        ...track,
        title: cand.title,
        artist: cand.artists,
        album: cand.album,
        duration: cand.duration || track.duration,
        streamUrl: cand.streamUrl,
        bitrate: "320 kbps AAC Audio",
        providerId: "saavn",
        sourceType: "public_api",
        isPlayable: true,
      };

      store.playTrack(updatedTrack);
      setToastMessage(`Switched to: ${cand.title} (${cand.artists.split(",")[0]})`);
      onClose();
    } catch {
      setToastMessage("Failed to switch audio version");
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-[#16131F] border border-white/15 p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
          <div>
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Music className="w-4 h-4 text-inisai-accent" />
              <span>Choose Audio Version</span>
            </h3>
            <p className="text-xs text-white/50 truncate max-w-[280px]">
              For &ldquo;{track.title}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-1 scrollbar-none">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-white/50">
              <Loader2 className="w-6 h-6 animate-spin text-inisai-accent" />
              <p className="text-xs">Finding alternative audio versions...</p>
            </div>
          ) : candidates.length > 0 ? (
            candidates.map((cand, idx) => {
              const isSelected = selectedId === cand.id || cand.streamUrl === track.streamUrl;
              return (
                <button
                  key={`${cand.id}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(cand)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-inisai-accent/20 border-inisai-accent/60 shadow-md"
                      : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {cand.title}
                    </p>
                    <p className="text-[11px] text-white/60 truncate mt-0.5">
                      {cand.artists} {cand.album ? `• ${cand.album}` : ""}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-mono text-white/40">
                        {formatDuration(cand.duration)}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                        Match {Math.round(cand.score * 100)}%
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-7 h-7 rounded-full bg-inisai-accent flex items-center justify-center flex-shrink-0 text-white shadow">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-white/50 space-y-1">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto opacity-70 mb-1" />
              <p className="text-xs font-semibold text-white/80">No other audio versions found</p>
              <p className="text-[11px]">The current audio stream is the best available match.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

