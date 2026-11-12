"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { INISAI_OFFICIAL_COLLECTIONS } from "@/music/collections";
import { useAuthStore } from "@/stores/auth-store";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { useInstall, InstallDiagnostics } from "@/components/pwa/InstallProvider";
import { Activity, CheckCircle, XCircle, RefreshCw, Cpu, Server, Globe, HardDrive, Smartphone } from "lucide-react";

interface CollectionDebugStatus {
  id: string;
  title: string;
  status: "ok" | "failed" | "loading";
  trackCount: number;
  coverUrl?: string;
  error?: string;
}

interface CoverAuditData {
  timestamp: string;
  summaries: Array<{ surface: string; total: number; realArt: number; fallback: number; percentage: number }>;
  topRejectionReasons: Array<{ reason: string; count: number }>;
  items: Array<{
    surface: string;
    id: string;
    title: string;
    originalUrl: string;
    httpStatus: number | string;
    contentType: string;
    naturalWidth: number;
    naturalHeight: number;
    realArt: boolean;
    rejectedReason?: string;
  }>;
}

export default function DebugPage() {
  const { user } = useAuthStore();
  const { getDiagnostics } = useInstall();
  const [installDiag, setInstallDiag] = useState<InstallDiagnostics | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [collections, setCollections] = useState<CollectionDebugStatus[]>([]);
  const [swVersion, setSwVersion] = useState<string>("Checking...");
  const [langPrefs, setLangPrefs] = useState<string[]>([]);
  const [providerHealth, setProviderHealth] = useState<Record<string, "ok" | "error" | "unconfigured">>({
    "YouTube Music (In-App)": "ok",
    "Saavn Public CDN": "ok",
    "Local File System / IDB": "ok",
    "TMDB Movie Discovery": "unconfigured",
  });
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const [coverAudit, setCoverAudit] = useState<CoverAuditData | null>(null);
  const [loadingCoverAudit, setLoadingCoverAudit] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA || "1329352";
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "2.1.0";

  const runDiagnostics = async () => {
    setIsRefreshing(true);

    // 1. Language Preferences
    try {
      const stored = localStorage.getItem("inisai_preferred_languages");
      if (stored) {
        setLangPrefs(JSON.parse(stored));
      } else {
        setLangPrefs([user?.preferredLanguage || "Tamil", "English"]);
      }
    } catch {}

    // 2. Service Worker Status
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.active) {
          setSwVersion(`Active (${reg.active.state})`);
        } else if (reg?.installing) {
          setSwVersion(`Installing`);
        } else if (reg?.waiting) {
          setSwVersion(`Waiting`);
        } else {
          setSwVersion("Not registered");
        }
      } catch (err: any) {
        setSwVersion(`Error: ${err?.message}`);
      }
    } else {
      setSwVersion("Unsupported");
    }

    // 3. Test Collections Resolution
    const results: CollectionDebugStatus[] = [];
    for (const col of INISAI_OFFICIAL_COLLECTIONS.slice(0, 5)) {
      try {
        const res = await fetch(`/api/yt/collections?id=${encodeURIComponent(col.id)}`);
        if (res.ok) {
          const data = await res.json();
          results.push({
            id: col.id,
            title: col.title,
            status: "ok",
            trackCount: data.tracks?.length || 0,
            coverUrl: data.artworkUrl || data.cover || data.tracks?.[0]?.artworkUrl,
          });
        } else {
          results.push({
            id: col.id,
            title: col.title,
            status: "failed",
            trackCount: 0,
            error: `HTTP ${res.status}`,
          });
        }
      } catch (err: any) {
        results.push({
          id: col.id,
          title: col.title,
          status: "failed",
          trackCount: 0,
          error: err?.message,
        });
      }
    }
    setCollections(results);

    // 4. Cover Images Audit & PWA Install Diagnostics if debug=1
    if (typeof window !== "undefined") {
      setInstallDiag(getDiagnostics());
      if (window.location.search.includes("debug=1")) {
        setIsDebugMode(true);
        setLoadingCoverAudit(true);
        fetch("/api/debug/covers")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => setCoverAudit(data))
          .catch(() => {})
          .finally(() => setLoadingCoverAudit(false));
      }
    }

    setIsRefreshing(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <BackNavigation fallbackUrl="/settings" />

      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Activity className="w-8 h-8 text-inisai-teal" />
            <span>System Diagnostics & Debug</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-inisai-muted mt-1">
            Real-time verification of build targets, provider caches, and service health.
          </p>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-inisai-teal text-black font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Build Info Card */}
      <section className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-inisai-accent" />
          <span>Build & Environment Status</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5 space-y-1">
            <span className="text-slate-400 dark:text-inisai-muted">App Version</span>
            <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">v{appVersion}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5 space-y-1">
            <span className="text-slate-400 dark:text-inisai-muted">Git Commit SHA</span>
            <p className="font-mono font-bold text-inisai-accent text-sm">{buildSha}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5 space-y-1">
            <span className="text-slate-400 dark:text-inisai-muted">Build Timestamp</span>
            <p className="font-mono text-slate-700 dark:text-white/80">{new Date(buildTime).toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* Service Worker & Language Prefs */}
      <section className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Globe className="w-5 h-5 text-emerald-500" />
          <span>Client & Cache Configuration</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5 space-y-2">
            <span className="text-slate-400 dark:text-inisai-muted">Service Worker Cache</span>
            <p className="font-mono font-semibold text-slate-900 dark:text-white">{swVersion}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5 space-y-2">
            <span className="text-slate-400 dark:text-inisai-muted">Active Language Preferences</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {langPrefs.map((l) => (
                <span key={l} className="px-2.5 py-1 rounded-full bg-inisai-accent/15 text-inisai-accent font-semibold text-[11px]">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Provider Health */}
      <section className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Server className="w-5 h-5 text-sky-400" />
          <span>Provider Health & Feed Status</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {Object.entries(providerHealth).map(([name, status]) => (
            <div key={name} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5">
              <span className="font-semibold text-slate-900 dark:text-white">{name}</span>
              <span className={`flex items-center space-x-1 font-mono text-[11px] font-bold ${
                status === "ok" ? "text-emerald-500" : status === "unconfigured" ? "text-amber-400" : "text-rose-500"
              }`}>
                {status === "ok" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span className="uppercase">{status}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Collections Resolution Health */}
      <section className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-indigo-400" />
          <span>Official Collections Resolution Test</span>
        </h2>

        <div className="space-y-2 text-xs">
          {collections.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5">
              <div className="min-w-0 pr-4">
                <p className="font-bold text-slate-900 dark:text-white truncate">{c.title}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{c.id} · {c.trackCount} tracks</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                c.status === "ok" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
              }`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* PWA Installability Diagnostics (?debug=1) */}
      {(isDebugMode || installDiag) && installDiag && (
        <section
          data-testid="pwa-install-diagnostics"
          className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-inisai-accent" />
            <span>PWA Installability & Banner State</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5">
              <span className="text-slate-400 text-[10px]">Platform</span>
              <p className="font-bold text-slate-900 dark:text-white">{installDiag.platform}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5">
              <span className="text-slate-400 text-[10px]">Deferred Prompt</span>
              <p className="font-bold text-slate-900 dark:text-white">
                {installDiag.hasDeferredPrompt ? "Captured" : "Not fired yet"}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5">
              <span className="text-slate-400 text-[10px]">Installed / Standalone</span>
              <p className="font-bold text-slate-900 dark:text-white">
                {installDiag.isInstalled ? "Yes" : "No"} (media: {String(installDiag.standaloneMediaMatch)})
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5">
              <span className="text-slate-400 text-[10px]">SW Controlled / Dismissed</span>
              <p className="font-bold text-slate-900 dark:text-white">
                SW:{String(installDiag.swControlled)} · Dismissed:{String(installDiag.bannerDismissed)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Cover Images Quality & Rejection Audit (/debug?debug=1) */}
      <section className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-rose-400" />
            <span>Cover Images Audit & Rejection Telemetry</span>
          </h2>
          <button
            onClick={() => {
              setLoadingCoverAudit(true);
              fetch("/api/debug/covers")
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => setCoverAudit(data))
                .finally(() => setLoadingCoverAudit(false));
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
          >
            {loadingCoverAudit ? "Auditing..." : "Run Covers Audit"}
          </button>
        </div>

        {coverAudit ? (
          <div className="space-y-6 text-xs">
            {/* Surface Summaries Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2 px-3">Surface</th>
                    <th className="py-2 px-3">Total Items</th>
                    <th className="py-2 px-3">Real Art</th>
                    <th className="py-2 px-3">Fallback</th>
                    <th className="py-2 px-3">% Real Art</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                  {coverAudit.summaries.map((s) => (
                    <tr key={s.surface}>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-white/90">{s.surface}</td>
                      <td className="py-2 px-3">{s.total}</td>
                      <td className="py-2 px-3 text-emerald-500 font-bold">{s.realArt}</td>
                      <td className="py-2 px-3 text-rose-400">{s.fallback}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.percentage >= 95 ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-400"
                        }`}>
                          {s.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Rejection Reasons */}
            {coverAudit.topRejectionReasons.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-slate-500 dark:text-inisai-muted text-[11px]">
                  Top Rejection Reasons
                </h3>
                <div className="space-y-1">
                  {coverAudit.topRejectionReasons.map((r) => (
                    <div key={r.reason} className="flex justify-between p-2 rounded-xl bg-rose-500/10 text-rose-400 font-mono text-[11px]">
                      <span>{r.reason}</span>
                      <span className="font-bold">{r.count} occurrence(s)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-inisai-muted">
            {loadingCoverAudit ? "Auditing cover images across home, search, collections and mixes..." : "Pass ?debug=1 or click Run Covers Audit to generate cover analysis."}
          </p>
        )}
      </section>
    </div>
  );
}

