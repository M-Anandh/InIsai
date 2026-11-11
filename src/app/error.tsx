"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Trash2, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[InIsai Root Error Caught]:", error);
  }, [error]);

  const handleHardReset = async () => {
    try {
      // 1. Unregister all service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      // 2. Clear caches
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }
      // 3. Purge potentially corrupted local storage caches
      sessionStorage.clear();
    } catch (e) {
      console.warn("Reset error:", e);
    }
    // 4. Force hard reload from server
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#0B0A10] text-[#F6F3EE] flex items-center justify-center p-4 selection:bg-inisai-accent selection:text-white">
      <div className="max-w-md w-full bg-[#16131F] border border-white/10 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white">
            Something went wrong
          </h2>
          <p className="text-xs sm:text-sm text-[#7C7690] leading-relaxed">
            InIsai encountered a temporary client-side error. This usually happens when an older cached version is being upgraded.
          </p>
        </div>

        {error?.message && (
          <div className="bg-black/40 rounded-xl p-3 border border-white/5 text-left overflow-hidden">
            <p className="text-[11px] font-mono text-rose-300/80 truncate">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-inisai-accent hover:opacity-90 active:scale-95 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-inisai-accent/30 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            onClick={handleHardReset}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-semibold text-xs sm:text-sm transition-all border border-white/10 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-amber-400" />
            <span>Clear Cache & Reload</span>
          </button>
        </div>

        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="inline-flex items-center space-x-1.5 text-xs text-[#7C7690] hover:text-white transition-colors cursor-pointer pt-2"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return to Home</span>
        </button>
      </div>
    </div>
  );
}
