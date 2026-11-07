"use client";

import React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { usePlayerStore } from "@/stores/player-store";
import { CURATED_TRACKS } from "@/music/curated-data";
import { TrackRow } from "@/components/music/TrackRow";
import { Heart, Play } from "lucide-react";

export default function LikedSongsPage() {
  const { likedTrackIds } = useAuthStore();
  const { playTrack } = usePlayerStore();

  const likedTracks = CURATED_TRACKS.filter((t) => likedTrackIds.includes(t.id));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-black/60 border border-rose-500/20">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-rose-500 to-inisai-accent flex items-center justify-center text-white shadow-xl shadow-rose-500/30">
            <Heart className="w-8 h-8 sm:w-10 sm:h-10 fill-white" />
          </div>
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-bold">
              Playlist
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
              Liked Songs (விருப்பப் பாடல்கள்)
            </h1>
            <p className="text-xs sm:text-sm text-inisai-muted mt-1">
              {likedTracks.length} saved songs
            </p>
          </div>
        </div>

        {likedTracks.length > 0 && (
          <button
            onClick={() => playTrack(likedTracks[0], likedTracks)}
            className="flex items-center space-x-2 px-6 py-3 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-500/30 transition-transform hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Play Liked Songs</span>
          </button>
        )}
      </div>

      {likedTracks.length > 0 ? (
        <div className="space-y-2">
          {likedTracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              playlistContext={likedTracks}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-inisai-muted space-y-3">
          <Heart className="w-12 h-12 mx-auto text-rose-500/40" />
          <h3 className="text-lg font-bold text-white">No liked songs yet</h3>
          <p className="text-xs max-w-xs mx-auto">
            Tap the heart icon on any song while listening to add it to your personal favorites.
          </p>
        </div>
      )}
    </div>
  );
}
