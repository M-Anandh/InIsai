"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAddToPlaylistStore } from "@/stores/add-to-playlist-store";
import { usePlaylistStore } from "@/stores/playlist-store";
import { usePlayerStore } from "@/stores/player-store";
import { CoverImage } from "@/components/ui/CoverImage";
import {
  ListPlus,
  Plus,
  Check,
  X,
  Music,
  FolderPlus,
  Lock,
} from "lucide-react";

export const GlobalAddToPlaylistModal: React.FC = () => {
  const { isOpen, track, close } = useAddToPlaylistStore();
  const { playlists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } =
    usePlaylistStore();
  const { setToastMessage } = usePlayerStore();

  const [mounted, setMounted] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showNewInput) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showNewInput]);

  useEffect(() => {
    if (!isOpen) {
      setShowNewInput(false);
      setNewPlaylistName("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  if (!mounted || !isOpen || !track || typeof document === "undefined" || !document.body) return null;

  const handleToggle = async (playlistId: string, playlistName: string, alreadyIn: boolean) => {
    if (alreadyIn) {
      await removeTrackFromPlaylist(playlistId, track.id);
      setToastMessage(`Removed from "${playlistName}"`);
    } else {
      const added = await addTrackToPlaylist(playlistId, track);
      if (added) {
        setToastMessage(`Added "${track.title}" to ${playlistName}`);
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;

    setIsCreating(true);
    try {
      const created = await createPlaylist(name, "", [track]);
      setToastMessage(`Created "${created.name}" and added "${track.title}"`);
      setNewPlaylistName("");
      setShowNewInput(false);
    } finally {
      setIsCreating(false);
    }
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          close();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-[#15121F] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 text-slate-900 dark:text-white shadow-2xl space-y-4 max-h-[85vh] sm:max-h-[80vh] flex flex-col animate-slideUp sm:animate-scaleUp"
      >
        {/* Mobile Swipe / Drag indicator */}
        <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

        {/* Modal Header with Track Preview */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
              <CoverImage
                src={track.artworkUrl}
                alt={track.title}
                youtubeVideoId={track.youtubeVideoId}
                aspect="square"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-inisai-accent block">
                Add to playlist
              </span>
              <h3 className="text-sm font-bold truncate text-slate-900 dark:text-white">
                {track.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-inisai-muted truncate">
                {track.artist}
              </p>
            </div>
          </div>

          <button
            onClick={close}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create New Playlist Button / Inline Form */}
        {!showNewInput ? (
          <button
            onClick={() => setShowNewInput(true)}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-inisai-accent/10 hover:bg-inisai-accent/20 border border-inisai-accent/30 text-inisai-accent text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Playlist</span>
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-2 pt-1">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                maxLength={60}
                className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-inisai-muted/60 outline-none focus:border-inisai-accent"
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim() || isCreating}
                className="px-4 py-2.5 rounded-xl bg-inisai-accent text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewInput(false);
                  setNewPlaylistName("");
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Existing Playlists Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {playlists.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-inisai-muted space-y-2">
              <FolderPlus className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs">No playlists yet. Create your first one above!</p>
            </div>
          ) : (
            playlists.map((pl) => {
              const alreadyIn = pl.tracks.some((t) => t.id === track.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => handleToggle(pl.id, pl.name, alreadyIn)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                    alreadyIn
                      ? "bg-inisai-accent/15 border-inisai-accent/40 shadow-sm"
                      : "bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/5"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0 flex items-center justify-center">
                      {pl.artworkUrl ? (
                        <CoverImage
                          src={pl.artworkUrl}
                          alt={pl.name}
                          fallbackTracks={pl.tracks}
                          type="playlist"
                          aspect="square"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-inisai-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">
                        {pl.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-inisai-muted">
                        {pl.tracks.length} {pl.tracks.length === 1 ? "song" : "songs"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border transition-all ${
                      alreadyIn
                        ? "bg-inisai-accent border-inisai-accent text-white shadow-sm"
                        : "border-slate-300 dark:border-white/20 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 text-center border-t border-slate-100 dark:border-white/5">
          <p className="text-[11px] text-slate-500 dark:text-inisai-muted">
            Tap a playlist to add or remove instantly
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
