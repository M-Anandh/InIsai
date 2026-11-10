"use client";

import React, { useEffect, useState, useCallback } from "react";
import { providerRegistry } from "@/music/providers/ProviderRegistry";
import { SourceProvider, ProviderHealth } from "@/music/providers/types";
import { SourceProviderId } from "@/types";
import { BackNavigation } from "@/components/layout/BackNavigation";
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  Radio,
  HardDrive,
  Youtube,
} from "lucide-react";

export default function SourcesSettingsPage() {
  const [providers, setProviders] = useState<SourceProvider[]>([]);
  const [enabledState, setEnabledState] = useState<Record<string, boolean>>({});
  const [healthMap, setHealthMap] = useState<Record<string, ProviderHealth>>({});
  const [isChecking, setIsChecking] = useState(false);

  const runHealthChecks = useCallback(async () => {
    setIsChecking(true);
    try {
      const results = await providerRegistry.checkAllHealth();
      setHealthMap(results);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const all = providerRegistry.getAllProviders();
    setProviders(all);
    const map: Record<string, boolean> = {};
    for (const p of all) {
      map[p.id] = providerRegistry.isEnabled(p.id);
    }
    setEnabledState(map);
    runHealthChecks();
  }, [runHealthChecks]);

  const handleToggle = (id: SourceProviderId) => {
    const nextVal = !enabledState[id];
    providerRegistry.setEnabled(id, nextVal);
    setEnabledState((prev) => ({ ...prev, [id]: nextVal }));
  };

  const getIcon = (id: SourceProviderId) => {
    if (id === "ytmusic") return <Youtube className="w-5 h-5 text-rose-500" />;
    if (id === "saavn") return <Radio className="w-5 h-5 text-inisai-accent" />;
    return <HardDrive className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <BackNavigation fallbackUrl="/settings" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Server className="w-7 h-7 text-inisai-accent" />
            <span>Source Providers & Health</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-inisai-muted mt-1">
            Inspect live API health, latency, capabilities, and toggle music catalogs.
          </p>
        </div>

        <button
          onClick={runHealthChecks}
          disabled={isChecking}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-inisai-accent text-white text-xs font-semibold shadow-md shadow-inisai-accent/25 hover:opacity-90 disabled:opacity-50 transition-all self-start cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
          <span>{isChecking ? "Checking..." : "Run Health Check"}</span>
        </button>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => {
          const isEnabled = enabledState[provider.id] ?? true;
          const health = healthMap[provider.id];

          return (
            <div
              key={provider.id}
              className="p-5 rounded-3xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    {getIcon(provider.id)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70">
                        {provider.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-inisai-muted">
                      {provider.description}
                    </p>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-medium">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70">
                    Stream: {provider.capabilities.stream}
                  </span>
                  {provider.capabilities.search && (
                    <span className="px-2 py-0.5 rounded-md bg-inisai-accent/10 text-inisai-accent">
                      Search
                    </span>
                  )}
                  {provider.capabilities.browse && (
                    <span className="px-2 py-0.5 rounded-md bg-inisai-accent/10 text-inisai-accent">
                      Browse
                    </span>
                  )}
                  {provider.capabilities.charts && (
                    <span className="px-2 py-0.5 rounded-md bg-inisai-accent/10 text-inisai-accent">
                      Charts
                    </span>
                  )}
                  {provider.capabilities.related && (
                    <span className="px-2 py-0.5 rounded-md bg-inisai-accent/10 text-inisai-accent">
                      Related Radio
                    </span>
                  )}
                </div>

                {/* Health Status */}
                {health && (
                  <div className="flex items-center space-x-2 pt-1 text-xs">
                    {health.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    )}
                    <span className={health.ok ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-500 font-medium"}>
                      {health.ok ? "Healthy" : "Degraded"} ({health.latencyMs}ms)
                    </span>
                    {health.message && (
                      <span className="text-slate-400 dark:text-inisai-muted truncate">
                        • {health.message}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Enable/Disable Switch */}
              <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                <span className="text-xs font-medium text-slate-600 dark:text-inisai-muted">
                  {isEnabled ? "Enabled" : "Disabled"}
                </span>
                <button
                  onClick={() => handleToggle(provider.id)}
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={`Toggle ${provider.name}`}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    isEnabled ? "bg-inisai-accent" : "bg-slate-300 dark:bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                      isEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compliance Notice */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-start space-x-3 text-xs text-slate-600 dark:text-inisai-muted">
        <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-900 dark:text-white">API Compliance Boundary:</strong>{" "}
          YouTube Music metadata powers search, discovery, and radio recommendations while playback runs strictly via the official YouTube IFrame Player API (`YT.Player`). Direct stream extraction and offline downloads of third-party streaming content are disabled.
        </p>
      </div>
    </div>
  );
}
