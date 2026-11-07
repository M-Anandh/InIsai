"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

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
    <aside className="hidden md:flex flex-col w-64 bg-inisai-card border-r border-inisai-border h-screen sticky top-0 px-4 py-5 select-none z-30">
      {/* Brand Logo */}
      <Link href="/" className="mb-6 px-2 block">
        <InisaiLogo size="md" />
      </Link>

      {/* Primary Section */}
      <div className="space-y-1 mb-6">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-inisai-accent text-white shadow-lg shadow-inisai-accent/20 font-semibold"
                  : "text-inisai-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Library Section */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 border-t border-white/5 pt-4">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-inisai-muted/60 mb-2">
          My Collection
        </p>
        {libraryNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-white font-semibold"
                  : "text-inisai-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions & PWA Install */}
      <div className="pt-4 border-t border-white/5 space-y-3">
        <div className="px-1">
          <PWAInstaller />
        </div>

        <div className="space-y-1">
          {bottomNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white font-semibold"
                    : "text-inisai-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
