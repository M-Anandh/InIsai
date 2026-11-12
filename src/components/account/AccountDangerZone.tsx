"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Download,
  FileJson,
  Lock,
  LogIn,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { usePlayerStore } from "@/stores/player-store";
import { useMounted } from "@/hooks/use-mounted";
import { exportAllUserDataJson, purgeAllLocalUserData } from "@/lib/user-data";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

const REAUTH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface AccountDangerZoneProps {
  variant?: "settings" | "profile";
}

function parseJwtIatMs(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return typeof payload.iat === "number" ? payload.iat * 1000 : null;
  } catch {
    return null;
  }
}

export const AccountDangerZone: React.FC<AccountDangerZoneProps> = ({
  variant = "settings",
}) => {
  const router = useRouter();
  const mounted = useMounted();
  const { user, isAuthenticated, deleteAccount } = useAuthStore();
  const { setToastMessage } = usePlayerStore();

  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // Signed-in Delete Account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [authProvider, setAuthProvider] = useState<string>("email");
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Guest Clear Local Data modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const checkSessionFreshness = async () => {
    if (!isSupabaseConfigured() || !isAuthenticated) {
      setNeedsReauth(false);
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        setNeedsReauth(false);
        return;
      }
      const provider =
        (session.user?.app_metadata?.provider as string) ||
        (session.user?.identities?.[0]?.provider as string) ||
        "email";
      setAuthProvider(provider);

      const lastSignInMs = session.user?.last_sign_in_at
        ? Date.parse(session.user.last_sign_in_at)
        : parseJwtIatMs(session.access_token);
      if (lastSignInMs && Date.now() - lastSignInMs > REAUTH_WINDOW_MS) {
        setNeedsReauth(true);
      } else {
        setNeedsReauth(false);
      }
    } catch {
      setNeedsReauth(false);
    }
  };

  useEffect(() => {
    if (showDeleteModal) {
      void checkSessionFreshness();
    }
  }, [showDeleteModal]);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportAllUserDataJson();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReauthGoogle = async () => {
    if (!isSupabaseConfigured()) return;
    setReauthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/settings?reauth=delete`,
      },
    });
    if (error) {
      setReauthError(error.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE") return;
    setIsDeleting(true);
    setReauthError(null);

    try {
      if (needsReauth && isSupabaseConfigured() && authProvider !== "google") {
        if (!reauthPassword) {
          setReauthError("Please re-enter your password to confirm deletion.");
          setIsDeleting(false);
          return;
        }
        const email = user?.email;
        if (email) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password: reauthPassword,
          });
          if (signInErr) {
            setReauthError(signInErr.message || "Incorrect password.");
            setIsDeleting(false);
            return;
          }
          setNeedsReauth(false);
        }
      }

      const res = await deleteAccount();
      if (!res.success) {
        setReauthError(res.error || "Could not delete account.");
        setIsDeleting(false);
        return;
      }

      setShowDeleteModal(false);
      setToastMessage("Your account and data have been permanently deleted.");
      router.push("/");
    } catch (err: unknown) {
      setReauthError(
        err instanceof Error ? err.message : "Failed to delete account."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearGuestData = async () => {
    setIsClearing(true);
    try {
      await purgeAllLocalUserData();
      setShowClearModal(false);
      setToastMessage("Local device data cleared.");
      router.push("/");
    } finally {
      setIsClearing(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <section
        data-testid={`danger-zone-${variant}`}
        className="bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-5 shadow-sm"
      >
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <span>{isAuthenticated ? "Account Data & Danger Zone" : "Device Data & Privacy"}</span>
        </h2>

        {/* Download my data (JSON) — works for both guest and signed-in */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <FileJson className="w-4 h-4 text-sky-500" />
              <span>Download my data (JSON)</span>
            </p>
            <p className="text-slate-600 dark:text-inisai-muted mt-0.5">
              Export your liked tracks, playlists, preferences, and listening history as JSON.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            data-testid="download-my-data-btn"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-900 dark:text-white font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            {exportDone ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Exported</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-sky-500" />
                <span>{isExporting ? "Exporting..." : "Download my data"}</span>
              </>
            )}
          </button>
        </div>

        {isAuthenticated ? (
          /* Signed-in User: Delete Account */
          <div className="pt-4 border-t border-rose-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-semibold text-rose-500 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Delete account</span>
              </p>
              <p className="text-slate-600 dark:text-inisai-muted mt-0.5">
                Permanently remove your account, cloud playlists, likes, history, taste profile, and local cache.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText("");
                setReauthPassword("");
                setReauthError(null);
                setShowDeleteModal(true);
              }}
              data-testid="delete-account-trigger"
              className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-500 font-bold transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
            >
              Delete account
            </button>
          </div>
        ) : (
          /* Guest User: Clear local data + Sign in prompt */
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-semibold text-rose-500 flex items-center space-x-1.5">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Clear local data</span>
                </p>
                <p className="text-slate-600 dark:text-inisai-muted mt-0.5">
                  Erase your liked songs, playlists, listening history, and taste profile stored on this device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                data-testid="clear-local-data-trigger"
                className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-500 font-bold transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
              >
                Clear local data
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs">
              <span className="text-slate-700 dark:text-inisai-muted">
                Sign in to manage an account and sync across devices.
              </span>
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 text-inisai-accent font-bold hover:underline shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Signed-in Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          data-testid="delete-account-modal"
          className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-rose-500/30 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 id="delete-account-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Delete account permanently
                </h3>
                <p className="text-xs text-rose-500 font-medium">This action cannot be undone</p>
              </div>
            </div>

            <div className="rounded-2xl bg-rose-500/5 border border-rose-500/15 p-3.5 text-xs text-slate-700 dark:text-inisai-muted space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-white">What will be deleted immediately:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Your InIsai account, profile, and active sessions</li>
                <li>All liked songs, custom playlists, and listening history</li>
                <li>Personalization taste profile and local cached data</li>
              </ul>
            </div>

            {needsReauth && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-300 font-semibold">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>For security, confirm your recent sign-in</span>
                </div>
                {authProvider === "google" ? (
                  <button
                    type="button"
                    onClick={handleReauthGoogle}
                    className="w-full py-2 rounded-xl bg-white text-slate-900 font-bold border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Re-authenticate with Google
                  </button>
                ) : (
                  <input
                    type="password"
                    value={reauthPassword}
                    onChange={(e) => setReauthPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    data-testid="delete-reauth-password"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs outline-none focus:border-rose-500"
                  />
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs text-slate-600 dark:text-inisai-muted">
                Type <strong className="text-slate-900 dark:text-white font-mono">DELETE</strong> below to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                data-testid="delete-confirm-input"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {reauthError && (
              <p className="text-xs text-rose-500 font-medium">{reauthError}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white text-xs font-semibold hover:bg-slate-300 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={
                  deleteConfirmText.trim() !== "DELETE" ||
                  isDeleting ||
                  (needsReauth && authProvider === "google")
                }
                data-testid="delete-account-confirm-btn"
                className="px-4 py-2 rounded-xl bg-rose-500 disabled:opacity-40 text-white text-xs font-bold hover:bg-rose-600 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Clear Local Data Modal */}
      {showClearModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-local-title"
          data-testid="clear-local-data-modal"
          className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 id="clear-local-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Clear local data?
                </h3>
                <p className="text-xs text-slate-500 dark:text-inisai-muted">
                  Only affects data saved on this device
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-inisai-muted leading-relaxed">
              This will permanently erase your device-stored liked songs, custom playlists, listening history, and personalization signals. Download your data first if you want a backup.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white text-xs font-semibold hover:bg-slate-300 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearGuestData}
                disabled={isClearing}
                data-testid="clear-local-confirm-btn"
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? "Clearing..." : "Clear local data"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
