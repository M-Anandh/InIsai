"use client";

import React from "react";
import { usePlayerStore } from "@/stores/player-store";
import { formatDuration } from "@/lib/utils";
import { Play, Trash2, ArrowUp, ArrowDown, ListMusic } from "lucide-react";
import Image from "next/image";

export const QueueView: React.FC = () => {
  const {
    queue,
    queueIndex,
    currentTrack,
    playTrack,
    removeFromQueue,
    clearQueue,
    reorderQueue,
  } = usePlayerStore();

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-inisai-muted">
        <ListMusic className="w-12 h-12 mb-3 stroke-1 opacity-50 text-inisai-accent" />
        <p className="text-white/80 font-medium">Queue is Empty</p>
        <p className="text-xs text-inisai-muted mt-1">
          Pick any song from Explore or Search to start listening.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-4 py-2">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
        <div>
          <h3 className="font-semibold text-white text-base">Up Next</h3>
          <p className="text-xs text-inisai-muted">{queue.length} songs in queue</p>
        </div>
        <button
          onClick={() => clearQueue()}
          className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded-lg bg-rose-500/10"
        >
          Clear Queue
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
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

                {/* Move Up */}
                {idx > 0 && (
                  <button
                    onClick={() => reorderQueue(idx, idx - 1)}
                    className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Move Down */}
                {idx < queue.length - 1 && (
                  <button
                    onClick={() => reorderQueue(idx, idx + 1)}
                    className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Remove */}
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
    </div>
  );
};

