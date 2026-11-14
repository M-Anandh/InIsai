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
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Library className="w-8 h-8 text-[#5B3DF5] dark:text-inisai-accent" />
            <span>Your Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-inisai-muted mt-1">
            Personal playlists, liked tracks, listening history, and local audio.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-inisai-accent hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-inisai-accent/20 transition-all cursor-pointer"
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
          className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-purple-50/50 dark:from-inisai-accent/30 dark:via-purple-900/20 dark:to-black/60 border border-purple-200/80 dark:border-inisai-accent/20 hover:border-inisai-accent/50 transition-all flex flex-col justify-between h-36 shadow-sm dark:shadow-none"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-inisai-accent flex items-center justify-center text-white shadow-lg shadow-inisai-accent/40">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <span className="text-xs font-mono text-[#5B3DF5] dark:text-inisai-accent font-bold">
              {likedCount} {likedCount === 1 ? "track" : "tracks"}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Liked Songs</h3>
            <p className="text-xs text-slate-600 dark:text-inisai-muted">Favorite tracks & melodies</p>
          </div>
        </Link>

        {/* Recently Played Tile */}
        <Link
          href="/history"
          className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-cyan-50/50 dark:from-inisai-teal/20 dark:via-cyan-950/20 dark:to-black/60 border border-cyan-200/80 dark:border-inisai-teal/20 hover:border-inisai-teal/50 transition-all flex flex-col justify-between h-36 shadow-sm dark:shadow-none"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-teal-500 dark:bg-inisai-teal flex items-center justify-center text-white dark:text-black shadow-lg shadow-teal-500/30">
              <History className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-[#0A6E86] dark:text-inisai-teal font-bold">
              {displayHistory.length} played
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Listening History</h3>
            <p className="text-xs text-slate-600 dark:text-inisai-muted">Recently played queue</p>
          </div>
        </Link>

        {/* Local Music Tile */}
        <Link
          href="/local"
          className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-500/20 dark:via-emerald-950/20 dark:to-black/60 border border-emerald-200/80 dark:border-emerald-500/20 hover:border-emerald-500/50 transition-all flex flex-col justify-between h-36 shadow-sm dark:shadow-none"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white dark:text-black shadow-lg shadow-emerald-500/40">
              <Disc3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-[#0B7A4B] dark:text-emerald-400 font-bold">
              Device Music
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Local Audio Files</h3>
            <p className="text-xs text-slate-600 dark:text-inisai-muted">Offline MP3 & FLAC on device</p>
          </div>
        </Link>
      </div>

      {/* User Playlists Section */}
      <section className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
          <ListMusic className="w-5 h-5 text-[#5B3DF5] dark:text-inisai-accent" />
          <span>Your Playlists</span>
        </h2>

        {displayPlaylists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayPlaylists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3">
            <p className="text-sm text-slate-600 dark:text-inisai-muted">You haven&apos;t created any custom playlists yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white text-xs font-semibold cursor-pointer"
            >
              Create Your First Playlist
            </button>
          </div>
        )}
      </section>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div
          data-surface="dark"
          className="surface-dark fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-[#1C1928] border border-white/15 rounded-2xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg">Create New Playlist</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Playlist name (e.g., Midnight Melodies)"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder-white/40 outline-none focus:border-inisai-accent"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-inisai-accent text-xs font-bold text-white shadow-lg shadow-inisai-accent/30 cursor-pointer"
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
