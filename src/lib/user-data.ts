import { useLikesStore } from "@/stores/likes-store";
import { usePlaylistStore } from "@/stores/playlist-store";
import { usePlayerStore } from "@/stores/player-store";
import { getAllSignals, resetAllSignals } from "@/lib/personalization/signal-tracker";

export async function exportAllUserDataJson() {
  const likes = useLikesStore.getState().likedSongs;
  const playlists = usePlaylistStore.getState().playlists;
  const playerState = usePlayerStore.getState();
  const signals = await getAllSignals().catch(() => []);

  const data = {
    app: "InIsai (இனிசை)",
    tagline: "Every Beat, Your World.",
    version: "2.0",
    exportedAt: new Date().toISOString(),
    likedSongs: likes.map((l) => ({
      track: l.track,
      likedAt: l.likedAt,
    })),
    playlists: playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      tracks: p.tracks,
      createdAt: p.createdAt,
    })),
    history: playerState.history || [],
    signalsCount: signals.length,
    settings: playerState.settings,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inisai-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function purgeAllLocalUserData() {
  // 1. Reset Zustand Stores
  try {
    useLikesStore.setState({ likedSongs: [], isLoading: false });
    usePlaylistStore.setState({ playlists: [] });
    usePlayerStore.setState({ history: [], queue: [] });
  } catch (e) {
    console.warn("Store reset warning:", e);
  }

  // 2. Clear known localStorage & IndexedDB keys
  const keysToRemove = [
    "inisai_auth_storage",
    "inisai-auth-storage",
    "inisai_player_storage",
    "inisai_liked_songs_v2",
    "inisai_likes_offline_queue",
    "inisai_user_playlists_v2",
    "inisai_taste_signals_v1",
    "inisai_recent_searches",
    "inisai_listenbrainz_token",
    "inisai_local_tracks_catalog",
    "inisai_provider_prefs",
    "inisai_install_banner_dismissed",
    "inisai_install_banner_dismissed_at",
    "inisai_preferred_languages",
    "inisai_theme",
  ];

  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  // 3. Reset personalization signals & purge IndexedDB stores
  try {
    await resetAllSignals();
  } catch {}

  try {
    if (typeof indexedDB !== "undefined") {
      const knownDbs = [
        "inisai_signals_db",
        "inisai_likes_db",
        "inisai_taste_db",
        "inisai_offline_audio_db",
        "inisai_local_music_db",
      ];
      for (const dbName of knownDbs) {
        try {
          indexedDB.deleteDatabase(dbName);
        } catch {}
      }
    }
  } catch {}

  // 4. Clear Cache Storage
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch {}
}
