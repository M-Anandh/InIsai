"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { InisaiLogo } from "../ui/InisaiLogo";
import { PWAInstaller } from "../pwa/PWAInstaller";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Search, LogIn, LogOut, Sparkles, User, X } from "lucide-react";

export const Header: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const greeting = useMemo(() => {
    if (!mounted) return "Welcome to InIsai";
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, [mounted]);

  const handleSearchClick = () => {
    if (typeof window !== "undefined" && window.location.pathname === "/search") {
      const input = document.getElementById("search-input") as HTMLInputElement | null;
      input?.focus();
    } else {
      router.push("/search");
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 glass-panel border-b transition-all duration-200 px-3 sm:px-8 py-2.5 sm:py-3.5 ${
        scrolled
          ? "border-slate-300/80 dark:border-white/15 shadow-md"
          : "border-slate-200/70 dark:border-white/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-h-[44px]">
          {/* Left: Compact Logo on mobile, Greeting on desktop */}
          <div className="flex items-center space-x-3 min-w-0">
            <Link href="/" className="md:hidden">
              <InisaiLogo size="sm" compact />
            </Link>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-inisai-accent flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{greeting}</span>
              </p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {mounted && user?.displayName ? user.displayName : "InIsai Music"}
              </h2>
            </div>
          </div>

          {/* Desktop Quick Search Pill */}
          <div
            onClick={() => router.push("/search")}
            className="hidden md:flex items-center space-x-2.5 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200/80 dark:hover:bg-white/[0.09] border border-slate-200 dark:border-white/[0.08] px-4 py-2 rounded-full cursor-pointer text-xs text-slate-500 dark:text-inisai-muted max-w-xs w-full transition-all shadow-inner"
          >
            <Search className="w-4 h-4 text-inisai-accent" />
            <span className="truncate">Search songs, artists, albums...</span>
          </div>

          {/* Right Actions: Single line on 360px mobile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0">
            {/* Mobile Search Navigation Trigger (>=44px touch target) */}
            <button
              onClick={handleSearchClick}
              aria-label="Open Search"
              className="md:hidden w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white/80 cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            <ThemeToggle showLabelOnMobile={false} />

            {mounted && isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <Link
                  href="/profile"
                  aria-label="Open Profile"
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF8A3D] via-[#FF3D77] to-[#7A5CFF] flex items-center justify-center text-xs font-bold text-white uppercase shadow-md"
                >
                  {user.displayName.charAt(0)}
                </Link>

                <button
                  onClick={() => signOut()}
                  className="hidden sm:flex p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-medium items-center space-x-1 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Compact Avatar Link to Profile/Login */}
                <Link
                  href="/login"
                  aria-label="Sign In or Profile"
                  className="md:hidden w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white cursor-pointer"
                >
                  <User className="w-4 h-4" />
                </Link>

                {/* Desktop Sign In Pill */}
                <Link
                  href="/login"
                  className="hidden md:flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-inisai-accent hover:opacity-90 text-white text-xs font-semibold shadow-md shadow-inisai-accent/25 transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>
        </div>
    </header>
  );
};
