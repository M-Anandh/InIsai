"use client";

import React from "react";
import { Download, Smartphone, X, HelpCircle } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { useInstall } from "./InstallProvider";

interface PWAInstallerProps {
  variant?: "button" | "banner" | "sidebar" | "row";
  className?: string;
}

export const PWAInstaller: React.FC<PWAInstallerProps> = ({
  variant = "button",
  className = "",
}) => {
  const mounted = useMounted();
  const {
    canShowInstall,
    canShowBanner,
    deferredPrompt,
    platform,
    promptInstall,
    dismissBanner,
  } = useInstall();

  if (!mounted || !canShowInstall) return null;

  if (variant === "banner") {
    if (!canShowBanner) return null;

    return (
      <div
        data-testid="pwa-install-banner"
        className={`md:hidden relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2D1B4E]/95 via-[#18162B]/95 to-[#112A38]/95 border border-inisai-accent/30 p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-lg ${className}`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-inisai-accent/20 border border-inisai-accent/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-inisai-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate">
              Install InIsai App
            </h3>
            <p className="text-[11px] text-white/75 truncate">
              {platform === "ios-safari"
                ? "Tap Share → Add to Home Screen"
                : "Faster launches & seamless lock-screen play"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => void promptInstall()}
            data-testid="pwa-install-banner-btn"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-inisai-accent text-white text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>

          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss install banner"
            data-testid="pwa-install-banner-dismiss"
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={() => void promptInstall()}
        data-testid="pwa-install-sidebar-btn"
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-inisai-accent/10 hover:bg-inisai-accent/20 text-inisai-accent border border-inisai-accent/25 transition-all cursor-pointer ${className}`}
      >
        <span className="flex items-center space-x-2.5">
          <Download className="w-4 h-4 shrink-0" />
          <span>Install App</span>
        </span>
        {!deferredPrompt && (
          <HelpCircle className="w-3.5 h-3.5 opacity-60 shrink-0" />
        )}
      </button>
    );
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={() => void promptInstall()}
        data-testid="pwa-install-row-btn"
        className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-inisai-accent text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // Default compact button
  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      data-testid="pwa-install-btn"
      className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-inisai-accent/15 hover:bg-inisai-accent/25 border border-inisai-accent/30 text-inisai-accent text-xs font-bold transition-all active:scale-95 cursor-pointer ${className}`}
    >
      <Download className="w-4 h-4" />
      <span>Install App</span>
    </button>
  );
};
