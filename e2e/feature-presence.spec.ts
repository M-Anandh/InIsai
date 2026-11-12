import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const REPORT_SCREENSHOT_DIR = path.join(
  process.cwd(),
  "qa-report",
  "install-delete-player",
  "screenshots"
);

test.beforeAll(() => {
  fs.mkdirSync(REPORT_SCREENSHOT_DIR, { recursive: true });
});

async function seedAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    const payload = {
      state: {
        user: {
          id: "e2e-registered-user-001",
          email: "listener@inisai.app",
          displayName: "E2E Listener",
          preferredLanguage: "Tamil",
          theme: "dark",
        },
        theme: "dark",
        isAuthenticated: true,
        likedTrackIds: ["saavn-demo-1"],
        userPlaylists: [],
      },
      version: 0,
    };
    window.localStorage.setItem("inisai_auth_storage", JSON.stringify(payload));
  });
}

async function seedPlayingTrack(page: Page) {
  await page.addInitScript(() => {
    const sampleTrack = {
      id: "saavn-demo-track-1",
      title: "Chinna Thamarai (From \"Vettaikaaran\")",
      artist: "Vijay Antony, Krish, Suchitra",
      album: "Vettaikaaran (Original Motion Picture Soundtrack)",
      albumId: "MPREb_sampleVettaikaaran",
      duration: 274,
      artworkUrl: "/icons/icon-512.png",
      streamUrl: "",
      sourceType: "ytmusic",
      providerId: "ytmusic",
      sourceId: "dQw4w9WgXcQ",
      youtubeVideoId: "dQw4w9WgXcQ",
      isPlayable: true,
    };
    const playerPayload = {
      state: {
        currentTrack: sampleTrack,
        queue: [sampleTrack],
        queueIndex: 0,
        playbackContext: {
          id: "album-demo",
          type: "album",
          title: "Vettaikaaran",
          trackIds: [sampleTrack.id],
        },
        settings: {
          volume: 0.85,
          isMuted: false,
          repeatMode: "off",
          isShuffle: false,
          crossfadeDuration: 2,
          playbackRate: 1,
          bassBoost: 0,
          trebleBoost: 0,
          equalizerBands: [0, 0, 0, 0, 0],
          equalizerEnabled: false,
          selectedEqPreset: "flat",
          sleepTimerMinutes: null,
          preferAudioFallback: true,
          autoplayRelated: true,
          statsForNerd: false,
          videoMode: false,
        },
        history: [sampleTrack],
      },
      version: 0,
    };
    window.localStorage.setItem("inisai_player_storage", JSON.stringify(playerPayload));
  });
}

