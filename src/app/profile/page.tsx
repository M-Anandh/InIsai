"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { usePlayerStore } from "@/stores/player-store";
import { useMounted } from "@/hooks/use-mounted";
import { BackNavigation } from "@/components/layout/BackNavigation";
import { PWAInstaller } from "@/components/pwa/PWAInstaller";
import { AccountDangerZone } from "@/components/account/AccountDangerZone";
import {
  User,
  Check,
  Heart,
  History,
  ListMusic,
  Save,
  LogOut,
  KeyRound,
  ShieldCheck,
  Moon,
  Sun,
  Lock,
  Eye,
  EyeOff,
  Cloud,
  LogIn,
  Sparkles,
} from "lucide-react";

export default function ProfilePage() {
  const {
    user,
    theme,
    isAuthenticated,
    signOut,
    updateProfile,
    changePassword,
    toggleTheme,
    likedTrackIds,
    userPlaylists,
  } = useAuthStore();
  const { history } = usePlayerStore();
  const mounted = useMounted();

  const [name, setName] = useState("InIsai Listener");
  const [lang, setLang] = useState("Tamil");
  const [isSaved, setIsSaved] = useState(false);

  // Change Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user?.displayName) setName(user.displayName);
    if (user?.preferredLanguage) setLang(user.preferredLanguage);
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      displayName: name.trim(),
      preferredLanguage: lang,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      setPasswordStatus({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        success: false,
        message: "Passwords do not match.",
      });
      return;
    }

    setIsUpdatingPassword(true);
    const res = await changePassword(newPassword);
    setIsUpdatingPassword(false);

    if (res.error) {
      setPasswordStatus({ success: false, message: res.error });
    } else {
      setPasswordStatus({
        success: true,
        message: "Password updated successfully!",
      });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const isLight =
    mounted &&
    (theme === "light" ||
      (!theme && user?.theme === "light") ||
      (typeof document !== "undefined" &&
        document.documentElement.classList.contains("light")));

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <BackNavigation fallbackUrl="/" />

      {/* Profile Header Card with Sign Out - Dark Surface Card with High Contrast */}
      <div
        data-surface="dark"
        className="surface-dark p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#17142A] via-[#211B3D] to-[#17142A] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left text-white shadow-xl"
      >
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-inisai-accent via-inisai-teal to-inisai-emerald flex items-center justify-center font-extrabold text-white text-3xl shadow-xl shadow-inisai-accent/30 uppercase flex-shrink-0">
            {name.charAt(0)}
          </div>
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-teal-300 font-bold">
              {mounted && isAuthenticated ? "Verified Account" : "Guest Profile"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {name}
            </h1>
            <p className="text-xs text-white/80 mt-0.5">
              {user?.email || "Listening in Guest Mode"} • Preferred:{" "}
              <span className="text-white font-semibold">{lang}</span>
            </p>
          </div>
        </div>

        {/* Auth Action Button */}
        {mounted && isAuthenticated && user?.id !== "guest-user" ? (
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all shadow-sm flex-shrink-0 cursor-pointer"
            title="Sign out of InIsai"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-inisai-accent hover:bg-inisai-accent/90 text-white text-xs font-bold transition-all shadow-lg shadow-inisai-accent/25 flex-shrink-0 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Register</span>
          </Link>
        )}
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-none text-center">
          <Heart className="w-5 h-5 mx-auto text-rose-500 mb-1" />
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {mounted ? likedTrackIds.length : 0}
          </span>
          <p className="text-xs font-semibold text-slate-600 dark:text-inisai-muted mt-1">
            Liked Songs
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-none text-center">
          <ListMusic className="w-5 h-5 mx-auto text-[#5B3DF5] dark:text-inisai-accent mb-1" />
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {mounted ? userPlaylists.length : 0}
          </span>
          <p className="text-xs font-semibold text-slate-600 dark:text-inisai-muted mt-1">
            Playlists
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-none text-center">
          <History className="w-5 h-5 mx-auto text-[#0A6E86] dark:text-inisai-teal mb-1" />
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {mounted ? history.length : 0}
          </span>
          <p className="text-xs font-semibold text-slate-600 dark:text-inisai-muted mt-1">
            History
          </p>
        </div>
      </div>

      {/* Theme Selection Section */}
      <div className="bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm dark:shadow-none">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          {isLight ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5 text-inisai-accent" />
          )}
          <span>Appearance & Theme</span>
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              Current Mode:{" "}
              <span className="text-[#5B3DF5] dark:text-inisai-accent font-bold">
                {isLight ? "Light Mode" : "Dark Mode"}
              </span>
            </p>
            <p className="text-xs text-slate-600 dark:text-inisai-muted mt-0.5">
              Switch between midnight dark and modern light music listening interface.
            </p>
          </div>
          <button
            onClick={() => toggleTheme()}
            className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900 shadow-sm"
                : "bg-white/10 hover:bg-white/20 border-white/10 text-white"
            }`}
          >
            {isLight ? (
              <Moon className="w-4 h-4 text-purple-600" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
            <span>{isLight ? "Switch to Dark" : "Switch to Light"}</span>
          </button>
        </div>
      </div>

      {/* Preferences Form */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 space-y-5 shadow-sm dark:shadow-none"
      >
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <User className="w-5 h-5 text-[#0A6E86] dark:text-inisai-teal" />
          <span>Edit Profile & Preferences</span>
        </h2>

        <div className="space-y-2">
          <label className="text-xs text-slate-700 dark:text-inisai-muted font-semibold block">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-inisai-accent focus:ring-1 focus:ring-inisai-accent"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-700 dark:text-inisai-muted font-semibold block">
            Preferred Music Language
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-inisai-accent focus:ring-1 focus:ring-inisai-accent cursor-pointer"
          >
            <option value="Tamil">Tamil</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Telugu">Telugu</option>
            <option value="Malayalam">Malayalam</option>
          </select>
        </div>

        <button
          type="submit"
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-inisai-accent text-white text-xs font-bold shadow-lg shadow-inisai-accent/30 hover:opacity-90 transition-all cursor-pointer"
        >
          {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? "Saved Successfully!" : "Save Changes"}</span>
        </button>
      </form>

      {/* Security Section: Only for Authenticated Users */}
      {mounted && isAuthenticated && user && user.id !== "guest-user" ? (
        <form
          onSubmit={handlePasswordChange}
          className="bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 space-y-5 shadow-sm dark:shadow-none"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-rose-500 dark:text-rose-400" />
              <span>Security & Change Password</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-inisai-muted mt-1">
              Update your account login password. Passwords must be at least 6 characters.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-700 dark:text-inisai-muted font-semibold block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password (min. 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-inisai-muted/50 outline-none focus:border-inisai-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-700 dark:text-inisai-muted font-semibold block">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-inisai-muted/50 outline-none focus:border-inisai-accent"
              />
            </div>
          </div>

          {passwordStatus && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                passwordStatus.success
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-inisai-emerald border border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              }`}
            >
              {passwordStatus.success ? (
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Lock className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{passwordStatus.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-inisai-accent text-white text-xs font-bold shadow-lg shadow-rose-500/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{isUpdatingPassword ? "Updating Password..." : "Update Password"}</span>
          </button>
        </form>
      ) : (
        /* Guest Cloud Sync Prompt (No Password Form in Guest Mode!) */
        <div
          data-surface="dark"
          className="surface-dark bg-gradient-to-r from-[#1E1938] via-[#2A1D4E] to-[#1E1938] border border-white/15 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-white shadow-xl"
        >
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-purple-200 text-xs font-semibold">
              <Cloud className="w-3.5 h-3.5" />
              <span>Free Cloud Account</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              Sync Your Music Across Devices
            </h3>
            <p className="text-xs text-white/80 max-w-md">
              Create a free InIsai account to backup your playlists, liked songs, and listening history so you can enjoy them across mobile, desktop, and tablets.
            </p>
          </div>

          <Link
            href="/login"
            className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-white text-black font-bold text-xs shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-transform whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Sign In or Register</span>
          </Link>
        </div>
      )}

      {/* Mobile App Install Row */}
      <div className="md:hidden bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-3xl p-5 flex items-center justify-between gap-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white">Install InIsai App</p>
          <p className="text-[11px] text-slate-600 dark:text-inisai-muted truncate">
            Add to your home screen for quick launch & background play
          </p>
        </div>
        <PWAInstaller variant="row" />
      </div>

      {/* Danger Zone & Data Portability (Signed-in Delete Account / Guest Clear Local Data) */}
      <AccountDangerZone variant="profile" />
    </div>
  );
}
