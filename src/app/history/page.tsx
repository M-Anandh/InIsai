"use client";

import React from "react";
import { usePlayerStore } from "@/stores/player-store";
import { TrackRow } from "@/components/music/TrackRow";
import { History, Play } from "lucide-react";

export default function HistoryPage() {
  const { history, playTrack } = usePlayerStore();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-inisai-teal/20 text-inisai-teal flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Recently Played (அண்மையில் கேட்டவை)
            </h1>
            <p className="text-xs text-inisai-muted">
              {history.length} songs in playback memory
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => playTrack(history[0], history)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:scale-105 active:scale-95 transition-transform"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Play History</span>
          </button>
        )}
      </div>

      {history.length > 0 ? (
        <div className="space-y-2">
          {history.map((track, idx) => (
            <TrackRow
              key={`${track.id}-${idx}`}
              track={track}
              index={idx}
              playlistContext={history}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-inisai-muted space-y-2">
          <History className="w-12 h-12 mx-auto opacity-30 text-inisai-teal" />
          <h3 className="font-bold text-white text-base">No listening history yet</h3>
          <p className="text-xs max-w-xs mx-auto">
            Your recently listened tracks will be automatically recorded here.
          </p>
        </div>
      )}
    </div>
  );
}
