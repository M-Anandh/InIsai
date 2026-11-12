"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Download, Share2, PlusSquare, X, CheckCircle2, Smartphone, Monitor } from "lucide-react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __inisaiDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export type InstallPlatform =
  | "ios-safari"
  | "desktop-safari"
  | "firefox"
  | "chromium"
  | "other";

export const INSTALL_BANNER_DISMISS_KEY = "inisai_install_banner_dismissed_at";
export const INSTALL_BANNER_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface InstallDiagnostics {
  isInstalled: boolean;
  hasDeferredPrompt: boolean;
  platform: InstallPlatform;
  bannerDismissed: boolean;
  bannerDismissedAt: number | null;
  standaloneMediaMatch: boolean;
  navigatorStandalone: boolean;
  swControlled: boolean;
}

interface InstallContextValue {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  platform: InstallPlatform;
  bannerDismissed: boolean;
  canShowBanner: boolean;
  canShowInstall: boolean;
  instructionsOpen: boolean;
  openInstructions: () => void;
  closeInstructions: () => void;
  promptInstall: () => Promise<"accepted" | "dismissed" | "instructions">;
  dismissBanner: () => void;
  getDiagnostics: () => InstallDiagnostics;
}

const InstallContext = createContext<InstallContextValue | null>(null);

export function detectInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "other";
  }
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios-safari";
  if (/Firefox|FxiOS/i.test(ua)) return "firefox";
  const isSafari =
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Brave|Vivaldi|Android/i.test(ua);
  if (isSafari) return "desktop-safari";
  if (/Chrome|Chromium|Edg|OPR|SamsungBrowser|Brave/i.test(ua)) {
    return "chromium";
  }
  return "other";
}

export function isBannerDismissedActive(storage: Pick<Storage, "getItem"> | null, now = Date.now()): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(INSTALL_BANNER_DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || ts <= 0) return false;
    return now - ts < INSTALL_BANNER_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function checkStandalone(): { mediaMatch: boolean; navStandalone: boolean } {
  if (typeof window === "undefined") {
    return { mediaMatch: false, navStandalone: false };
  }
  const mediaMatch =
    Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches) ||
    Boolean(window.matchMedia?.("(display-mode: window-controls-overlay)")?.matches);
  const navStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { mediaMatch, navStandalone };
}

export function InstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    setPlatform(detectInstallPlatform());

    const syncStandalone = () => {
      const { mediaMatch, navStandalone } = checkStandalone();
      if (mediaMatch || navStandalone) {
        setIsInstalled(true);
      }
    };
    syncStandalone();

    setBannerDismissed(isBannerDismissedActive(window.localStorage));

    // Adopt early-captured prompt from pre-hydration script if present
    if (window.__inisaiDeferredPrompt) {
      setDeferredPrompt(window.__inisaiDeferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const bipEvent = e as BeforeInstallPromptEvent;
      window.__inisaiDeferredPrompt = bipEvent;
      setDeferredPrompt(bipEvent);
    };

    const handleAppInstalled = () => {
      window.__inisaiDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      setInstructionsOpen(false);
    };

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery?.addEventListener?.("change", handleMediaChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery?.removeEventListener?.("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (!instructionsOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInstructionsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [instructionsOpen]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    try {
      window.localStorage.setItem(
        INSTALL_BANNER_DISMISS_KEY,
        String(Date.now())
      );
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "instructions"
  > => {
    const evt = deferredPrompt || window.__inisaiDeferredPrompt || null;
    if (evt) {
      try {
        await evt.prompt();
        const choice = await evt.userChoice;
        window.__inisaiDeferredPrompt = null;
        setDeferredPrompt(null);
        if (choice?.outcome === "accepted") {
          setIsInstalled(true);
          return "accepted";
        }
        return "dismissed";
      } catch {
        // Fallback to manual instructions sheet if prompt throws
      }
    }
    setInstructionsOpen(true);
    return "instructions";
  }, [deferredPrompt]);

  const getDiagnostics = useCallback((): InstallDiagnostics => {
    const { mediaMatch, navStandalone } = checkStandalone();
    let dismissedAt: number | null = null;
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(INSTALL_BANNER_DISMISS_KEY)
          : null;
      if (raw && Number.isFinite(Number(raw))) {
        dismissedAt = Number(raw);
      }
    } catch {
      dismissedAt = null;
    }
    return {
      isInstalled,
      hasDeferredPrompt: Boolean(deferredPrompt || (typeof window !== "undefined" && window.__inisaiDeferredPrompt)),
      platform,
      bannerDismissed,
      bannerDismissedAt: dismissedAt,
      standaloneMediaMatch: mediaMatch,
      navigatorStandalone: navStandalone,
      swControlled:
        typeof navigator !== "undefined" &&
        "serviceWorker" in navigator &&
        Boolean(navigator.serviceWorker.controller),
    };
  }, [isInstalled, deferredPrompt, platform, bannerDismissed]);

  const value = useMemo<InstallContextValue>(
    () => ({
      deferredPrompt,
      isInstalled,
      platform,
      bannerDismissed,
      canShowBanner: !isInstalled && !bannerDismissed,
      canShowInstall: !isInstalled,
      instructionsOpen,
      openInstructions: () => setInstructionsOpen(true),
      closeInstructions: () => setInstructionsOpen(false),
      promptInstall,
      dismissBanner,
      getDiagnostics,
    }),
    [
      deferredPrompt,
      isInstalled,
      platform,
      bannerDismissed,
      instructionsOpen,
      promptInstall,
      dismissBanner,
      getDiagnostics,
    ]
  );

  return (
    <InstallContext.Provider value={value}>
      {children}
      {instructionsOpen && (
        <InstallInstructionsSheet
          platform={platform}
          onClose={() => setInstructionsOpen(false)}
        />
      )}
    </InstallContext.Provider>
  );
}

