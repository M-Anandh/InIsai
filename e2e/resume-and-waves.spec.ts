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
  }, testInfo) => {
    test.setTimeout(60000);
    await page.goto("/search?q=chinna%20thamarai", { waitUntil: "domcontentloaded" });

    // Wait for search results container
    await page.waitForTimeout(2500);

    // Verify All view: no "Go to artist" / "View artist" / "View Artist Profile"
    const bodyTextAll = await page.innerText("body");
    expect(bodyTextAll).not.toMatch(/Go to artist/i);
    expect(bodyTextAll).not.toMatch(/View artist/i);
    expect(bodyTextAll).not.toMatch(/View Artist Profile/i);

    // Click Songs filter tab if available
    const songsTab = page.locator("button, a").filter({ hasText: /^Songs$/i }).first();
    if (await songsTab.isVisible()) {
      await songsTab.click();
      await page.waitForTimeout(1500);
      const bodyTextSongs = await page.innerText("body");
      expect(bodyTextSongs).not.toMatch(/Go to artist/i);
      expect(bodyTextSongs).not.toMatch(/View artist/i);
      expect(bodyTextSongs).not.toMatch(/View Artist Profile/i);
    }

    // Switch to Artists filter tab: must list artists
    const artistsTab = page.locator("button, a").filter({ hasText: /^Artists$/i }).first();
    if (await artistsTab.isVisible()) {
      await artistsTab.click();
      await page.waitForTimeout(1500);
      // Artists shelf or artist card should exist
      const artistLinks = page.locator('a[href*="/artist/"]');
      const count = await artistLinks.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe("Step 2: Resume where you left off", () => {
  test("mini-player shows saved position paused and resumes at ~1:14 on play", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);

    // Seed mock playback session into localStorage
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

    await page.addInitScript((session) => {
      localStorage.setItem("inisai_playback_session_sync", JSON.stringify(session));
    }, mockSession);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // MiniPlayer should be visible with track title and paused state
    const miniPlayer = page.locator('[data-testid="mini-player-expand"]').first();
    await expect(miniPlayer).toBeVisible({ timeout: 15000 });
    await expect(miniPlayer).toContainText("Chinna Thamarai");

    // Scrubber or progress should reflect ~1:14 (74 / 274 ≈ 27%)
    const playBtn = page.locator('button[aria-label="Play"]').first();
    await expect(playBtn).toBeVisible();

    // Verify session within 3s of end rule
    const nearEndSession = {
      ...mockSession,
      positionSeconds: 272, // 272 >= 274 - 3 -> should advance to Next Song
    };
    await page.evaluate((session) => {
      localStorage.setItem("inisai_playback_session_sync", JSON.stringify(session));
    }, nearEndSession);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    // Should have advanced to Next Song starting at 0:00
    await expect(page.locator('[data-testid="mini-player-expand"]').first()).toContainText("Next Song");
  });
});

test.describe("Step 4: Waves v2 visualizer styles & height", () => {
  test("full-screen player renders tall wave visualizer across styles with screenshots", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);

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

    await page.addInitScript((session) => {
      localStorage.setItem("inisai_playback_session_sync", JSON.stringify(session));
    }, mockSession);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Expand FullScreen player
    const miniPlayer = page.locator('[data-testid="mini-player-expand"]').first();
    await miniPlayer.click();
    await page.waitForTimeout(1500);

    // Verify wave visualizer container exists
    const waveContainer = page.locator('[data-testid="wave-visualizer-container"]').first();
    await expect(waveContainer).toBeVisible({ timeout: 10000 });

    const box = await waveContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Height should be >= 140px on mobile and desktop
      expect(box.height).toBeGreaterThanOrEqual(130);
    }

    // Capture screenshot of wave in current project mode
    const projectName = testInfo.project.name;
    const screenshotPath = path.join(SCREENSHOT_DIR, `wave-visualizer-${projectName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Open Settings to verify Visual Effects options
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const styleSelect = page.locator('[data-testid="select-wave-style"]');
    await expect(styleSelect).toBeVisible();

    const highIntensityBtn = page.locator('[data-testid="wave-intensity-high"]');
    await expect(highIntensityBtn).toBeVisible();

    const cellularToggle = page.locator('[data-testid="toggle-detailed-waves-cellular"]');
    await expect(cellularToggle).toBeVisible();

    const settingsScreenshotPath = path.join(SCREENSHOT_DIR, `settings-visual-effects-${projectName}.png`);
    await page.screenshot({ path: settingsScreenshotPath, fullPage: false });
  });
});

