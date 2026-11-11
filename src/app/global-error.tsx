"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[InIsai Global Layout Error]:", error);
  }, [error]);

  const handleFullReset = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) await reg.unregister();
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) await caches.delete(key);
      }
    } catch {}
    window.location.href = "/";
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0B0A10] text-[#F6F3EE] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#16131F] border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display tracking-tight text-white">
              Application Error
            </h2>
            <p className="text-sm text-[#7C7690]">
              A critical layout error occurred. Clearing temporary cache will restore the application.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-inisai-accent text-white font-semibold text-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <button
              onClick={handleFullReset}
              className="w-full py-3 px-4 rounded-xl bg-white/10 text-white font-semibold text-sm cursor-pointer"
            >
              Reset & Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
