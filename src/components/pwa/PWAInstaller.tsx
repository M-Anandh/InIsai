"use client";

import React, { useEffect, useState } from "react";
import { Download, CheckCircle2, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstaller: React.FC<{ variant?: "button" | "banner" }> = ({
  variant = "button",
}) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

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
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
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

  if (isInstalled) {
    return (
      <div className="flex items-center space-x-1.5 text-xs text-inisai-emerald px-3 py-1.5 rounded-full bg-inisai-emerald/10 border border-inisai-emerald/20 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>InIsai App Installed</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-inisai-accent to-inisai-teal text-white text-xs font-semibold shadow-lg shadow-inisai-accent/20 hover:opacity-90 active:scale-95 transition-all"
        title="Install InIsai app on your device"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App (நிறுவு)</span>
      </button>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-inisai-card border border-white/10 rounded-2xl p-6 max-w-sm w-full text-white space-y-4">
            <h3 className="font-bold text-lg">Install InIsai on iOS</h3>
            <p className="text-xs text-inisai-muted leading-relaxed">
              To install on your iPhone or iPad:
            </p>
            <ol className="text-xs space-y-2 list-decimal list-inside text-white/90">
              <li>Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-inisai-accent" /> Share button in Safari.</li>
              <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</li>
              <li>Tap &ldquo;Add&rdquo; in the top-right corner.</li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-inisai-accent rounded-xl text-xs font-bold text-white mt-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
