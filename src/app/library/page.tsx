"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLikesStore } from "@/stores/likes-store";
import { usePlaylistStore } from "@/stores/playlist-store";
import { usePlayerStore } from "@/stores/player-store";
import { useMounted } from "@/hooks/use-mounted";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import {
  Library,
  Heart,
  History,
  Disc3,
  Plus,
  Play,
  ListMusic,
} from "lucide-react";

export default function LibraryPage() {
  const { getLikedCount } = useLikesStore();
  const { playlists, createPlaylist } = usePlaylistStore();
  const { history } = usePlayerStore();
  const mounted = useMounted();
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const likedCount = mounted ? getLikedCount() : 0;
  const displayHistory = mounted ? history : [];
  const displayPlaylists = mounted ? playlists : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName("");
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Library className="w-8 h-8 text-inisai-accent" />
            <span>Your Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-inisai-muted mt-1">
            Personal playlists, liked tracks, listening history, and local audio.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-inisai-accent hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-inisai-accent/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Liked Songs Tile */}
        <Link
          href="/liked"
          className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-inisai-accent/30 via-purple-900/20 to-black/60 border border-inisai-accent/20 hover:border-inisai-accent/50 transition-all flex flex-col justify-between h-36"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-inisai-accent flex items-center justify-center text-white shadow-lg shadow-inisai-accent/40">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <span className="text-xs font-mono text-inisai-accent font-semibold">
              {likedCount} {likedCount === 1 ? "track" : "tracks"}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Liked Songs</h3>
            <p className="text-xs text-inisai-muted">Favorite tracks & melodies</p>
          </div>
        </Link>

        {/* Recently Played Tile */}
        <Link
          href="/history"
          className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-inisai-teal/20 via-cyan-950/20 to-black/60 border border-inisai-teal/20 hover:border-inisai-teal/50 transition-all flex flex-col justify-between h-36"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-inisai-teal flex items-center justify-center text-black shadow-lg shadow-inisai-teal/40">
              <History className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-inisai-teal font-semibold">
              {displayHistory.length} played
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Listening History</h3>
            <p className="text-xs text-inisai-muted">Recently played queue</p>
          </div>
        </Link>

        {/* Local Music Tile */}
        <Link
          href="/local"
          className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-950/20 to-black/60 border border-emerald-500/20 hover:border-emerald-500/50 transition-all flex flex-col justify-between h-36"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/40">
              <Disc3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              Device Music
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Local Audio Files</h3>
            <p className="text-xs text-inisai-muted">Offline MP3 & FLAC on device</p>
          </div>
        </Link>
      </div>

      {/* User Playlists Section */}
      <section className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <ListMusic className="w-5 h-5 text-inisai-accent" />
          <span>Your Playlists</span>
        </h2>

        {displayPlaylists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayPlaylists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <p className="text-sm text-inisai-muted">You haven&apos;t created any custom playlists yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
            >
              Create Your First Playlist
            </button>
          </div>
        )}
      </section>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-inisai-card border border-white/10 rounded-2xl p-6 max-w-sm w-full text-white space-y-4">
            <h3 className="font-bold text-lg">Create New Playlist</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Playlist name (e.g., Midnight Melodies)"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-white/40 outline-none focus:border-inisai-accent"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-inisai-accent text-xs font-bold text-white shadow-lg shadow-inisai-accent/30"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
