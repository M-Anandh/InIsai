"use client";

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { Track, Playlist } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface PlaylistState {
  playlists: Playlist[];
  isLoading: boolean;

  // Actions
  initialize: (userId?: string | null) => Promise<void>;
  getPlaylistById: (id: string) => Playlist | undefined;
  createPlaylist: (name: string, description?: string, initialTracks?: Track[]) => Promise<Playlist>;
  renamePlaylist: (id: string, newName: string, newDescription?: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<boolean>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  reorderTracksInPlaylist: (playlistId: string, startIndex: number, endIndex: number) => Promise<void>;
  mergeGuestPlaylistsOnAuth: (userId: string) => Promise<void>;
  clearAllPlaylists: () => Promise<void>;
}

const IDB_PLAYLISTS_KEY = "inisai_user_playlists_v2";

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  isLoading: false,

  initialize: async (userId) => {
    set({ isLoading: true });

    let localPlaylists: Playlist[] = [];
    try {
      const stored = await idbGet<Playlist[]>(IDB_PLAYLISTS_KEY);
      if (Array.isArray(stored)) {
        localPlaylists = stored;
      }
    } catch (e) {
      console.warn("Failed loading playlists from IndexedDB:", e);
    }

    set({ playlists: localPlaylists, isLoading: false });

    // Sync remote playlists if authenticated
    if (isSupabaseConfigured() && userId && userId !== "guest-user") {
      try {
        const { data: remoteRows, error } = await supabase
          .from("playlists")
          .select("id, name, description, artwork_url, tracks, created_at, updated_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(remoteRows)) {
          const remotePlaylists: Playlist[] = remoteRows.map((r) => ({
            id: r.id,
            userId,
            name: r.name,
            description: r.description || "",
            artworkUrl: r.artwork_url || "",
            tracks: Array.isArray(r.tracks) ? r.tracks : [],
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));

          // Merge local and remote
          const map = new Map<string, Playlist>();
          for (const pl of remotePlaylists) {
            map.set(pl.id, pl);
          }
          for (const pl of localPlaylists) {
            if (!map.has(pl.id)) {
              map.set(pl.id, pl);
            }
          }
          const merged = Array.from(map.values());
          set({ playlists: merged });
          await idbSet(IDB_PLAYLISTS_KEY, merged);
        }
      } catch (err) {
        console.warn("Failed fetching remote playlists:", err);
      }
    }
  },

  getPlaylistById: (id: string) => {
    return get().playlists.find((p) => p.id === id);
  },

  createPlaylist: async (name, description, initialTracks = []) => {
    const newId = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newPlaylist: Playlist = {
      id: newId,
      name: name.trim() || "My Playlist",
      description: description?.trim() || "",
      artworkUrl: initialTracks[0]?.artworkUrl || "",
      tracks: [...initialTracks],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newPlaylist, ...get().playlists];
    set({ playlists: updated });
    await idbSet(IDB_PLAYLISTS_KEY, updated);

    // Sync to Supabase if authenticated
    if (isSupabaseConfigured()) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          await supabase.from("playlists").upsert({
            id: newPlaylist.id,
            user_id: userId,
            name: newPlaylist.name,
            description: newPlaylist.description,
            artwork_url: newPlaylist.artworkUrl,
            tracks: newPlaylist.tracks,
            created_at: newPlaylist.createdAt,
            updated_at: newPlaylist.updatedAt,
          });
        }
      } catch (err) {
        console.warn("Failed to save playlist remotely:", err);
      }
    }

    return newPlaylist;
  },

  renamePlaylist: async (id, newName, newDescription) => {
    const updated = get().playlists.map((pl) => {
      if (pl.id !== id) return pl;
      return {
        ...pl,
        name: newName.trim(),
        description: newDescription !== undefined ? newDescription.trim() : pl.description,
        updatedAt: new Date().toISOString(),
      };
    });
    set({ playlists: updated });
    await idbSet(IDB_PLAYLISTS_KEY, updated);

    if (isSupabaseConfigured()) {
      try {
        const target = updated.find((p) => p.id === id);
        if (target) {
          await supabase
            .from("playlists")
            .update({
              name: target.name,
              description: target.description,
              updated_at: target.updatedAt,
            })
            .eq("id", id);
        }
      } catch {}
    }
  },

  deletePlaylist: async (id) => {
    const updated = get().playlists.filter((p) => p.id !== id);
    set({ playlists: updated });
    await idbSet(IDB_PLAYLISTS_KEY, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("playlists").delete().eq("id", id);
      } catch {}
    }
  },

  addTrackToPlaylist: async (playlistId, track) => {
    const currentList = get().playlists;
    const target = currentList.find((p) => p.id === playlistId);
    if (!target) return false;

    // Check duplicate
    if (target.tracks.some((t) => t.id === track.id)) {
      return false; // Already in playlist
    }

    const updatedTracks = [...target.tracks, track];
    const updated = currentList.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        tracks: updatedTracks,
        artworkUrl: pl.artworkUrl || track.artworkUrl,
        updatedAt: new Date().toISOString(),
      };
    });

    set({ playlists: updated });
    await idbSet(IDB_PLAYLISTS_KEY, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("playlists")
          .update({
            tracks: updatedTracks,
            artwork_url: target.artworkUrl || track.artworkUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", playlistId);
      } catch {}
    }

    return true;
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    const currentList = get().playlists;
    const target = currentList.find((p) => p.id === playlistId);
    if (!target) return;

    const updatedTracks = target.tracks.filter((t) => t.id !== trackId);
    const updated = currentList.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        tracks: updatedTracks,
        artworkUrl: updatedTracks[0]?.artworkUrl || "",
        updatedAt: new Date().toISOString(),
      };
    });

    set({ playlists: updated });
    await idbSet(IDB_PLAYLISTS_KEY, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("playlists")
          .update({
            tracks: updatedTracks,
            updated_at: new Date().toISOString(),
          })
          .eq("id", playlistId);
      } catch {}
    }
  },

  reorderTracksInPlaylist: async (playlistId, startIndex, endIndex) => {
    const currentList = get().playlists;
    const target = currentList.find((p) => p.id === playlistId);
    if (!target) return;

    const tracks = [...target.tracks];
    const [moved] = tracks.splice(startIndex, 1);
    tracks.splice(endIndex, 0, moved);

    const updated = currentList.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return { ...pl, tracks, updatedAt: new Date().toISOString() };
    });

    set({ playlists: updated });
    await idbSet(IDB_PLAYLISTS_KEY, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("playlists")
          .update({ tracks, updated_at: new Date().toISOString() })
          .eq("id", playlistId);
      } catch {}
    }
  },

  mergeGuestPlaylistsOnAuth: async (userId) => {
    if (!userId || userId === "guest-user" || !isSupabaseConfigured()) return;

    try {
      const local = (await idbGet<Playlist[]>(IDB_PLAYLISTS_KEY)) || [];
      if (local.length === 0) return;

      const payload = local.map((pl) => ({
        id: pl.id,
        user_id: userId,
        name: pl.name,
        description: pl.description || "",
        artwork_url: pl.artworkUrl || "",
        tracks: pl.tracks || [],
        created_at: pl.createdAt || new Date().toISOString(),
        updated_at: pl.updatedAt || new Date().toISOString(),
      }));

      await supabase.from("playlists").upsert(payload, { onConflict: "id" });
      await get().initialize(userId);
    } catch (err) {
      console.warn("Failed merging guest playlists into account:", err);
    }
  },

  clearAllPlaylists: async () => {
    set({ playlists: [] });
    await idbSet(IDB_PLAYLISTS_KEY, []);
  },
}));

