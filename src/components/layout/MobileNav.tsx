"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Search, Library, User } from "lucide-react";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Search", href: "/search", icon: Search },
    { label: "Library", href: "/library", icon: Library },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-inisai-dark/95 backdrop-blur-xl border-t border-inisai-border px-2 py-1.5 flex items-center justify-around select-none">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isActive
                ? "text-inisai-accent font-semibold"
                : "text-inisai-muted hover:text-white"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
