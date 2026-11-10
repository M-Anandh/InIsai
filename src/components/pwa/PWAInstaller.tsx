"use client";

import React, { useEffect, useState } from "react";
import { Download, CheckCircle2, Share, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "inisai_install_banner_dismissed";

export const PWAInstaller: React.FC<{ variant?: "button" | "banner" }> = ({
  variant = "button",
}) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  if (variant === "banner") {
    if (isInstalled || dismissed || (!deferredPrompt && !isIOS)) return null;
    return (
      <>
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FF8A3D]/15 via-[#FF3D77]/15 to-[#7A5CFF]/15 border border-inisai-accent/25 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-inisai-accent text-white flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                Install InIsai App
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-inisai-muted truncate">
                Full-screen lock-screen controls & instant offline launch
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-inisai-accent text-white text-xs font-bold shadow cursor-pointer"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#1C1928] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-white space-y-4">
              <h3 className="font-bold text-lg">Install InIsai on iOS</h3>
              <ol className="text-xs space-y-2 list-decimal list-inside text-white/90">
                <li>
                  Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-inisai-accent" /> Share button in Safari.
                </li>
                <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</li>
                <li>Tap &ldquo;Add&rdquo; in the top-right corner.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-inisai-accent text-white font-semibold text-xs cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (isInstalled) {
    return (
      <div className="flex items-center space-x-1.5 text-xs text-emerald-500 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>App Installed</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF8A3D] via-[#FF3D77] to-[#7A5CFF] text-white text-xs font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        title="Install InIsai PWA"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#1C1928] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-white space-y-4">
            <h3 className="font-bold text-lg">Install InIsai on iOS</h3>
            <ol className="text-xs space-y-2 list-decimal list-inside text-white/90">
              <li>
                Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-inisai-accent" /> Share button in Safari.
              </li>
              <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</li>
              <li>Tap &ldquo;Add&rdquo; in the top-right corner.</li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-inisai-accent text-white font-semibold text-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
