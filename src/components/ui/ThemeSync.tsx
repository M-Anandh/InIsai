"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export const ThemeSync: React.FC = () => {
  const { user, theme, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const applyTheme = () => {
      const activeTheme = theme || user?.theme || "system";
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

      // Sync PWA theme-color and iOS status bar cleanly
      const themeColor = effectiveTheme === "light" ? "#FBF7F1" : "#0B0A10";
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", themeColor);

      const iosStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (iosStatusBar) {
        iosStatusBar.setAttribute("content", effectiveTheme === "light" ? "default" : "black-translucent");
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const activeTheme = theme || user?.theme || "system";
      if (activeTheme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme, user?.theme]);

  return null;
};
