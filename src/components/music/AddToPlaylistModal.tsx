"use client";

import React, { useState } from "react";
import { Track } from "@/types";
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
} from "lucide-react";

interface AddToPlaylistModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  track,
  isOpen,
  onClose,
}) => {
  const { playlists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } =
    usePlaylistStore();
  const { setToastMessage } = usePlayerStore();
  const [showNewInput, setShowNewInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen || !track) return null;

  const handleTogglePlaylist = async (playlistId: string, playlistName: string, alreadyIn: boolean) => {
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

  const handleCreateAndAdd = async (e: React.FormEvent) => {
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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-[#151320] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-white space-y-4 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center space-x-2.5">
            <ListPlus className="w-5 h-5 text-inisai-accent" />
            <h3 className="font-extrabold text-base sm:text-lg">Add to Playlist</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Track Pill */}
        <div className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
            <CoverImage
              src={track.artworkUrl}
              alt={track.title}
              youtubeVideoId={track.youtubeVideoId}
              type="track"
              aspect="square"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-white">
              {track.title}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-inisai-muted truncate">
              {track.artist}
            </p>
          </div>
        </div>

        {/* Inline Create Form or Button */}
        {showNewInput ? (
          <form onSubmit={handleCreateAndAdd} className="space-y-2 pt-1">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="New playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
                disabled={isCreating}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 outline-none focus:border-inisai-accent"
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim() || isCreating}
                className="px-4 py-2.5 rounded-xl bg-inisai-accent text-white text-xs font-bold shadow-md shadow-inisai-accent/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewInput(false)}
                className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewInput(true)}
            className="w-full flex items-center space-x-3 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 hover:border-inisai-accent/60 bg-slate-50 dark:bg-white/[0.02] text-inisai-accent font-semibold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-inisai-accent/15 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <span>New Playlist</span>
          </button>
        )}

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[140px] max-h-[320px]">
          {playlists.length > 0 ? (
            playlists.map((pl) => {
              const alreadyIn = pl.tracks.some((t) => t.id === track.id);
              return (
                <div
                  key={pl.id}
                  onClick={() => handleTogglePlaylist(pl.id, pl.name, alreadyIn)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    alreadyIn
                      ? "bg-inisai-accent/10 border-inisai-accent/30 text-slate-900 dark:text-white"
                      : "bg-slate-50 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-200 dark:bg-black/30 flex items-center justify-center flex-shrink-0">
                      {pl.artworkUrl ? (
                        <CoverImage
                          src={pl.artworkUrl}
                          alt={pl.name}
                          fallbackTracks={pl.tracks}
                          type="playlist"
                          aspect="square"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-slate-400 dark:text-inisai-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold truncate">
                        {pl.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-inisai-muted">
                        {pl.tracks.length} {pl.tracks.length === 1 ? "song" : "songs"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      alreadyIn
                        ? "bg-inisai-accent text-white"
                        : "border border-slate-300 dark:border-white/20 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-slate-400 dark:text-inisai-muted space-y-1">
              <FolderPlus className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">No playlists yet. Create one above to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
