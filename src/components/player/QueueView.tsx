"use client";

import React, { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { formatDuration } from "@/lib/utils";
import { Play, Trash2, ArrowUp, ArrowDown, ListMusic, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import { Track } from "@/types";

export const QueueView: React.FC = () => {
  const {
    queue,
    queueIndex,
    currentTrack,
    playTrack,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    addToQueue,
  } = usePlayerStore();

  const [recommended, setRecommended] = useState<Track[]>([]);

  useEffect(() => {
    if (currentTrack) {
      fetch(
        `/api/music/recommend?id=${encodeURIComponent(
          currentTrack.sourceId || ""
        )}&artist=${encodeURIComponent(currentTrack.artist || "")}`
      )
        .then((r) => r.json())
        .then((d) => {
          if (d.results) {
            // Exclude tracks already in queue
            const filtered = d.results.filter(
              (rt: Track) => !queue.some((q) => q.id === rt.id)
            );
            setRecommended(filtered.slice(0, 10));
          }
        })
        .catch(() => {});
    }
  }, [currentTrack, queue]);

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-4 py-2 overflow-y-auto">
      {/* Current Queue Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
        <div>
          <h3 className="font-semibold text-white text-base">Now Playing Queue</h3>
          <p className="text-xs text-inisai-muted">{queue.length} songs in queue</p>
        </div>
        {queue.length > 0 && (
          <button
            onClick={() => clearQueue()}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded-lg bg-rose-500/10"
          >
            Clear Queue
          </button>
        )}
      </div>

      {/* Queue Track List */}
      {queue.length > 0 ? (
        <div className="space-y-2 mb-6">
          {queue.map((track, idx) => {
            const isCurrent = idx === queueIndex || track.id === currentTrack?.id;
            return (
              <div
                key={`${track.id}-${idx}`}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                  isCurrent
                    ? "bg-inisai-accent/20 border border-inisai-accent/40 shadow-sm"
                    : "bg-white/5 border border-white/5 hover:bg-white/10"
                }`}
              >
                <div
                  className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => playTrack(track)}
                >
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                    <Image
                      src={track.artworkUrl}
                      alt={track.title}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Play className="w-4 h-4 text-inisai-accent fill-inisai-accent animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate font-medium ${
                        isCurrent ? "text-inisai-accent font-semibold" : "text-white"
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-inisai-muted truncate">
                      {track.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  <span className="text-xs font-mono text-inisai-muted mr-2">
                    {formatDuration(track.duration)}
                  </span>

                  {idx > 0 && (
                    <button
                      onClick={() => reorderQueue(idx, idx - 1)}
                      className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {idx < queue.length - 1 && (
                    <button
                      onClick={() => reorderQueue(idx, idx + 1)}
                      className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => removeFromQueue(idx)}
                    className="p-1 rounded text-white/40 hover:text-rose-400 hover:bg-white/10"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center text-inisai-muted mb-4">
          <ListMusic className="w-10 h-10 mb-2 stroke-1 opacity-50 text-inisai-accent" />
          <p className="text-white/80 font-medium text-sm">Queue is empty</p>
          <p className="text-xs text-inisai-muted mt-0.5">
            Play any song from Home or Search to begin.
          </p>
        </div>
      )}

      {/* Recommended Songs (Up Next Auto-Radio) */}
      {recommended.length > 0 && (
        <div className="pt-2 border-t border-white/10 space-y-3 pb-8">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-inisai-teal flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended Up Next</span>
            </h4>
            <button
              onClick={() => {
                recommended.forEach((rt) => addToQueue(rt));
                setRecommended([]);
              }}
              className="text-xs font-semibold text-inisai-accent hover:underline"
            >
              Add All
            </button>
          </div>

          <div className="space-y-1.5">
            {recommended.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/5 border border-white/5 transition-all"
              >
                <div
                  className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => playTrack(track)}
                >
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                    <Image
                      src={track.artworkUrl}
                      alt={track.title}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-inisai-muted truncate">
                      {track.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  <span className="text-[11px] font-mono text-inisai-muted mr-1">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    onClick={() => {
                      addToQueue(track);
                      setRecommended((prev) => prev.filter((r) => r.id !== track.id));
                    }}
                    className="p-1 rounded text-white/50 hover:text-inisai-accent hover:bg-white/10"
                    title="Add to queue"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
