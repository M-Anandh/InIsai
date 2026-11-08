"use client";

import React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { Sun, Moon, Laptop } from "lucide-react";

export const ThemeToggle: React.FC<{ className?: string; showLabelOnMobile?: boolean }> = ({
  className = "",
  showLabelOnMobile = false,
}) => {
  const { user, theme, toggleTheme } = useAuthStore();
  const mounted = useMounted();

  const currentTheme = mounted ? theme || user?.theme || "dark" : "dark";

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
    if (currentTheme === "dark") return "Dark";
    if (currentTheme === "light") return "Light";
    return "Auto";
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold transition-all border active:scale-95 cursor-pointer select-none shadow-sm ${
        currentTheme === "light"
          ? "bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20"
          : currentTheme === "system"
          ? "bg-inisai-teal/10 border-inisai-teal/30 text-inisai-teal hover:bg-inisai-teal/20"
          : "bg-white/5 border-white/10 text-inisai-accent hover:text-white hover:bg-white/10"
      } ${className}`}
      title={`Theme: ${getLabel()} (Click to toggle Dark / Light / System)`}
      aria-label="Toggle Theme Mode"
    >
      {currentTheme === "light" ? (
        <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
      ) : currentTheme === "system" ? (
        <Laptop className="w-4 h-4 text-inisai-teal" />
      ) : (
        <Moon className="w-4 h-4 text-purple-400" />
      )}
      <span className={`${showLabelOnMobile ? "inline" : "hidden sm:inline"} capitalize text-[11px]`}>
        {getLabel()}
      </span>
    </button>
  );
};
