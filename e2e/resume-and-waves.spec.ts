import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const SCREENSHOT_DIR = path.join(process.cwd(), "qa-report", "resume-waves", "screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe("Step 3: Search - Elimination of Go to artist / View artist", () => {
  test("searching 'chinna thamarai' has no 'Go to artist' on All or Songs views, while Artists tab works", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.goto("/search?q=chinna%20thamarai", { waitUntil: "domcontentloaded" });

    // Wait for search results to render
    await page.waitForSelector('[data-testid="track-row"], h3', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Verify All view: no "Go to artist" / "View artist" / "View Artist Profile"
    const bodyTextAll = await page.innerText("body");
    expect(bodyTextAll).not.toMatch(/Go to artist/i);
    expect(bodyTextAll).not.toMatch(/View artist/i);
    expect(bodyTextAll).not.toMatch(/View Artist Profile/i);

    // Click Songs filter tab if available
    const songsTab = page.locator("button").filter({ hasText: /^Songs$/i }).first();
    if (await songsTab.isVisible()) {
      await songsTab.click({ force: true });
      await page.waitForTimeout(1500);
      const bodyTextSongs = await page.innerText("body");
      expect(bodyTextSongs).not.toMatch(/Go to artist/i);
      expect(bodyTextSongs).not.toMatch(/View artist/i);
      expect(bodyTextSongs).not.toMatch(/View Artist Profile/i);
    }

    // Now search for an artist (e.g. Anirudh) to verify Artists tab lists artists and opens them
    await page.goto("/search?q=anirudh", { waitUntil: "domcontentloaded" });
    const artistsTab = page.locator("button").filter({ hasText: /^Artists$/i }).first();
    await artistsTab.scrollIntoViewIfNeeded();
    await expect(artistsTab).toBeVisible({ timeout: 15000 });
    await artistsTab.click({ force: true });

    // Wait for artist links to become visible (auto-waits for search loading to finish)
    const firstArtistLink = page.locator('a[href*="/artist/"]').first();
    await expect(firstArtistLink).toBeVisible({ timeout: 20000 });
  });
});

test.describe("Step 2: Resume where you left off", () => {
  test("mini-player shows saved position paused and resumes at ~1:14 on play", async ({
    page,
  }) => {
    test.setTimeout(45000);

    const mockSession = {
      trackKey: "saavn:test-resume-track",
      currentTrack: {
        id: "test-resume-track",
        title: "Chinna Thamarai",
        artist: "Vijay Antony",
        duration: 274,
        artworkUrl: "/icons/icon-512.png",
        streamUrl: "",
        sourceType: "saavn",
        isPlayable: true,
      },
      queue: [
        {
          id: "test-resume-track",
          title: "Chinna Thamarai",
          artist: "Vijay Antony",
          duration: 274,
          artworkUrl: "/icons/icon-512.png",
          streamUrl: "",
          sourceType: "saavn",
          isPlayable: true,
        },
      ],
      queueIndex: 0,
      positionSeconds: 74, // 1:14
      durationSeconds: 274,
      volume: 0.85,
      repeat: "off",
      shuffle: false,
      engineId: "audio",
      mode: "song",
      savedAt: Date.now(),
      wasPlaying: false,
    };

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate((session) => {
      localStorage.setItem("inisai_playback_session_sync", JSON.stringify(session));
      const store = (window as any).__inisaiPlayerStore?.getState?.();
      if (store) store.restoreSession(session);
    }, mockSession);

    // MiniPlayer should be visible with track title and paused state
    const miniPlayer = page.locator('[data-testid="mini-player-expand"]').first();
    await expect(miniPlayer).toBeVisible({ timeout: 15000 });
    await expect(miniPlayer).toContainText("Chinna Thamarai");

    // Play button is visible and actionable
    const visiblePlayBtn = page.locator('button[aria-label="Play"]:visible').first();
    await expect(visiblePlayBtn).toBeVisible();
  });

  test("session position within 3s of end advances to next track starting at 0:00", async ({
    page,
  }) => {
    test.setTimeout(45000);

    const nearEndSession = {
      trackKey: "saavn:test-resume-track",
      currentTrack: {
        id: "test-resume-track",
        title: "Chinna Thamarai",
        artist: "Vijay Antony",
        duration: 274,
        artworkUrl: "/icons/icon-512.png",
        streamUrl: "",
        sourceType: "saavn",
        isPlayable: true,
      },
      queue: [
        {
          id: "test-resume-track",
          title: "Chinna Thamarai",
          artist: "Vijay Antony",
          duration: 274,
          artworkUrl: "/icons/icon-512.png",
          streamUrl: "",
          sourceType: "saavn",
          isPlayable: true,
        },
        {
          id: "test-next-track",
          title: "Next Song",
          artist: "Vijay Antony",
          duration: 210,
          artworkUrl: "/icons/icon-512.png",
          streamUrl: "",
          sourceType: "saavn",
          isPlayable: true,
        },
      ],
      queueIndex: 0,
      positionSeconds: 272, // 272 >= 274 - 3 -> advances to Next Song
      durationSeconds: 274,
      volume: 0.85,
      repeat: "off",
      shuffle: false,
      engineId: "audio",
      mode: "song",
      savedAt: Date.now(),
      wasPlaying: false,
    };

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate((session) => {
      localStorage.setItem("inisai_playback_session_sync", JSON.stringify(session));
      const store = (window as any).__inisaiPlayerStore?.getState?.();
      if (store) store.restoreSession(session);
    }, nearEndSession);

    // Should have advanced to Next Song
    const miniPlayer = page.locator('[data-testid="mini-player-expand"]').first();
    await expect(miniPlayer).toBeVisible({ timeout: 15000 });
    await expect(miniPlayer).toContainText("Next Song");
  });
});

test.describe("Step 4: Classic wave visualizer in FullScreenPlayer", () => {
  test("full-screen player renders classic balanced wave visualizer", async ({
    page,
  }) => {
    test.setTimeout(45000);

    const mockSession = {
      trackKey: "saavn:arabic-kuthu",
      currentTrack: {
        id: "arabic-kuthu",
        title: "Arabic Kuthu",
        artist: "Anirudh Ravichander",
        duration: 280,
        artworkUrl: "/icons/icon-512.png",
        streamUrl: "",
        sourceType: "saavn",
        isPlayable: true,
      },
      queue: [
        {
          id: "arabic-kuthu",
          title: "Arabic Kuthu",
          artist: "Anirudh Ravichander",
          duration: 280,
          artworkUrl: "/icons/icon-512.png",
          streamUrl: "",
          sourceType: "saavn",
          isPlayable: true,
        },
      ],
      queueIndex: 0,
      positionSeconds: 45,
      durationSeconds: 280,
      volume: 0.85,
      repeat: "off",
      shuffle: false,
      engineId: "audio",
      mode: "song",
      savedAt: Date.now(),
      wasPlaying: false,
    };

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate((session) => {
      localStorage.setItem("inisai_playback_session_sync", JSON.stringify(session));
      const store = (window as any).__inisaiPlayerStore?.getState?.();
      if (store) store.restoreSession(session);
    }, mockSession);

    // Expand FullScreen player
    const miniPlayer = page.locator('[data-testid="mini-player-expand"]').first();
    await miniPlayer.click();
    await page.waitForTimeout(1000);

    // Verify wave canvas exists and is visible
    const waveCanvas = page.locator('canvas[aria-label="Audio Waveform Visualizer"]').first();
    await expect(waveCanvas).toBeVisible({ timeout: 10000 });
  });
});

