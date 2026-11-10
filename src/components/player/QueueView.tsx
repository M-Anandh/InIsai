"use client";

import React, { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { CoverImage } from "@/components/ui/CoverImage";
import { formatDuration } from "@/lib/utils";
import { Play, Trash2, ArrowUp, ArrowDown, ListMusic, Plus, Sparkles, GripVertical } from "lucide-react";
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!currentTrack) return;
    let cancelled = false;

    const url = currentTrack.youtubeVideoId
      ? `/api/yt/related?videoId=${encodeURIComponent(currentTrack.youtubeVideoId)}`
      : `/api/music/recommend?id=${encodeURIComponent(currentTrack.sourceId || "")}&artist=${encodeURIComponent(
          currentTrack.artist || ""
        )}`;

    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.results) {
          const filtered = d.results.filter(
            (rt: Track) => !queue.some((q) => q.id === rt.id)
          );
          setRecommended(filtered.slice(0, 10));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentTrack, queue]);

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-4 py-2 overflow-y-auto scrollbar-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
        <div>
          <h3 className="font-semibold text-white text-base">Playing Queue</h3>
          <p className="text-xs text-white/50">{queue.length} songs • Drag or use arrows to reorder</p>
        </div>
        {queue.length > 0 && (
          <button
            onClick={() => clearQueue()}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1 rounded-lg bg-rose-500/10 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Queue List with Drag & Drop Reorder */}
      {queue.length > 0 ? (
        <div className="space-y-2 mb-6">
          {queue.map((track, idx) => {
            const isCurrent = idx === queueIndex || track.id === currentTrack?.id;
            return (
              <div
                key={`${track.id}-${idx}`}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== idx) {
                    reorderQueue(dragIndex, idx);
                  }
                  setDragIndex(null);
                }}
                className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                  isCurrent
                    ? "bg-inisai-accent/20 border border-inisai-accent/40 shadow-sm"
                    : "bg-white/5 border border-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                  <GripVertical className="w-4 h-4 text-white/30 cursor-grab flex-shrink-0" />

                  <div
                    className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => playTrack(track)}
                  >
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                      <CoverImage
                        src={track.artworkUrl}
                        alt={track.title}
                        youtubeVideoId={track.youtubeVideoId}
                        aspect="square"
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
                      <p className="text-xs text-white/50 truncate">
                        {track.artist}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  <span className="hidden xs:inline text-xs font-mono text-white/45 mr-1">
                    {formatDuration(track.duration)}
                  </span>

                  {idx > 0 && (
                    <button
                      onClick={() => reorderQueue(idx, idx - 1)}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {idx < queue.length - 1 && (
                    <button
                      onClick={() => reorderQueue(idx, idx + 1)}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => removeFromQueue(idx)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-white/10 cursor-pointer"
                    aria-label="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center text-white/50 mb-4">
          <ListMusic className="w-10 h-10 mb-2 stroke-1 opacity-50 text-inisai-accent" />
          <p className="text-white/80 font-medium text-sm">Queue is empty</p>
          <p className="text-xs text-white/50 mt-0.5">
            Play any song from Home or Search to begin.
          </p>
        </div>
      )}

      {/* Up Next Recommendations */}
      {recommended.length > 0 && (
        <div className="pt-3 border-t border-white/10 space-y-3 pb-8">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-inisai-teal flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Related Up Next</span>
            </h4>
            <button
              onClick={() => {
                recommended.forEach((rt) => addToQueue(rt));
                setRecommended([]);
              }}
              className="text-xs font-semibold text-inisai-accent hover:underline cursor-pointer"
            >
              Add All
            </button>
          </div>

          <div className="space-y-1.5">
            {recommended.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/5 transition-all"
              >
                <div
                  className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => playTrack(track)}
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                    <CoverImage
                      src={track.artworkUrl}
                      alt={track.title}
                      youtubeVideoId={track.youtubeVideoId}
                      aspect="square"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-white/50 truncate">
                      {track.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  <span className="text-[11px] font-mono text-white/45 mr-1">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    onClick={() => {
                      addToQueue(track);
                      setRecommended((prev) => prev.filter((r) => r.id !== track.id));
                    }}
                    className="p-2 rounded-lg text-white/60 hover:text-inisai-accent hover:bg-white/10 cursor-pointer"
                    aria-label="Add to queue"
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
