"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  Settings,
  Moon,
  Sliders,
  Shield,
  HardDrive,
  User,
  LogOut,
  Trash2,
  Check,
} from "lucide-react";

export default function SettingsPage() {
  const { settings, setCrossfade, setPlaybackRate, toggleEqualizer } =
    usePlayerStore();
  const { user, isAuthenticated, signOut, updateProfile } = useAuthStore();

  const [cacheCleared, setCacheCleared] = useState(false);

  const clearBrowserCache = async () => {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-white/5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
          <Settings className="w-8 h-8 text-inisai-accent" />
          <span>Settings (அமைப்புகள்)</span>
        </h1>
        <p className="text-xs sm:text-sm text-inisai-muted mt-1">
          Customize playback, equalizer preferences, account, and local storage.
        </p>
      </div>

      {/* Playback & Audio */}
      <section className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-inisai-accent" />
          <span>Playback & Audio FX</span>
        </h2>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <p className="font-semibold text-white">Equalizer Status</p>
              <p className="text-inisai-muted">5-Band Web Audio parametric filter</p>
            </div>
            <button
              onClick={() => toggleEqualizer()}
              className={`px-3 py-1.5 rounded-full font-bold transition-all ${
                settings.equalizerEnabled
                  ? "bg-inisai-accent text-white"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {settings.equalizerEnabled ? "Active" : "Bypassed"}
            </button>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <p className="font-semibold text-white">Crossfade Transition</p>
              <p className="text-inisai-muted">Smooth fade-out and fade-in duration</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={settings.crossfadeDuration}
                onChange={(e) => setCrossfade(Number(e.target.value))}
                className="w-24 accent-inisai-accent"
              />
              <span className="font-mono text-white w-6 text-right">
                {settings.crossfadeDuration}s
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Default Playback Rate</p>
              <p className="text-inisai-muted">Audio speed multiplier</p>
            </div>
            <select
              value={settings.playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="bg-black/50 border border-white/10 text-white px-2 py-1 rounded-xl text-xs outline-none cursor-pointer"
            >
              <option value="0.75">0.75x</option>
              <option value="1">1.0x (Normal)</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>
        </div>
      </section>

      {/* Account Section */}
      <section className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <User className="w-5 h-5 text-inisai-teal" />
          <span>Account & Identity</span>
        </h2>

        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-inisai-accent to-inisai-teal flex items-center justify-center font-bold text-white text-lg uppercase">
                {user.displayName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-sm text-white">{user.displayName}</p>
                <p className="text-xs text-inisai-muted">{user.email || "Local Guest Mode"}</p>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-xs text-inisai-muted">Not logged in. Using InIsai Guest Profile.</p>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-inisai-accent text-white text-xs font-bold"
            >
              Log In / Register
            </Link>
          </div>
        )}
      </section>

      {/* Storage & PWA Cache */}
      <section className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-inisai-emerald" />
          <span>Storage & Offline Caching</span>
        </h2>

        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="font-semibold text-white">PWA Service Worker Cache</p>
            <p className="text-inisai-muted">Clear cached UI shell and reload latest version</p>
          </div>
          <button
            onClick={clearBrowserCache}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
          >
            {cacheCleared ? (
              <>
                <Check className="w-3.5 h-3.5 text-inisai-emerald" />
                <span className="text-inisai-emerald">Cache Cleared</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear UI Cache</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Privacy, Legal & Free Tier Notes */}
      <section className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3 text-xs text-inisai-muted">
        <div className="flex items-center space-x-2 text-white font-semibold">
          <Shield className="w-4 h-4 text-inisai-accent" />
          <span>Privacy & Infrastructure Policies</span>
        </div>
        <p>
          InIsai runs under a zero-cost free-tier architectural guarantee. All personal audio playback on your device remains completely private and client-side.
        </p>
        <div className="flex items-center space-x-4 pt-2 text-inisai-teal font-medium">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <span>•</span>
          <span className="text-white/40">InIsai v1.0.0</span>
        </div>
      </section>
    </div>
  );
}

