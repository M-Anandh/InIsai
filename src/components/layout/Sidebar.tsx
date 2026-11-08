"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { InisaiLogo } from "../ui/InisaiLogo";
import { PWAInstaller } from "../pwa/PWAInstaller";
import {
  Home,
  Compass,
  Search,
  Library,
  ListMusic,
  Heart,
  History,
  HardDrive,
  Disc3,
  Settings,
  User,
  LogOut,
  Sparkles,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isAuthenticated, signOut } = useAuthStore();
  const mounted = useMounted();

  const primaryNav = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Search", href: "/search", icon: Search },
  ];

  const libraryNav = [
    { label: "Your Library", href: "/library", icon: Library },
    { label: "Playlists", href: "/playlists", icon: ListMusic },
    { label: "Liked Songs", href: "/liked", icon: Heart },
    { label: "Recently Played", href: "/history", icon: History },
    { label: "Local Music", href: "/local", icon: Disc3 },
    { label: "Downloads & Offline", href: "/offline", icon: HardDrive },
  ];

  const bottomNav = [
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-inisai-dark/90 backdrop-blur-2xl border-r border-white/[0.08] h-screen sticky top-0 px-4 py-5 select-none z-30">
      {/* Brand Logo */}
      <Link href="/" className="mb-6 px-2 block transition-transform hover:scale-[1.02]">
        <InisaiLogo size="md" />
      </Link>

      {/* Primary Navigation Section */}
      <div className="space-y-1 mb-6">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-inisai-accent/25 via-inisai-accent/15 to-transparent text-white border-l-2 border-inisai-accent font-semibold shadow-sm"
                  : "text-inisai-muted hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? "text-inisai-accent scale-110" : "text-inisai-muted group-hover:text-white"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Library Section */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 border-t border-white/[0.06] pt-4 scrollbar-none">
        <p className="px-3.5 text-[11px] font-bold uppercase tracking-wider text-inisai-muted/70 mb-2">
          My Collection
        </p>
        {libraryNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-inisai-accent/25 via-inisai-accent/15 to-transparent text-white border-l-2 border-inisai-accent font-semibold shadow-sm"
                  : "text-inisai-muted hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform duration-200 ${
                  isActive ? "text-inisai-teal scale-110" : "text-inisai-muted"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Sidebar Footer Controls */}
      <div className="border-t border-white/[0.06] pt-3 mt-2 space-y-1">
        <div className="px-1 py-1">
          <PWAInstaller />
        </div>

        {bottomNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-white font-semibold"
                  : "text-inisai-muted hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {mounted && isAuthenticated && (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}

        {/* Creator Attribution */}
        <div className="pt-2 px-3 text-[10px] text-inisai-muted/60">
          <p>InIsai © 2026</p>
          <a
            href="https://www.linkedin.com/in/anandh-m/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-inisai-accent/70 hover:text-inisai-accent transition-colors"
          >
            Crafted by Anandh M
          </a>
        </div>
      </div>
    </aside>
  );
};
