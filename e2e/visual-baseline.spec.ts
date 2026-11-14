import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/explore", name: "explore" },
  { path: "/search", name: "search" },
  { path: "/library", name: "library" },
  { path: "/playlists", name: "playlists" },
  { path: "/liked", name: "liked" },
  { path: "/history", name: "history" },
  { path: "/local", name: "local" },
  { path: "/offline", name: "offline" },
  { path: "/settings", name: "settings" },
  { path: "/profile", name: "profile" },
  { path: "/login", name: "login" },
];

test.describe("Visual Baseline Capture", () => {
  for (const r of ROUTES) {
    test(`Capture dark baseline: ${r.name}`, async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes("mobile");
      const isLight = testInfo.project.name.includes("light");
      
      const targetDir = isLight
        ? path.join(process.cwd(), "qa-report", "light-mode", "before")
        : path.join(process.cwd(), "qa-report", "dark-baseline");

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      await page.goto(r.path, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(1000);

      // Disable animations and set deterministic theme
      await page.evaluate((themeMode) => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(themeMode);
        const style = document.createElement("style");
        style.innerHTML = "* { animation: none !important; transition: none !important; }";
        document.head.appendChild(style);
      }, isLight ? "light" : "dark");

      await page.waitForTimeout(500);

      const shotPath = path.join(
        targetDir,
        `${r.name}-${isMobile ? "mobile" : "desktop"}-${isLight ? "light" : "dark"}.png`
      );

      await page.screenshot({ path: shotPath, fullPage: true });
    });
  }
});

