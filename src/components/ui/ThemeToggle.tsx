"use client";

import React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC<{ className?: string; showLabelOnMobile?: boolean }> = ({
  className = "",
  showLabelOnMobile = false,
}) => {
  const { user, theme, toggleTheme } = useAuthStore();
  const mounted = useMounted();

  const currentTheme = mounted ? theme || user?.theme || "dark" : "dark";
  const isLight = currentTheme === "light";

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Instant, direct 1-click toggle between Dark and Light
    if (isLight) {
      toggleTheme("dark");
    } else {
      toggleTheme("light");
    }
  };

  const label = isLight ? "Light" : "Dark";

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold transition-all border active:scale-95 cursor-pointer select-none shadow-sm ${
        isLight
          ? "bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20"
          : "bg-white/5 border-white/10 text-inisai-accent hover:text-white hover:bg-white/10"
      } ${className}`}
      title={`Theme: ${label} (Click to toggle ${isLight ? "Dark" : "Light"} mode)`}
      aria-label="Toggle Theme Mode"
    >
      {isLight ? (
        <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
      ) : (
        <Moon className="w-4 h-4 text-purple-400" />
      )}
      <span className={`${showLabelOnMobile ? "inline" : "hidden sm:inline"} capitalize text-[11px]`}>
        {label}
      </span>
    </button>
  );
};
