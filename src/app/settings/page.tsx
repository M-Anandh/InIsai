"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import {
  getAllSignals,
  computeTasteSummary,
  resetAllSignals,
  exportTasteProfileJson,
  ComputedTasteSummary,
} from "@/lib/personalization/signal-tracker";
import { PWAInstaller } from "@/components/pwa/PWAInstaller";
import {
  Settings,
  Sliders,
  Shield,
  HardDrive,
  User,
  LogOut,
  Trash2,
  Check,
  Sparkles,
  Download,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  Radio,
} from "lucide-react";

export default function SettingsPage() {
  const { settings, setCrossfade, setPlaybackRate, toggleEqualizer, setPreference } =
    usePlayerStore();
  const { user, theme, toggleTheme, signOut } = useAuthStore();
  const mounted = useMounted();

  const [cacheCleared, setCacheCleared] = useState(false);
  const [tasteSummary, setTasteSummary] = useState<ComputedTasteSummary | null>(null);
  const [tasteResetDone, setTasteResetDone] = useState(false);
  const [listenBrainzToken, setListenBrainzToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);

  useEffect(() => {
    getAllSignals().then((sigs) => setTasteSummary(computeTasteSummary(sigs)));
    try {
      const saved = localStorage.getItem("inisai_listenbrainz_token");
      if (saved) setListenBrainzToken(saved);
    } catch {}
  }, []);

  const clearBrowserCache = async () => {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    }
  };

  const handleExportTaste = async () => {
    const json = await exportTasteProfileJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inisai-taste-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetTaste = async () => {
    await resetAllSignals();
    setTasteSummary(computeTasteSummary([]));
    setTasteResetDone(true);
    setTimeout(() => setTasteResetDone(false), 3000);
  };

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (listenBrainzToken.trim()) {
        localStorage.setItem("inisai_listenbrainz_token", listenBrainzToken.trim());
      } else {
        localStorage.removeItem("inisai_listenbrainz_token");
      }
      setTokenSaved(true);
      setTimeout(() => setTokenSaved(false), 2500);
    } catch {}
  };

  const activeTheme = mounted ? theme || user?.theme || "system" : "dark";

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-white/10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <Settings className="w-8 h-8 text-inisai-accent" />
          <span>Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-inisai-muted mt-1">
          Appearance, playback reliability, on-device taste profile, and integrations.
        </p>
      </div>

      {/* Appearance & Theme */}
      <section className="bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Sun className="w-5 h-5 text-amber-500" />
          <span>Appearance & Theme</span>
        </h2>

        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { id: "system", label: "System", icon: Laptop },
            { id: "light", label: "Light", icon: Sun },
            { id: "dark", label: "Dark", icon: Moon },
          ].map((opt) => {
            const Icon = opt.icon;
            const selected = activeTheme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => toggleTheme(opt.id)}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl border font-semibold transition-all cursor-pointer ${
                  selected
                    ? "bg-inisai-accent text-white border-inisai-accent shadow-md shadow-inisai-accent/25"
                    : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Playback & Audio */}
      <section className="bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-inisai-accent" />
          <span>Playback & Sources</span>
        </h2>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Equalizer Status</p>
              <p className="text-slate-500 dark:text-inisai-muted">
                5-Band Web Audio parametric filter (InIsai Audio & Local)
              </p>
            </div>
            <button
              onClick={() => toggleEqualizer()}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                settings.equalizerEnabled
                  ? "bg-inisai-accent text-white"
                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60"
              }`}
            >
              {settings.equalizerEnabled ? "Active" : "Bypassed"}
            </button>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Crossfade Transition</p>
              <p className="text-slate-500 dark:text-inisai-muted">Smooth dual-node fade duration (Audio Engine)</p>
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
              <span className="font-mono text-slate-900 dark:text-white w-6 text-right">
                {settings.crossfadeDuration}s
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Default Playback Rate</p>
              <p className="text-slate-500 dark:text-inisai-muted">Audio & video speed multiplier</p>
            </div>
            <select
              value={settings.playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1.0x (Normal)</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Prefer background-friendly audio source</p>
              <p className="text-slate-500 dark:text-inisai-muted">
                Cross-match direct audio streams for uninterrupted mobile screen-lock play
              </p>
            </div>
            <button
              onClick={() => setPreference("preferAudioFallback", !settings.preferAudioFallback)}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                settings.preferAudioFallback
                  ? "bg-inisai-accent text-white"
                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60"
              }`}
            >
              {settings.preferAudioFallback ? "Enabled" : "Off"}
            </button>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Autoplay Related Tracks</p>
              <p className="text-slate-500 dark:text-inisai-muted">
                Queue related radio picks automatically when queue ends
              </p>
            </div>
            <button
              onClick={() => setPreference("autoplayRelated", settings.autoplayRelated === false)}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                settings.autoplayRelated !== false
                  ? "bg-inisai-accent text-white"
                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60"
              }`}
            >
              {settings.autoplayRelated !== false ? "On" : "Off"}
            </button>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Stats for Nerds</p>
              <p className="text-slate-500 dark:text-inisai-muted">Show engine telemetry, codec/quality & latency</p>
            </div>
            <button
              onClick={() => setPreference("statsForNerd", !settings.statsForNerd)}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                settings.statsForNerd
                  ? "bg-inisai-teal text-black"
                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60"
              }`}
            >
              {settings.statsForNerd ? "Shown" : "Hidden"}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Music Source Providers</p>
              <p className="text-slate-500 dark:text-inisai-muted">
                Inspect provider latency, health checks & toggle sources
              </p>
            </div>
            <Link
              href="/settings/sources"
              className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-semibold transition-colors"
            >
              Manage Sources
            </Link>
          </div>
        </div>
      </section>

      {/* Taste Profile & Privacy (On-Device IndexedDB) */}
      <section className="bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-inisai-accent" />
            <span>Personalisation & Privacy</span>
          </h2>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            100% On-Device IndexedDB
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-inisai-muted leading-relaxed">
          Your taste profile (plays, completions, skips, likes, searches, and time-of-day patterns with a 30-day decay window) is computed locally on your device to power Made For You and Daily Mixes. Nothing leaves your browser unless you sign in.
        </p>

        {tasteSummary && (
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-inisai-muted">Recorded Listening Signals:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {tasteSummary.signalCount} events
              </span>
            </div>

            {tasteSummary.topArtists.length > 0 && (
              <div>
                <span className="text-slate-500 dark:text-inisai-muted block mb-1.5">
                  Top Affinity Artists:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tasteSummary.topArtists.slice(0, 6).map((a) => (
                    <span
                      key={a.name}
                      className="px-2.5 py-1 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-medium"
                    >
                      {a.name} ({a.score})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleExportTaste}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-900 dark:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Profile JSON</span>
          </button>

          <button
            onClick={handleResetTaste}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{tasteResetDone ? "Profile Reset!" : "Reset Taste Profile"}</span>
          </button>
        </div>
      </section>

      {/* Optional Scrobbling & External Connections */}
      <section className="bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Radio className="w-5 h-5 text-inisai-teal" />
          <span>ListenBrainz Scrobbling (Optional)</span>
        </h2>

        <form onSubmit={handleSaveToken} className="flex flex-col sm:flex-row gap-2.5 text-xs">
          <input
            type="password"
            value={listenBrainzToken}
            onChange={(e) => setListenBrainzToken(e.target.value)}
            placeholder="Paste ListenBrainz User Token (optional)..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-inisai-accent"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-inisai-accent text-white font-semibold hover:opacity-90 cursor-pointer"
          >
            {tokenSaved ? "Saved!" : "Save Token"}
          </button>
        </form>
      </section>

      {/* Account Section */}
      <section className="bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
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
                <p className="font-bold text-sm text-slate-900 dark:text-white">{user.displayName}</p>
                <p className="text-xs text-slate-500 dark:text-inisai-muted">{user.email || "Local Guest Mode"}</p>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500 dark:text-inisai-muted">Not logged in. Using Guest Profile.</p>
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
      <section className="bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-inisai-emerald" />
          <span>Storage & Offline Caching</span>
        </h2>

        <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200 dark:border-white/5">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Install InIsai PWA</p>
            <p className="text-slate-500 dark:text-inisai-muted">Install as a standalone music app on your home screen</p>
          </div>
          <PWAInstaller />
        </div>

        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">PWA Service Worker Cache</p>
            <p className="text-slate-500 dark:text-inisai-muted">Clear cached UI shell and reload latest version</p>
          </div>
          <button
            onClick={clearBrowserCache}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-semibold transition-colors cursor-pointer"
          >
            {cacheCleared ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Cache Cleared</span>
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

      {/* Legal Footer */}
      <section className="p-6 rounded-3xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-3 text-xs text-slate-500 dark:text-inisai-muted">
        <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-semibold">
          <Shield className="w-4 h-4 text-inisai-accent" />
          <span>Privacy & Infrastructure Policies</span>
        </div>
        <p>
          Offline caching applies strictly to your own device files. Streaming music plays cleanly through compliant provider players.
        </p>
        <div className="flex items-center space-x-4 pt-2 text-inisai-accent font-medium">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <span>•</span>
          <span className="text-slate-400">InIsai v2.0</span>
        </div>
      </section>
    </div>
  );
}
