"use client";

import React, { useState, useEffect, useRef } from "react";
import { Track } from "@/types";
import { musicSourceManager } from "@/music/adapters/MusicSourceManager";
import { TrackRow } from "@/components/music/TrackRow";
import { usePlayerStore } from "@/stores/player-store";
import {
  Disc3,
  Upload,
  HardDrive,
  Trash2,
  Play,
  Shuffle,
  AlertCircle,
  FileAudio,
} from "lucide-react";

export default function LocalMusicPage() {
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortKey, setSortKey] = useState<"title" | "artist" | "duration">("title");
  const [filterQuery, setFilterQuery] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const { playTrack } = usePlayerStore();
  const localAdapter = musicSourceManager.getLocalAdapter();

  const loadTracks = async () => {
    setIsLoading(true);
    try {
      const tracks = await localAdapter.getStoredTracks();
      setLocalTracks(tracks);
    } catch (e) {
      console.error("Failed to load local tracks:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTracks();
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)) {
        continue;
      }

      // Estimate duration using temporary Audio object
      const tempUrl = URL.createObjectURL(file);
      const audio = new Audio();
      audio.src = tempUrl;

      const duration: number = await new Promise((resolve) => {
        audio.addEventListener("loadedmetadata", () => {
          resolve(audio.duration || 180);
        });
        audio.addEventListener("error", () => {
          resolve(180);
        });
      });
      URL.revokeObjectURL(tempUrl);

      // Clean title from filename
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/^[0-9\s-_.]+/, "");

      const track: Track = {
        id: `local-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        title: cleanTitle || file.name,
        artist: "Local Device Artist",
        album: "Local Storage",
        duration: Math.round(duration),
        artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
        streamUrl: "",
        sourceType: "local",
        sourceId: file.name,
        isPlayable: true,
        addedAt: new Date().toISOString(),
      };

      await localAdapter.saveTrack(track, file);
    }

    await loadTracks();
    setIsProcessing(false);
  };

  const handleDelete = async (trackId: string) => {
    await localAdapter.deleteTrack(trackId);
    await loadTracks();
  };

  const sortedTracks = [...localTracks]
    .filter(
      (t) =>
        t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(filterQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === "title") return a.title.localeCompare(b.title);
      if (sortKey === "artist") return a.artist.localeCompare(b.artist);
      return b.duration - a.duration;
    });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Disc3 className="w-8 h-8 text-inisai-teal" />
            <span>Local Music (சாதன இசைப் பாடல்கள்)</span>
          </h1>
          <p className="text-xs sm:text-sm text-inisai-muted mt-1">
            Play MP3, WAV, FLAC, and M4A audio files directly from your device. Never uploaded to remote servers.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            {...({ webkitdirectory: "", directory: "" } as any)}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-inisai-teal text-black font-bold text-xs shadow-lg shadow-inisai-teal/20 hover:opacity-90 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Choose Audio Files</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={isProcessing}
            className="hidden sm:flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
          >
            <HardDrive className="w-4 h-4 text-inisai-accent" />
            <span>Select Folder</span>
          </button>
        </div>
      </div>

      {/* Privacy & Storage Guarantee Banner */}
      <div className="flex items-start space-x-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-inisai-muted">
        <AlertCircle className="w-5 h-5 text-inisai-teal flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white/90">Browser Sandboxed & 100% Private</p>
          <p>
            Your audio files are persisted safely inside your browser&apos;s origin-isolated IndexedDB on this device. They are not uploaded to Supabase or any external cloud server, keeping your data confidential and your bandwidth free.
          </p>
        </div>
      </div>

      {/* Controls: Filter, Sort, Play All */}
      {localTracks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => playTrack(sortedTracks[0], sortedTracks)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:scale-105 active:scale-95 transition-transform"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Play All</span>
            </button>

            <span className="text-xs text-inisai-muted">
              {localTracks.length} tracks on device
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Filter local songs..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/40 outline-none focus:border-inisai-teal w-44"
            />

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="px-2 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white outline-none cursor-pointer"
            >
              <option value="title">Sort: Title</option>
              <option value="artist">Sort: Artist</option>
              <option value="duration">Sort: Duration</option>
            </select>
          </div>
        </div>
      )}

      {/* Track List or Empty Dropzone */}
      {isProcessing ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-inisai-teal border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-semibold text-white">Extracting audio metadata and saving to IndexedDB...</p>
        </div>
      ) : localTracks.length > 0 ? (
        <div className="space-y-2">
          {sortedTracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              playlistContext={sortedTracks}
              onRemove={() => handleDelete(track.id)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-inisai-teal/50 rounded-3xl p-12 text-center cursor-pointer transition-colors space-y-4 bg-white/[0.01]"
        >
          <div className="w-16 h-16 rounded-2xl bg-inisai-teal/10 flex items-center justify-center mx-auto text-inisai-teal">
            <FileAudio className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-white">No local music loaded yet</h3>
            <p className="text-xs text-inisai-muted max-w-sm mx-auto">
              Click here or drag audio files into this window to load your personal music library.
            </p>
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors">
            Browse Audio Files
          </button>
        </div>
      )}
    </div>
  );
}
