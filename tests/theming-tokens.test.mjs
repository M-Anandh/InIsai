import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("globals.css defines surface scopes and semantic tokens", () => {
  const css = fs.readFileSync(path.join(rootDir, "src/app/globals.css"), "utf8");

  // Must define surface scopes
  assert.ok(css.includes(".surface"), "globals.css should define .surface");
  assert.ok(css.includes(".surface-dark"), "globals.css should define .surface-dark");
  assert.ok(css.includes('[data-surface="dark"]'), "globals.css should define [data-surface=\"dark\"]");

  // Must isolate fullscreen player
  assert.ok(css.includes("#fullscreen-player-root"), "globals.css should isolate #fullscreen-player-root");

  // Must define high-contrast accent tokens for light mode
  assert.ok(css.includes("--accent-text"), "globals.css should define --accent-text");
  assert.ok(css.includes("--accent-hot-text"), "globals.css should define --accent-hot-text");

  // Must NOT contain destructive blanket overrides that break headers or cards across light mode
  assert.ok(
    !css.includes("html.light h1, html.light h2, html.light h3"),
    "globals.css must not have blanket html.light h1-h3 color overrides"
  );
});

test("FullScreenPlayer isolates dark surface", () => {
  const player = fs.readFileSync(
    path.join(rootDir, "src/components/player/FullScreenPlayer.tsx"),
    "utf8"
  );
  assert.ok(
    player.includes('id="fullscreen-player-root"'),
    "FullScreenPlayer must have id='fullscreen-player-root'"
  );
  assert.ok(
    player.includes('data-surface="dark"'),
    "FullScreenPlayer must have data-surface='dark'"
  );
  assert.ok(
    player.includes("surface-dark"),
    "FullScreenPlayer must include surface-dark class"
  );
});

test("BackNavigation has visible light and dark styling", () => {
  const backNav = fs.readFileSync(
    path.join(rootDir, "src/components/layout/BackNavigation.tsx"),
    "utf8"
  );
  assert.ok(
    backNav.includes("text-slate-800") && backNav.includes("dark:text-white"),
    "BackNavigation must have visible text contrast in both light and dark mode"
  );
});

test("Profile page correctly resolves theme mode for guest and users", () => {
  const profile = fs.readFileSync(
    path.join(rootDir, "src/app/profile/page.tsx"),
    "utf8"
  );
  // Must read theme from store, not just user?.theme
  assert.ok(
    profile.includes("theme") && profile.includes("useAuthStore()"),
    "Profile page must destructure theme from useAuthStore"
  );
  assert.ok(
    !profile.includes('const isLight = mounted && user?.theme === "light";'),
    "Profile page must not rely solely on user?.theme for guest theme detection"
  );
});

test("CoverImage supports light mode default SVG assets", () => {
  const coverImage = fs.readFileSync(
    path.join(rootDir, "src/components/ui/CoverImage.tsx"),
    "utf8"
  );
  assert.ok(
    coverImage.includes("/covers/light/default-"),
    "CoverImage must support /covers/light/default- SVGs in light mode"
  );
});

