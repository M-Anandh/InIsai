"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export const ThemeSync: React.FC = () => {
  const { user, initialize } = useAuthStore();

  // Run store initialize on every page mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync theme changes to html class
  useEffect(() => {
    const applyTheme = () => {
      const currentTheme = user?.theme || "dark";
      let effectiveTheme = currentTheme;
      if (currentTheme === "system") {
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
      if (user?.theme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [user?.theme]);

  return null;
};

