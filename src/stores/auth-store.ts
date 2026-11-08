import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserProfile, Track, Playlist } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  likedTrackIds: string[];
  userPlaylists: Playlist[];
  
  initialize: () => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  
  // Liked tracks
  toggleLikeTrack: (track: Track) => Promise<void>;
  isLiked: (trackId: string) => boolean;

  // Playlists
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;

  // Security & Preferences
  changePassword: (newPassword: string) => Promise<{ error?: string }>;
  toggleTheme: (mode?: "dark" | "light" | "system" | any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      likedTrackIds: [],
      userPlaylists: [],

      initialize: async () => {
        const savedTheme = get().user?.theme || "dark";
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          if (savedTheme === "light") {
            root.classList.add("light");
            root.classList.remove("dark");
          } else {
            root.classList.add("dark");
            root.classList.remove("light");
          }
        }

        if (!isSupabaseConfigured()) {
          // If no Supabase, retain guest user profile if exists
          if (!get().user) {
            set({
              user: {
                id: "guest-user",
                displayName: "InIsai Listener",
                preferredLanguage: "Tamil",
                theme: "dark",
              },
            });
          }
          return;
        }

        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const authUser = data.session.user;
            set({
              isAuthenticated: true,
              user: {
                id: authUser.id,
                email: authUser.email,
                displayName: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
                avatarUrl: authUser.user_metadata?.avatar_url,
              },
            });
            // Fetch remote liked tracks & playlists
            const { data: likedData } = await supabase
              .from("liked_tracks")
              .select("track_id")
              .eq("user_id", authUser.id);
            if (likedData) {
              set({ likedTrackIds: likedData.map((d: any) => d.track_id) });
            }
          }
        } catch (err) {
          console.warn("Supabase auth check error:", err);
        }
      },

      signUp: async (email, password, name) => {
        if (!isSupabaseConfigured()) {
          // Local guest mode
          const localUser: UserProfile = {
            id: `guest-${Date.now()}`,
            email,
            displayName: name,
            preferredLanguage: "Tamil",
            theme: "dark",
          };
          set({ user: localUser, isAuthenticated: true });
          return {};
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: name },
            },
          });
          if (error) return { error: error.message };

          if (data.user) {
            set({
              user: {
                id: data.user.id,
                email: data.user.email,
                displayName: name,
              },
              isAuthenticated: true,
            });
          }
          return {};
        } catch (err: any) {
          return { error: err?.message || "Sign up failed" };
        }
      },

      signIn: async (email, password) => {
        if (!isSupabaseConfigured()) {
          const localUser: UserProfile = {
            id: `guest-${Date.now()}`,
            email,
            displayName: email.split("@")[0],
            preferredLanguage: "Tamil",
            theme: "dark",
          };
          set({ user: localUser, isAuthenticated: true });
          return {};
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) return { error: error.message };

          if (data.user) {
            set({
              user: {
                id: data.user.id,
                email: data.user.email,
                displayName:
                  data.user.user_metadata?.full_name ||
                  data.user.email?.split("@")[0] ||
                  "User",
                avatarUrl: data.user.user_metadata?.avatar_url,
              },
              isAuthenticated: true,
            });
          }
          return {};
        } catch (err: any) {
          return { error: err?.message || "Sign in failed" };
        }
      },

      signOut: async () => {
        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.signOut();
          } catch {}
        }
        set({
          user: {
            id: "guest-user",
            displayName: "InIsai Listener",
            preferredLanguage: "Tamil",
            theme: "dark",
          },
          isAuthenticated: false,
        });
      },

      updateProfile: async (updates) => {
        const current = get().user;
        if (!current) return;
        const updated = { ...current, ...updates };
        set({ user: updated });

        if (isSupabaseConfigured() && get().isAuthenticated) {
          try {
            await supabase
              .from("profiles")
              .update({
                display_name: updated.displayName,
                avatar_url: updated.avatarUrl,
                preferred_language: updated.preferredLanguage,
              })
              .eq("id", current.id);
          } catch {}
        }
      },

      toggleLikeTrack: async (track) => {
        const { likedTrackIds, user, isAuthenticated } = get();
        const isCurrentlyLiked = likedTrackIds.includes(track.id);
        const updated = isCurrentlyLiked
          ? likedTrackIds.filter((id) => id !== track.id)
          : [...likedTrackIds, track.id];

        set({ likedTrackIds: updated });

        if (isSupabaseConfigured() && isAuthenticated && user) {
          try {
            if (isCurrentlyLiked) {
              await supabase
                .from("liked_tracks")
                .delete()
                .eq("user_id", user.id)
                .eq("track_id", track.id);
            } else {
              // Ensure track exists in tracks table
              await supabase.from("tracks").upsert({
                id: track.id,
                title: track.title,
                artist: track.artist,
                album: track.album || "",
                duration: track.duration,
                artwork_url: track.artworkUrl,
                stream_url: track.streamUrl,
                source_type: track.sourceType,
                source_id: track.sourceId,
              });

              await supabase.from("liked_tracks").insert({
                user_id: user.id,
                track_id: track.id,
              });
            }
          } catch (e) {
            console.warn("Error syncing liked track:", e);
          }
        }
      },

      isLiked: (trackId) => {
        return get().likedTrackIds.includes(trackId);
      },

      createPlaylist: async (name, description) => {
        const newPlaylist: Playlist = {
          id: `playlist-${Date.now()}`,
          name,
          description: description || "",
          artworkUrl:
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
          tracks: [],
          createdAt: new Date().toISOString(),
        };

        set((s) => ({ userPlaylists: [newPlaylist, ...s.userPlaylists] }));
        return newPlaylist;
      },

      deletePlaylist: async (id) => {
        set((s) => ({
          userPlaylists: s.userPlaylists.filter((p) => p.id !== id),
        }));
      },

      addTrackToPlaylist: async (playlistId, track) => {
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) => {
            if (p.id !== playlistId) return p;
            if (p.tracks.some((t) => t.id === track.id)) return p;
            return { ...p, tracks: [...p.tracks, track] };
          }),
        }));
      },

      removeTrackFromPlaylist: async (playlistId, trackId) => {
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) => {
            if (p.id !== playlistId) return p;
            return {
              ...p,
              tracks: p.tracks.filter((t) => t.id !== trackId),
            };
          }),
        }));
      },

      toggleTheme: (mode) => {
        const currentTheme = get().user?.theme || "dark";
        const isValidMode = mode === "dark" || mode === "light" || mode === "system";
        const nextTheme: "dark" | "light" | "system" = isValidMode
          ? (mode as "dark" | "light" | "system")
          : currentTheme === "dark"
          ? "light"
          : "dark";

        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, theme: nextTheme } });
        }

        if (typeof document !== "undefined") {
          const root = document.documentElement;
          let effectiveTheme = nextTheme;
          if (nextTheme === "system") {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            effectiveTheme = prefersDark ? "dark" : "light";
          }

          if (effectiveTheme === "light") {
            root.classList.add("light");
            root.classList.remove("dark");
          } else {
            root.classList.add("dark");
            root.classList.remove("light");
          }
        }
      },

      changePassword: async (newPassword: string) => {
        if (!newPassword || newPassword.length < 6) {
          return { error: "Password must be at least 6 characters." };
        }
        if (isSupabaseConfigured() && get().isAuthenticated) {
          try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) return { error: error.message };
          } catch (err: any) {
            return { error: err.message || "Failed to update password." };
          }
        }
        return {};
      },
    }),
    {
      name: "inisai_auth_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        likedTrackIds: state.likedTrackIds,
        userPlaylists: state.userPlaylists,
      }),
    }
  )
);

