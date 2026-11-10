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

  const resolvedTheme = (() => {
    if (!mounted) return "dark";
    const active = theme || user?.theme || "system";
    if (active === "system" && typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return active === "light" ? "light" : "dark";
  })();

  const isLight = resolvedTheme === "light";

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextMode = isLight ? "dark" : "light";
    const doc = document as any;

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--theme-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--theme-y", `${e.clientY}px`);
    }

    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doc.startViewTransition(() => {
        toggleTheme(nextMode);
      });
    } else {
      toggleTheme(nextMode);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center justify-center space-x-1.5 min-w-[40px] min-h-[40px] px-2.5 rounded-xl text-xs font-semibold transition-all border active:scale-95 cursor-pointer select-none shadow-sm ${
        isLight
          ? "bg-amber-500/10 border-amber-600/25 text-amber-800 hover:bg-amber-500/20"
          : "bg-white/5 border-white/10 text-inisai-turmeric hover:text-white hover:bg-white/10"
      } ${className}`}
      title={`Switch to ${isLight ? "Dark" : "Light"} theme`}
      aria-label={`Switch to ${isLight ? "Dark" : "Light"} theme`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isLight ? (
          <Sun className="w-4 h-4 text-amber-600 transition-transform duration-300 rotate-0" />
        ) : (
          <Moon className="w-4 h-4 text-[#FF8A3D] transition-transform duration-300 rotate-0" />
        )}
      </div>
      <span className={`${showLabelOnMobile ? "inline" : "hidden sm:inline"} capitalize text-[11px]`}>
        {isLight ? "Light" : "Dark"}
      </span>
    </button>
  );
};
