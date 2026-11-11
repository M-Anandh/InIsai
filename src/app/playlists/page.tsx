"use client";

import React, { useState } from "react";
import { usePlaylistStore } from "@/stores/playlist-store";
import { useMounted } from "@/hooks/use-mounted";
import { INISAI_OFFICIAL_COLLECTIONS } from "@/music/collections";
import { CURATED_TRACKS, FEATURED_PLAYLISTS } from "@/music/curated-data";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { ListMusic, Plus, Trash2 } from "lucide-react";

export default function PlaylistsPage() {
  const { playlists, createPlaylist, deletePlaylist } = usePlaylistStore();
  const mounted = useMounted();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const displayUserPlaylists = mounted ? playlists : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createPlaylist(name.trim(), description.trim());
    setName("");
    setDescription("");
    setShowModal(false);
  };

  const featured = FEATURED_PLAYLISTS.map((pl) => ({
    ...pl,
    tracks: CURATED_TRACKS.filter((t) => pl.trackIds.includes(t.id)),
  }));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <BackNavigation fallbackUrl="/" />
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <ListMusic className="w-8 h-8 text-inisai-teal" />
            <span>Playlists</span>
          </h1>
          <p className="text-xs sm:text-sm text-inisai-muted mt-1">
            Curated and custom user-created music sets.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-inisai-teal text-black text-xs font-bold shadow-lg shadow-inisai-teal/20 hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Featured Playlists */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">InIsai Official Collections</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {INISAI_OFFICIAL_COLLECTIONS.map((col) => (
            <PlaylistCard
              key={col.id}
              playlist={{
                id: col.id,
                name: col.title,
                description: col.subtitle,
                artworkUrl: col.artworkUrl,
                tracks: [],
              }}
              href={`/collection/${encodeURIComponent(col.id)}`}
            />
          ))}
        </div>
      </section>

      {/* Custom User Playlists */}
      <section className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-white">Your Custom Playlists</h2>
        {displayUserPlaylists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayUserPlaylists.map((pl) => (
              <div key={pl.id} className="relative group">
                <PlaylistCard playlist={pl} />
                <button
                  onClick={() => deletePlaylist(pl.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/50 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Delete playlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <p className="text-xs text-inisai-muted">No custom playlists created yet.</p>
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-inisai-card border border-white/10 rounded-2xl p-6 max-w-sm w-full text-white space-y-4">
            <h3 className="font-bold text-lg">Create Playlist</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm text-white outline-none focus:border-inisai-teal"
              />
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm text-white outline-none focus:border-inisai-teal resize-none"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-inisai-teal text-xs font-bold text-black"
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

