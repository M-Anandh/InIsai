"use client";

import React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { Sun, Moon, Laptop } from "lucide-react";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { user, toggleTheme } = useAuthStore();
  const mounted = useMounted();

  const currentTheme = mounted ? user?.theme || "dark" : "dark";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentTheme === "dark") {
      toggleTheme("light");
    } else if (currentTheme === "light") {
      toggleTheme("system");
    } else {
      toggleTheme("dark");
    }
  };

  const getLabel = () => {
    if (currentTheme === "dark") return "Theme: Cinematic Midnight";
    if (currentTheme === "light") return "Theme: Pearl Editorial";
    return "Theme: System Auto";
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
        currentTheme === "light"
          ? "bg-amber-500/10 border-amber-500/25 text-amber-600 hover:bg-amber-500/20"
          : currentTheme === "system"
          ? "bg-inisai-teal/10 border-inisai-teal/25 text-inisai-teal hover:bg-inisai-teal/20"
          : "bg-white/5 border-white/10 text-inisai-accent hover:text-white hover:bg-white/10"
      } ${className}`}
      title={`${getLabel()} (click to cycle Dark / Light / System)`}
      aria-label="Toggle Theme Mode"
    >
      {currentTheme === "light" ? (
        <Sun className="w-3.5 h-3.5" />
      ) : currentTheme === "system" ? (
        <Laptop className="w-3.5 h-3.5" />
      ) : (
        <Moon className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline capitalize text-[11px]">
        {currentTheme}
      </span>
    </button>
  );
};
