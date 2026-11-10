"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export const ThemeSync: React.FC = () => {
  const { user, theme, initialize } = useAuthStore();

  // Run store initialize on root mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync theme changes directly to <html> class
  useEffect(() => {
    const applyTheme = () => {
      const activeTheme = theme || user?.theme || "dark";
      let effectiveTheme = activeTheme;
      if (activeTheme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        effectiveTheme = prefersDark ? "dark" : "light";
      }

      const root = document.documentElement;
      if (effectiveTheme === "light") {
        root.classList.add("light");
        root.classList.remove("dark");
      } else {
        root.classList.add("dark");
        root.classList.remove("light");
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const activeTheme = theme || user?.theme || "dark";
      if (activeTheme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme, user?.theme]);

  return null;
};
