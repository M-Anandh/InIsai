"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export const SWUpdateNotifier: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    let initialSha: string | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!initialSha) {
          initialSha = data.sha;
        } else if (data.sha && data.sha !== initialSha) {
          setShowReload(true);
        }
      } catch {}
    };

    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    const onFocus = () => checkVersion();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      const trackInstalling = (worker: ServiceWorker) => {
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(worker);
            setShowReload(true);
          }
        });
      };

      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowReload(true);
      }

      reg.addEventListener("updatefound", () => {
        if (reg.installing) trackInstalling(reg.installing);
      });
    });

    // Only reload automatically when replacing an ALREADY controlling service worker (skip first-time claim)
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleReload = () => {
    if (waitingWorker) {
      waitingWorker.postMessage("SKIP_WAITING");
    } else {
      window.location.reload();
    }
  };

  if (!showReload) return null;

  return (
    <div className="fixed bottom-24 md:bottom-20 right-4 z-50 max-w-sm bg-[#1C1928] border border-inisai-accent/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-white text-xs backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
      <div>
        <p className="font-bold text-white">Update available</p>
        <p className="text-[11px] text-white/60">A new build of InIsai is ready</p>
      </div>
      <button
        onClick={handleReload}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-inisai-accent text-white font-bold text-xs hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer whitespace-nowrap"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Reload</span>
      </button>
    </div>
  );
};

