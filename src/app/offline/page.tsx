"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { HardDrive, CheckCircle2, WifiOff, Disc3, RefreshCw } from "lucide-react";
import { musicSourceManager } from "@/music/adapters/MusicSourceManager";
import { Track } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";

export default function OfflinePage() {
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    musicSourceManager.getLocalAdapter().getStoredTracks().then(setLocalTracks);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOnline ? "bg-inisai-emerald/20 text-inisai-emerald" : "bg-rose-500/20 text-rose-400"}`}>
              {isOnline ? <CheckCircle2 className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {isOnline ? "Network Connected" : "Offline Mode Active"}
              </h1>
              <p className="text-xs text-inisai-muted">
                {isOnline
                  ? "Streaming servers & PWA cache fully synced."
                  : "Playing from local device storage."}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold ${isOnline ? "bg-inisai-emerald/20 text-inisai-emerald" : "bg-rose-500/20 text-rose-400"}`}>
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div className="pt-2 border-t border-white/5 text-xs text-inisai-muted leading-relaxed">
          <p>
            <strong>Offline Architecture Note:</strong> In compliance with copyright and browser quota standards, commercial online streams are not bulk-cached offline. Personal audio files loaded via the Local Music feature are securely cached on your device using IndexedDB and remain 100% playable without an internet connection.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Disc3 className="w-5 h-5 text-inisai-teal" />
            <span>Available Offline Songs ({localTracks.length})</span>
          </h2>
          <Link
            href="/local"
            className="text-xs text-inisai-teal font-semibold hover:underline"
          >
            Manage Local Files
          </Link>
        </div>

        {localTracks.length > 0 ? (
          <div className="space-y-2">
            {localTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                playlistContext={localTracks}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-inisai-muted space-y-2 border border-dashed border-white/10 rounded-2xl p-6">
            <p className="text-sm text-white/80">No offline audio files loaded yet.</p>
            <Link
              href="/local"
              className="inline-block px-4 py-2 rounded-xl bg-inisai-teal text-black text-xs font-bold"
            >
              Add Songs From Device
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