export function useInstall() {
  const ctx = useContext(InstallContext);
  if (!ctx) {
    throw new Error("useInstall must be used inside <InstallProvider>");
  }
  return ctx;
}

function InstallInstructionsSheet({
  platform,
  onClose,
}: {
  platform: InstallPlatform;
  onClose: () => void;
}) {
  const isIOS = platform === "ios-safari";
  const isDesktopSafari = platform === "desktop-safari";
  const isFirefox = platform === "firefox";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-sheet-title"
      data-testid="install-instructions-sheet"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-inisai-surface border border-inisai-border shadow-2xl p-6 space-y-5 text-inisai-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-inisai-accent/15 border border-inisai-accent/30 flex items-center justify-center shrink-0 text-inisai-accent">
              {isIOS ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="install-sheet-title" className="text-base font-bold text-inisai-text">
                {isIOS ? "Install InIsai on iPhone / iPad" : "Install InIsai App"}
              </h2>
              <p className="text-xs text-inisai-text-muted">
                {isIOS
                  ? "Tap Share → Add to Home Screen in Safari"
                  : "Launch InIsai like a native app without browser chrome"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install instructions"
            className="p-2 rounded-full text-inisai-text-muted hover:text-inisai-text hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3">
            {/* Simple illustrated iOS Safari flow */}
            <div className="rounded-2xl bg-black/25 border border-inisai-border p-4 flex items-center justify-around gap-2">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold">1. Tap Share</span>
              </div>
              <span className="text-inisai-text-dim text-sm">→</span>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-11 h-11 rounded-xl bg-inisai-accent/15 border border-inisai-accent/30 flex items-center justify-center text-inisai-accent">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold">2. Add to Home Screen</span>
              </div>
              <span className="text-inisai-text-dim text-sm">→</span>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold">3. Tap Add</span>
              </div>
            </div>
            <p className="text-xs text-inisai-text-muted leading-relaxed">
              Open this page in <strong>Safari</strong>, tap the <strong>Share</strong> icon in the bottom toolbar, scroll down and choose <strong>Add to Home Screen</strong>.
            </p>
          </div>
        ) : isDesktopSafari ? (
          <div className="space-y-2.5 text-xs text-inisai-text-muted leading-relaxed rounded-2xl bg-black/20 border border-inisai-border p-4">
            <p className="font-semibold text-inisai-text">Safari on macOS:</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>Click <strong>File</strong> in the top macOS menu bar (or the <strong>Share</strong> button in Safari).</li>
              <li>Select <strong>Add to Dock…</strong></li>
              <li>Click <strong>Add</strong> to keep InIsai in your Dock with its own window.</li>
            </ol>
          </div>
        ) : isFirefox ? (
          <div className="space-y-2.5 text-xs text-inisai-text-muted leading-relaxed rounded-2xl bg-black/20 border border-inisai-border p-4">
            <p className="font-semibold text-inisai-text">Firefox Browser:</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>On Android Firefox: tap the menu (<strong>⋮</strong>) and choose <strong>Install</strong> or <strong>Add app to Home screen</strong>.</li>
              <li>On Desktop Firefox: use an installable browser (Chrome / Edge / Safari Dock) or install Firefox PWA support to pin InIsai as a standalone app.</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-2.5 text-xs text-inisai-text-muted leading-relaxed rounded-2xl bg-black/20 border border-inisai-border p-4">
            <p className="font-semibold text-inisai-text">Install via browser address bar:</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>Look for the <strong>Install InIsai</strong> icon (<Download className="inline w-3.5 h-3.5" />) at the right end of your browser address bar.</li>
              <li>Or open your browser menu (<strong>⋮</strong>) → <strong>Cast, save, and share</strong> / <strong>Apps</strong> → <strong>Install InIsai</strong>.</li>
            </ol>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-inisai-accent text-white text-xs font-bold hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

