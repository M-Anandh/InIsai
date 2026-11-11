"use client";

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { Track } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { areTracksEquivalent } from "@/lib/music-matching";

export interface StoredLikedSong {
  trackId: string;
  track: Track;
  likedAt: number;
}

interface OfflineAction {
  action: "like" | "unlike";
  track: Track;
  timestamp: number;
}

interface LikesState {
  likedSongs: StoredLikedSong[];
  offlineQueue: OfflineAction[];
  isLoading: boolean;
  lastUndoneSong: StoredLikedSong | null;

  // Actions
  initialize: (userId?: string | null) => Promise<void>;
  isLiked: (trackOrId: Track | string) => boolean;
  getLikedCount: () => number;
  toggleLike: (track: Track, userToast?: (msg: string) => void) => Promise<boolean>;
  unlike: (trackId: string, userToast?: (msg: string) => void) => Promise<void>;
  undoUnlike: () => Promise<void>;
  mergeGuestLikesOnAuth: (userId: string) => Promise<void>;
  flushOfflineQueue: (userId?: string | null) => Promise<void>;
  clearAllLikes: () => Promise<void>;
}

const IDB_LIKES_KEY = "inisai_liked_songs_v2";
const IDB_OFFLINE_QUEUE_KEY = "inisai_likes_offline_queue";

