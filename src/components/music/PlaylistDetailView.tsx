"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Track, PlaybackContext } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { CoverImage } from "@/components/ui/CoverImage";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { usePlayerStore } from "@/stores/player-store";
import { usePlaylistStore } from "@/stores/playlist-store";
import { useAuthStore } from "@/stores/auth-store";
import { INISAI_OFFICIAL_COLLECTIONS } from "@/music/collections";
import { formatTotalDuration } from "@/lib/music-matching";
import {
  Play,
  Shuffle,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ListMusic,
  Trash2,
  Edit2,
  Check,
  X,
  Radio,
} from "lucide-react";

interface PlaylistViewData {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  artworkUrl?: string;
  collageArtworks?: string[];
  gradient?: string;
  tracks: Track[];
  isUserPlaylist?: boolean;
}

interface PlaylistDetailViewProps {
  id: string;
  type: "collection" | "mix" | "playlist";
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ id, type }) => {
  const router = useRouter();
  const { playTrack, setToastMessage } = usePlayerStore();
  const { getPlaylistById, removeTrackFromPlaylist, renamePlaylist, deletePlaylist } =
    usePlaylistStore();
  const { user } = useAuthStore();

  const [data, setData] = useState<PlaylistViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Edit playlist title state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  // Total duration calculation
  const totalDuration = useMemo(() => {
    return (data?.tracks || []).reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [data?.tracks]);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    // 1. Check if this is a custom user playlist from playlistStore
    const userPl = getPlaylistById(id);
    if (userPl) {
      setData({
        id: userPl.id,
        title: userPl.name,
        subtitle: userPl.description || "Custom user playlist",
        author: user?.displayName || "You",
        artworkUrl: userPl.artworkUrl || userPl.tracks[0]?.artworkUrl || "",
        collageArtworks: userPl.tracks.slice(0, 4).map((t) => t.artworkUrl).filter(Boolean),
        tracks: userPl.tracks || [],
        isUserPlaylist: true,
      });
      setIsLoading(false);
      return;
    }

    // 2. Check if this is a Daily Mix
    if (type === "mix" || id.startsWith("daily-mix-") || id.includes("breeze") || id.includes("velvet") || id.includes("focus")) {
      // Resolve daily mix deterministically
      Promise.all([
        import("@/lib/recommendations/recommendation-engine"),
        import("@/lib/recommendations/user-music-profile"),
        import("@/music/curated-data")
      ]).then(([{ buildDailyMixes }, { buildUserMusicProfile }, { CURATED_TRACKS }]) => {
        const affinity = buildUserMusicProfile(null, [], []);
        if (id.includes("breeze") || id === "daily-mix-3") {
          affinity.timeBucket = "morning";
        }
        const mixes = buildDailyMixes(CURATED_TRACKS, affinity, []);
          const targetMix = mixes.find((m) => m.id === id) || mixes[0];
          if (targetMix) {
            setData({
              id: targetMix.id,
              title: targetMix.title,
              subtitle: targetMix.subtitle,
              author: "InIsai Personalized Mix",
              gradient: targetMix.gradient,
              artworkUrl: targetMix.artworkUrl,
              collageArtworks: targetMix.collageArtworks,
              tracks: targetMix.tracks,
            });
          } else {
            setError("Daily Mix not found or resolving.");
          }
          setIsLoading(false);
        })
        .catch((e) => {
          setError(e.message || "Failed to load mix");
          setIsLoading(false);
        });
      return;
    }

    // 3. Official Collection or YouTube Playlist
    const isOfficialCollection =
      type === "collection" || INISAI_OFFICIAL_COLLECTIONS.some((c) => c.id === id);
    const endpoint = isOfficialCollection
      ? `/api/yt/collections?id=${encodeURIComponent(id)}`
      : `/api/yt/playlist?id=${encodeURIComponent(id)}`;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to resolve`);
        return res.json();
      })
      .then((resData) => {
        if (resData.tracks) {
          setData({
            id: resData.id || id,
            title: resData.title || resData.name || "Collection",
            subtitle: resData.subtitle || resData.description || resData.author || "Curated collection",
            author: resData.author || "InIsai Music",
            artworkUrl: resData.artworkUrl || (resData.tracks[0]?.artworkUrl ?? ""),
            collageArtworks:
              resData.collageArtworks ||
              resData.tracks.slice(0, 4).map((t: Track) => t.artworkUrl).filter(Boolean),
            gradient: resData.gradient,
            tracks: resData.tracks || [],
          });
        } else {
          setError("No tracks found in this playlist.");
        }
      })
      .catch((err) => {
        setError(err.message || "Could not load playlist tracks.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, type, retryCount, getPlaylistById, user]);

  const handlePlayInOrder = () => {
    if (!data?.tracks || data.tracks.length === 0) return;
    const context: PlaybackContext = {
      id: `${type}-${data.id}`,
      type: "playlist",
      title: data.title,
      trackIds: data.tracks.map((t) => t.id),
    };
    playTrack(data.tracks[0], data.tracks, context);
  };

  const handleShufflePlay = () => {
    if (!data?.tracks || data.tracks.length === 0) return;
    const shuffled = [...data.tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const context: PlaybackContext = {
      id: `${type}-${data.id}-shuffled`,
      type: "playlist",
      title: `${data.title} (Shuffled)`,
      trackIds: shuffled.map((t) => t.id),
    };
    playTrack(shuffled[0], shuffled, context);
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!data?.isUserPlaylist) return;
    await removeTrackFromPlaylist(data.id, trackId);
    setData((prev) => {
      if (!prev) return null;
      const updated = prev.tracks.filter((t) => t.id !== trackId);
      return { ...prev, tracks: updated };
    });
    setToastMessage("Track removed from playlist");
  };

  const handleSaveRename = async () => {
    if (!data?.isUserPlaylist || !editName.trim()) return;
    await renamePlaylist(data.id, editName.trim());
    setData((prev) => (prev ? { ...prev, title: editName.trim() } : null));
    setIsEditing(false);
    setToastMessage("Playlist renamed");
  };

  const handleDelete = async () => {
    if (!data?.isUserPlaylist) return;
    if (confirm(`Are you sure you want to delete "${data.title}"?`)) {
      await deletePlaylist(data.id);
      setToastMessage("Playlist deleted");
      router.push("/playlists");
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <BackNavigation fallbackUrl="/" />
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 animate-pulse">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-slate-200 dark:bg-white/10 flex-shrink-0" />
          <div className="space-y-3 flex-1 w-full text-center sm:text-left">
            <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded mx-auto sm:mx-0" />
            <div className="h-8 w-64 bg-slate-200 dark:bg-white/15 rounded mx-auto sm:mx-0" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-white/10 rounded mx-auto sm:mx-0" />
          </div>
        </div>

        <div className="space-y-2 pt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-200/60 dark:bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error || !data) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <BackNavigation fallbackUrl="/explore" />
        <div className="py-20 p-8 rounded-3xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {error || "Playlist not found"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-inisai-muted max-w-sm mx-auto">
            We couldn&apos;t load the tracks for this collection. Check your internet connection or retry below.
          </p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-inisai-accent text-white font-bold text-xs shadow-lg shadow-inisai-accent/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const playbackContext: PlaybackContext = {
    id: `${type}-${data.id}`,
    type: "playlist",
    title: data.title,
    trackIds: data.tracks.map((t) => t.id),
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <BackNavigation fallbackUrl="/explore" />

      {/* Hero Header */}
      <div
        className={`relative flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl backdrop-blur-xl ${
          data.gradient
            ? `bg-gradient-to-r ${data.gradient}`
            : "bg-white/80 dark:bg-white/[0.04]"
        }`}
      >
        {/* Cover with 2x2 mosaic support */}
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 bg-slate-200 dark:bg-black/50 border border-white/20">
          <CoverImage
            src={data.artworkUrl}
            alt={data.title}
            fallbackTracks={data.tracks}
            type="playlist"
            aspect="square"
          />
        </div>

        {/* Metadata */}
        <div className="space-y-2.5 text-center sm:text-left flex-1 min-w-0">
          <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold uppercase tracking-widest text-inisai-accent bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
            {type === "mix" ? (
              <Radio className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {type === "mix"
                ? "Daily Mix"
                : data.isUserPlaylist
                ? "Custom Playlist"
                : "Official Collection"}
            </span>
          </span>

          {isEditing ? (
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                className="px-3 py-1.5 rounded-xl bg-white/20 text-white font-bold text-xl sm:text-2xl border border-white/30 outline-none"
              />
              <button
                onClick={handleSaveRename}
                className="p-2 rounded-xl bg-inisai-accent text-white"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-xl bg-white/10 text-white"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center sm:justify-start space-x-3">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight drop-shadow">
                {data.title}
              </h1>
              {data.isUserPlaylist && (
                <button
                  onClick={() => {
                    setEditName(data.title);
                    setIsEditing(true);
                  }}
                  className="p-1.5 rounded-full hover:bg-black/20 text-white/70 hover:text-white transition-colors"
                  title="Rename playlist"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl drop-shadow-sm">
            {data.subtitle || data.author}
          </p>

          <p className="text-xs text-slate-500 dark:text-white/60 font-medium">
            {data.tracks.length} {data.tracks.length === 1 ? "track" : "tracks"} • {formatTotalDuration(totalDuration)}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
            <button
              onClick={handlePlayInOrder}
              disabled={data.tracks.length === 0}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-inisai-accent text-white text-xs sm:text-sm font-bold shadow-xl shadow-inisai-accent/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play All</span>
            </button>

            <button
              onClick={handleShufflePlay}
              disabled={data.tracks.length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-slate-900 dark:text-white text-xs sm:text-sm font-bold border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>

            {data.isUserPlaylist && (
              <button
                onClick={handleDelete}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors cursor-pointer"
                title="Delete playlist"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-inisai-muted">
            Track List
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {data.tracks.length} songs
          </span>
        </div>

        {data.tracks.length > 0 ? (
          <div className="space-y-1.5">
            {data.tracks.map((track, idx) => (
              <TrackRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                playlistContext={data.tracks}
                context={playbackContext}
                onRemove={data.isUserPlaylist ? () => handleRemoveTrack(track.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-inisai-muted space-y-2 rounded-2xl bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            <ListMusic className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              This playlist has no songs yet.
            </p>
            <p className="text-xs max-w-xs mx-auto">
              Find songs via Search or Explore, tap ⋯ and choose &ldquo;Add to Playlist&rdquo;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