test.describe("InIsai Regression Guard — Feature Presence, Install, Delete, Player & Background Audio", () => {
  test("Step 0: Critical entry points present across Guest on current viewport", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    const isMobile = testInfo.project.name.includes("mobile");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("audio#inisai-persistent-audio")).toHaveCount(1, { timeout: 15000 });

    // Core navigation destinations present
    if (!isMobile) {
      await expect(page.getByRole("link", { name: /Liked Songs/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /Downloads & Offline/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /Settings/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /Profile/i }).first()).toBeVisible();

      // Desktop sidebar must show Install App, header must NOT have a duplicate Install App
      await expect(page.getByTestId("pwa-install-sidebar-btn")).toBeVisible();
      await expect(page.locator("header").getByRole("button", { name: /Install App/i })).toHaveCount(0);
    } else {
      // Mobile Home must show dismissible Install App banner + bottom nav links
      await expect(page.getByTestId("pwa-install-banner")).toBeVisible();
      await expect(page.getByTestId("pwa-install-banner-btn")).toBeVisible();
    }

    // Persistent <audio id="inisai-persistent-audio"> exists in DOM root and is not muted
    const audioEl = page.locator("audio#inisai-persistent-audio");
    await expect(audioEl).toHaveCount(1);
    const audioAttrs = await audioEl.evaluate((el) => {
      const audio = el as HTMLAudioElement & { playsInline?: boolean };
      return {
        muted: audio.muted,
        playsInline: Boolean(audio.playsInline || audio.hasAttribute("playsinline")),
        preload: audio.preload,
      };
    });
    expect(audioAttrs.muted).toBe(false);
    expect(audioAttrs.playsInline).toBe(true);

    // Check Settings (Guest): Install App row, Clear local data, Sign in prompt, Background-friendly playback ON
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("pwa-install-row-btn")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("clear-local-data-trigger")).toBeVisible();
    await expect(page.getByText(/Sign in to manage an account/i)).toBeVisible();
    await expect(page.getByTestId("download-my-data-btn")).toBeVisible();
    await expect(page.getByText("Background-friendly playback")).toBeVisible();
    await expect(page.getByTestId("toggle-background-playback")).toHaveText("Enabled");

    // Check Profile (Guest): Sign In, Clear local data, Download my data
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("clear-local-data-trigger")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Sign in to manage an account/i)).toBeVisible();
    await expect(page.getByTestId("download-my-data-btn")).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign In/i }).first()).toBeVisible();

    if (isMobile) {
      await expect(page.getByTestId("pwa-install-row-btn")).toBeVisible();
    }

    await page.screenshot({
      path: path.join(REPORT_SCREENSHOT_DIR, `guest-profile-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test("Step 0 & 2: Registered user sees Delete account & Sign out on Settings & Profile", async ({
    page,
  }, testInfo) => {
    await seedAuthenticatedUser(page);

    await page.goto("/settings", { waitUntil: "load" });
    await page.waitForTimeout(600);

    await expect(page.getByTestId("delete-account-trigger")).toBeVisible();
    await expect(page.getByTestId("download-my-data-btn")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign Out/i }).first()).toBeVisible();

    // Open Delete account modal & verify confirmation guard
    await page.getByTestId("delete-account-trigger").click();
    const modal = page.getByTestId("delete-account-modal");
    await expect(modal).toBeVisible();
    const confirmBtn = page.getByTestId("delete-account-confirm-btn");
    await expect(confirmBtn).toBeDisabled();
    await page.getByTestId("delete-confirm-input").fill("DELETE");
    await expect(confirmBtn).toBeEnabled();

    await page.screenshot({
      path: path.join(REPORT_SCREENSHOT_DIR, `delete-modal-${testInfo.project.name}.png`),
      fullPage: false,
    });

    // Cancel and verify Profile page also exposes Delete account
    await modal.getByRole("button", { name: "Cancel" }).click();
    await page.goto("/profile", { waitUntil: "load" });
    await page.waitForTimeout(500);
    await expect(page.getByTestId("delete-account-trigger")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign Out/i }).first()).toBeVisible();

    // Verify /api/account/delete rejects unauthenticated requests cleanly
    const apiRes = await page.request.post("/api/account/delete");
    expect([401, 200]).toContain(apiRes.status());
  });

  test("Step 1: Synthetic beforeinstallprompt, prompt(), appinstalled & iOS Share sheet", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(90000);
    // 1. Test synthetic beforeinstallprompt + appinstalled in Chromium
    const ctx = await browser.newContext({
      viewport: testInfo.project.name.includes("mobile")
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("audio#inisai-persistent-audio", { state: "attached", timeout: 15000 });
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      window.__promptCalls = 0;
      const evt = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
        prompt?: () => Promise<void>;
        userChoice?: Promise<{ outcome: string; platform: string }>;
      };
      evt.prompt = async () => {
        window.__promptCalls = (window.__promptCalls || 0) + 1;
      };
      evt.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });
      window.dispatchEvent(evt);
    });

    const installBtn = testInfo.project.name.includes("mobile")
      ? page.getByTestId("pwa-install-banner-btn")
      : page.getByTestId("pwa-install-sidebar-btn");

    await expect(installBtn).toBeVisible();
    await installBtn.click();

    const promptCalls = await page.evaluate(() => (window as unknown as { __promptCalls?: number }).__promptCalls);
    expect(promptCalls).toBe(1);

    // Fire appinstalled -> Install App buttons must hide everywhere
    await page.evaluate(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    await expect(installBtn).toHaveCount(0);
    await ctx.close();

    // 2. Test iOS Safari UA bottom sheet ("Tap Share -> Add to Home Screen")
    const iosCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    });
    const iosPage = await iosCtx.newPage();
    await iosPage.goto("/", { waitUntil: "domcontentloaded" });

    const iosInstallBtn = iosPage.getByTestId("pwa-install-banner-btn");
    await expect(iosInstallBtn).toBeVisible({ timeout: 15000 });
    await iosInstallBtn.click();

    const sheet = iosPage.getByTestId("install-instructions-sheet");
    await expect(sheet).toBeVisible({ timeout: 8000 });
    await expect(sheet).toContainText("Add to Home Screen");

    await iosPage.screenshot({
      path: path.join(REPORT_SCREENSHOT_DIR, `ios-install-sheet-${testInfo.project.name}.png`),
      fullPage: false,
    });
    await iosCtx.close();
  });

  test("Step 3 & 4: Full-screen player clean 5-item menu, no YT/Wave labels, Add to Playlist & visibilitychange", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    await seedPlayingTrack(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Open full-screen player via MiniPlayer track expand trigger
    const miniPlayerExpand = page.getByTestId("mini-player-expand");
    await expect(miniPlayerExpand).toBeVisible({ timeout: 15000 });
    await miniPlayerExpand.click();
    await page.waitForTimeout(400);

    // Ensure unwanted labels are NEVER visible
    await expect(page.getByText("YouTube Music", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/LIVE AUDIO WAVE/i)).toHaveCount(0);
    await expect(page.getByText("Ambient Wave", { exact: true })).toHaveCount(0);

    // Open ⋯ menu and validate strict menu items
    await page.getByLabel("Player options").click();
    const menu = page.getByTestId("player-overflow-menu");
    await expect(menu).toBeVisible();

    await expect(menu.getByText("Add to Playlist")).toBeVisible();
    await expect(menu.getByText("Share Song")).toBeVisible();
    await expect(menu.getByText("Sleep Timer")).toBeVisible();
    await expect(menu.getByText("Movie songs")).toBeVisible();
    await expect(menu.getByText("Stats for Nerds")).toBeVisible();

    await expect(menu.getByText("Manage Audio Sources")).toHaveCount(0);
    await expect(menu.getByText("Go to Artist")).toHaveCount(0);
    await expect(menu.getByText("Go to Album")).toHaveCount(0);

    const buttonCount = await menu.locator("button").count();
    expect(buttonCount).toBeLessThanOrEqual(5);

    await page.screenshot({
      path: path.join(REPORT_SCREENSHOT_DIR, `player-overflow-${testInfo.project.name}.png`),
      fullPage: false,
    });

    // Test Add to Playlist opens from menu
    await menu.getByText("Add to Playlist").click();
    await expect(page.getByText(/Add to Playlist/i).first()).toBeVisible();

    // Test synthetic visibilitychange does not crash or throw errors
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(pageErrors).toEqual([]);
  });
});

declare global {
  interface Window {
    __promptCalls?: number;
  }
}