export const useLikesStore = create<LikesState>((set, get) => ({
  likedSongs: [],
  offlineQueue: [],
  isLoading: false,
  lastUndoneSong: null,

  initialize: async (userId) => {
    set({ isLoading: true });

    // 1. Load from IndexedDB first for instant rendering
    let localLikes: StoredLikedSong[] = [];
    let queue: OfflineAction[] = [];
    try {
      const stored = await idbGet<StoredLikedSong[]>(IDB_LIKES_KEY);
      if (Array.isArray(stored)) {
        localLikes = stored;
      }
      const storedQueue = await idbGet<OfflineAction[]>(IDB_OFFLINE_QUEUE_KEY);
      if (Array.isArray(storedQueue)) {
        queue = storedQueue;
      }
    } catch (e) {
      console.warn("Failed to load local likes from IndexedDB:", e);
    }

    set({ likedSongs: localLikes, offlineQueue: queue, isLoading: false });

    // 2. If authenticated and Supabase configured, sync with remote
    if (isSupabaseConfigured() && userId && userId !== "guest-user") {
      try {
        const { data: remoteRows, error } = await supabase
          .from("liked_songs")
          .select("track_id, track_data, liked_at")
          .eq("user_id", userId)
          .order("liked_at", { ascending: false });

        if (!error && Array.isArray(remoteRows)) {
          const remoteLikes: StoredLikedSong[] = remoteRows.map((row) => ({
            trackId: row.track_id,
            track: row.track_data || {
              id: row.track_id,
              title: "Unknown Track",
              artist: "Unknown Artist",
              duration: 0,
              artworkUrl: "",
              streamUrl: "",
              sourceType: "public",
              isPlayable: true,
            },
            likedAt: row.liked_at ? new Date(row.liked_at).getTime() : Date.now(),
          }));

          // Merge local and remote
          const mergedMap = new Map<string, StoredLikedSong>();
          for (const item of remoteLikes) {
            mergedMap.set(item.trackId, item);
          }
          for (const item of localLikes) {
            if (!mergedMap.has(item.trackId)) {
              mergedMap.set(item.trackId, item);
            }
          }
          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => b.likedAt - a.likedAt
          );

          set({ likedSongs: merged });
          await idbSet(IDB_LIKES_KEY, merged);
        }
      } catch (err) {
        console.warn("Remote likes fetch failed:", err);
      }
    }

    // Flush any pending offline queue if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      await get().flushOfflineQueue(userId);
    }
  },

  isLiked: (trackOrId: Track | string) => {
    const { likedSongs } = get();
    if (!trackOrId) return false;

    if (typeof trackOrId === "string") {
      return likedSongs.some((item) => item.trackId === trackOrId || item.track.id === trackOrId);
    }

    return likedSongs.some(
      (item) => item.trackId === trackOrId.id || areTracksEquivalent(item.track, trackOrId)
    );
  },

  getLikedCount: () => {
    return get().likedSongs.length;
  },

  toggleLike: async (track, userToast) => {
    const isCurrentlyLiked = get().isLiked(track);
    if (isCurrentlyLiked) {
      await get().unlike(track.id, userToast);
      return false;
    }

    const newLikedSong: StoredLikedSong = {
      trackId: track.id,
      track: { ...track },
      likedAt: Date.now(),
    };

    // Optimistic add to front
    const prevList = get().likedSongs;
    const updated = [newLikedSong, ...prevList.filter((item) => !areTracksEquivalent(item.track, track))];
    set({ likedSongs: updated, lastUndoneSong: null });

    // Save to IDB immediately
    idbSet(IDB_LIKES_KEY, updated).catch(() => {});

    // Personalization signal
    import("@/lib/personalization/signal-tracker").then(({ recordSignal }) => {
      recordSignal("like", track);
    }).catch(() => {});

    userToast?.(`Added "${track.title}" to Liked Songs`);

    // Handle offline / remote sync
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline) {
      const q = [...get().offlineQueue, { action: "like" as const, track, timestamp: Date.now() }];
      set({ offlineQueue: q });
      idbSet(IDB_OFFLINE_QUEUE_KEY, q).catch(() => {});
      return true;
    }

    // Remote sync if Supabase configured & authenticated
    if (isSupabaseConfigured()) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          const { error } = await supabase.from("liked_songs").upsert(
            {
              user_id: userId,
              track_id: track.id,
              track_data: track,
              liked_at: new Date(newLikedSong.likedAt).toISOString(),
            },
            { onConflict: "user_id,track_id" }
          );

          if (error) {
            console.warn("Supabase liked_songs upsert failed:", error);
            // Rollback optimistic update on server error
            set({ likedSongs: prevList });
            await idbSet(IDB_LIKES_KEY, prevList);
            userToast?.("Failed to save like to account. Please try again.");
            return false;
          }
        }
      } catch (err) {
        console.warn("Error syncing liked song:", err);
      }
    }

    return true;
  },

  unlike: async (trackId, userToast) => {
    const prevList = get().likedSongs;
    const target = prevList.find((item) => item.trackId === trackId || item.track.id === trackId);
    if (!target) return;

    const updated = prevList.filter((item) => item.trackId !== trackId && item.track.id !== trackId);
    set({ likedSongs: updated, lastUndoneSong: target });
    idbSet(IDB_LIKES_KEY, updated).catch(() => {});

    userToast?.(`Removed "${target.track.title}" from Liked Songs`);

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline) {
      const q = [...get().offlineQueue, { action: "unlike" as const, track: target.track, timestamp: Date.now() }];
      set({ offlineQueue: q });
      idbSet(IDB_OFFLINE_QUEUE_KEY, q).catch(() => {});
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          const { error } = await supabase
            .from("liked_songs")
            .delete()
            .eq("user_id", userId)
            .eq("track_id", trackId);

          if (error) {
            // Fallback: rollback optimistic
            set({ likedSongs: prevList });
            await idbSet(IDB_LIKES_KEY, prevList);
            userToast?.("Failed to remove like from account. Please try again.");
          }
        }
      } catch (err) {
        console.warn("Error deleting liked song remotely:", err);
      }
    }
  },

  undoUnlike: async () => {
    const { lastUndoneSong, likedSongs } = get();
    if (!lastUndoneSong) return;

    const updated = [lastUndoneSong, ...likedSongs];
    set({ likedSongs: updated, lastUndoneSong: null });
    await idbSet(IDB_LIKES_KEY, updated);

    if (isSupabaseConfigured()) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          await supabase.from("liked_songs").upsert(
            {
              user_id: userId,
              track_id: lastUndoneSong.track.id,
              track_data: lastUndoneSong.track,
              liked_at: new Date(lastUndoneSong.likedAt).toISOString(),
            },
            { onConflict: "user_id,track_id" }
          );
        }
      } catch {}
    }
  },

  mergeGuestLikesOnAuth: async (userId: string) => {
    if (!userId || userId === "guest-user" || !isSupabaseConfigured()) return;

    try {
      const localLikes = await idbGet<StoredLikedSong[]>(IDB_LIKES_KEY) || [];
      if (localLikes.length === 0) return;

      // Upsert local likes into Supabase
      const payload = localLikes.map((item) => ({
        user_id: userId,
        track_id: item.track.id,
        track_data: item.track,
        liked_at: new Date(item.likedAt).toISOString(),
      }));

      await supabase
        .from("liked_songs")
        .upsert(payload, { onConflict: "user_id,track_id" });

      // Refresh state
      await get().initialize(userId);
    } catch (err) {
      console.warn("Failed merging guest likes into account:", err);
    }
  },

  flushOfflineQueue: async (userId) => {
    const queue = get().offlineQueue;
    if (queue.length === 0) return;

    if (!isSupabaseConfigured() || !userId || userId === "guest-user") {
      set({ offlineQueue: [] });
      await idbSet(IDB_OFFLINE_QUEUE_KEY, []);
      return;
    }

    const remaining: OfflineAction[] = [];
    for (const item of queue) {
      try {
        if (item.action === "like") {
          await supabase.from("liked_songs").upsert(
            {
              user_id: userId,
              track_id: item.track.id,
              track_data: item.track,
              liked_at: new Date(item.timestamp).toISOString(),
            },
            { onConflict: "user_id,track_id" }
          );
        } else {
          await supabase
            .from("liked_songs")
            .delete()
            .eq("user_id", userId)
            .eq("track_id", item.track.id);
        }
      } catch {
        remaining.push(item);
      }
    }

    set({ offlineQueue: remaining });
    await idbSet(IDB_OFFLINE_QUEUE_KEY, remaining);
  },

  clearAllLikes: async () => {
    set({ likedSongs: [], offlineQueue: [], lastUndoneSong: null });
    await idbSet(IDB_LIKES_KEY, []);
    await idbSet(IDB_OFFLINE_QUEUE_KEY, []);
  },
}));

