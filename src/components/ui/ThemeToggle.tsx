"use client";

import React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { user, toggleTheme } = useAuthStore();
  const mounted = useMounted();

  const isLight = mounted && user?.theme === "light";

  return (
    <button
      onClick={() => toggleTheme()}
      className={`p-2 rounded-xl transition-all border ${
        isLight
          ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
          : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
      } ${className}`}
      title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
      aria-label="Toggle Theme"
    >
      {isLight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

