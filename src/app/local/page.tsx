"use client";

import React, { useState, useEffect, useRef } from "react";
import { Track, PlaybackContext } from "@/types";
import { musicSourceManager } from "@/music/adapters/MusicSourceManager";
import { TrackRow } from "@/components/music/TrackRow";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { usePlayerStore } from "@/stores/player-store";
import * as mm from "music-metadata-browser";
import {
  Disc3,
  Upload,
  HardDrive,
  Trash2,
  Play,
  AlertCircle,
  FileAudio,
  CheckCircle2,
  FolderOpen,
  ListPlus,
  RefreshCw,
} from "lucide-react";

export default function LocalMusicPage() {
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<{
    current: number;
    total: number;
    currentName: string;
  } | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"title" | "artist" | "duration">("title");
  const [filterQuery, setFilterQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const { playTrack, addToQueue } = usePlayerStore();
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

  const processAudioFiles = async (files: File[]) => {
    const validAudioFiles = files.filter((f) =>
      Boolean(
        f.type.startsWith("audio/") ||
        f.name.match(/\.(mp3|wav|ogg|flac|m4a|aac|opus|weba)$/i)
      )
    );

    if (validAudioFiles.length === 0) return;

    setIsProcessing(true);
    setImportSummary(null);

    const existing = await localAdapter.getStoredTracks();
    const existingFileNames = new Set(existing.map((t) => t.sourceId.toLowerCase()));
    const existingKeys = new Set(
      existing.map((t) => `${t.title.toLowerCase()}:::${t.artist.toLowerCase()}`)
    );

    let addedCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < validAudioFiles.length; i++) {
      const file = validAudioFiles[i];
      setProcessingStats({
        current: i + 1,
        total: validAudioFiles.length,
        currentName: file.name,
      });

      // Quick duplicate check by filename
      if (existingFileNames.has(file.name.toLowerCase())) {
        duplicateCount++;
        continue;
      }

      let title = "";
      let artist = "Local Device Artist";
      let album = "Local Storage";
      let duration = 180;
      let artworkUrl =
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

      // 1. Try ID3 tag extraction via music-metadata-browser
      try {
        const metadata = await mm.parseBlob(file);
        if (metadata.common.title) {
          title = metadata.common.title.trim();
        }
        if (metadata.common.artist) {
          artist = metadata.common.artist.trim();
        }
        if (metadata.common.album) {
          album = metadata.common.album.trim();
        }
        if (metadata.format.duration && metadata.format.duration > 0) {
          duration = Math.round(metadata.format.duration);
        }

        const cover = mm.selectCover(metadata.common.picture);
        if (cover) {
          const blob = new Blob([cover.data as any], { type: cover.format });
          artworkUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        // Fallback: estimate duration using temporary Audio object
        try {
          const tempUrl = URL.createObjectURL(file);
          const audio = new Audio();
          audio.src = tempUrl;
          const dur = await new Promise<number>((res) => {
            audio.addEventListener("loadedmetadata", () => res(audio.duration || 180));
            audio.addEventListener("error", () => res(180));
          });
          duration = Math.round(dur);
          URL.revokeObjectURL(tempUrl);
        } catch {}
      }

      // Title fallback from filename
      if (!title) {
        title = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/^[0-9\s-_.]+/, "")
          .trim() || file.name;
      }

      // Check duplicate by title+artist
      const songKey = `${title.toLowerCase()}:::${artist.toLowerCase()}`;
      if (existingKeys.has(songKey)) {
        duplicateCount++;
        continue;
      }

      const track: Track = {
        id: `local-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        artist,
        album,
        duration,
        artworkUrl,
        streamUrl: "",
        sourceType: "local",
        sourceId: file.name,
        isPlayable: true,
        addedAt: new Date().toISOString(),
      };

      await localAdapter.saveTrack(track, file);
      existingFileNames.add(file.name.toLowerCase());
      existingKeys.add(songKey);
      addedCount++;
    }

    await loadTracks();
    setIsProcessing(false);
    setProcessingStats(null);
    setImportSummary(
      `Import complete! Added ${addedCount} tracks${
        duplicateCount > 0 ? `, skipped ${duplicateCount} duplicates` : ""
      }.`
    );
    setTimeout(() => setImportSummary(null), 6000);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    processAudioFiles(Array.from(files));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const files: File[] = [];

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    } else if (e.dataTransfer.files) {
      files.push(...Array.from(e.dataTransfer.files));
    }

    if (files.length > 0) {
      await processAudioFiles(files);
    }
  };

  const handleDelete = async (trackId: string) => {
    await localAdapter.deleteTrack(trackId);
    await loadTracks();
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to remove all local tracks from InIsai? Your original files on disk will not be deleted.")) {
      for (const t of localTracks) {
        await localAdapter.deleteTrack(t.id);
      }
      await loadTracks();
    }
  };

  const handleAddAllToQueue = () => {
    for (const t of sortedTracks) {
      addToQueue(t);
    }
  };

  const localContext: PlaybackContext = {
    id: "local-music-library",
    type: "local",
    title: "Device Local Library",
    trackIds: localTracks.map((t) => t.id),
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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-8 max-w-5xl mx-auto min-h-[70vh]"
    >
      <BackNavigation fallbackUrl="/" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Disc3 className="w-8 h-8 text-inisai-teal" />
            <span>Local Music</span>
          </h1>
          <p className="text-xs sm:text-sm text-inisai-muted mt-1">
            Import folders or MP3/FLAC/WAV audio files directly from your phone or PC with automatic ID3 tag extraction.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus"
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
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-inisai-teal text-black font-bold text-xs shadow-lg shadow-inisai-teal/20 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Choose Files</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-inisai-accent" />
            <span>Select Folder</span>
          </button>

          {localTracks.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isProcessing}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
              title="Clear all local music"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Import Summary Toast */}
      {importSummary && (
        <div className="p-4 rounded-2xl bg-inisai-emerald/15 border border-inisai-emerald/30 text-xs font-semibold text-inisai-emerald flex items-center space-x-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{importSummary}</span>
        </div>
      )}

      {/* Drag & Drop Visual Indicator Banner */}
      {isDragging && (
        <div className="p-8 rounded-3xl border-2 border-dashed border-inisai-teal bg-inisai-teal/10 text-center animate-pulse">
          <Upload className="w-8 h-8 text-inisai-teal mx-auto mb-2" />
          <p className="text-sm font-bold text-white">Drop audio files or folders here to import</p>
        </div>
      )}

      {/* Privacy Guarantee Banner */}
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() => playTrack(sortedTracks[0], sortedTracks, localContext)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Play All</span>
            </button>

            <button
              onClick={handleAddAllToQueue}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
              title="Add all tracks to current queue"
            >
              <ListPlus className="w-3.5 h-3.5 text-inisai-teal" />
              <span>Queue All</span>
            </button>

            <span className="text-xs text-inisai-muted pl-2">
              {localTracks.length} tracks
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

      {/* Processing Indicator */}
      {isProcessing && processingStats && (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-inisai-teal border-t-transparent animate-spin mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">
              Importing Audio Files ({processingStats.current} / {processingStats.total})
            </p>
            <p className="text-xs text-inisai-muted font-mono truncate max-w-md mx-auto">
              Extracting ID3 tags: {processingStats.currentName}
            </p>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden max-w-md mx-auto">
            <div
              className="bg-inisai-teal h-full transition-all duration-300"
              style={{
                width: `${(processingStats.current / processingStats.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Track List or Empty Dropzone */}
      {localTracks.length > 0 ? (
        <div className="space-y-2">
          {sortedTracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              playlistContext={sortedTracks}
              context={localContext}
              onRemove={() => handleDelete(track.id)}
            />
          ))}
        </div>
      ) : !isProcessing ? (
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
              Drag and drop an entire folder or click here to choose MP3, FLAC, and WAV audio files.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors">
              Browse Files
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              className="px-5 py-2.5 rounded-xl bg-inisai-teal/20 text-inisai-teal border border-inisai-teal/30 font-semibold text-xs hover:bg-inisai-teal/30 transition-colors"
            >
              Select Folder
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
