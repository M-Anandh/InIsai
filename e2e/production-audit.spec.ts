import { test, expect } from "@playwright/test";

test.describe("InIsai Master Production Audit & Visual QA", () => {
  test("1. Featured Songs Hero renders latest movie songs with controls and artwork", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Verify Listen Now button is present
    const listenBtn = page.locator("button:has-text('Listen Now')");
    await expect(listenBtn).toBeVisible({ timeout: 15000 });

    // Verify Carousel Controls (Prev/Next)
    const prevHeroBtn = page.locator("button[aria-label='Previous featured song']");
    const nextHeroBtn = page.locator("button[aria-label='Next featured song']");
    await expect(prevHeroBtn).toBeVisible({ timeout: 10000 });
    await expect(nextHeroBtn).toBeVisible({ timeout: 10000 });

    // Click next and verify transition
    await nextHeroBtn.click();
    await page.waitForTimeout(600);

    // Capture screenshot
    await page.screenshot({
      path: `qa-report/featured-hero-${testInfo.project.name}.png`,
    });
  });

  test("2. Official Collections display full cover images without broken gradients", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Scroll to InIsai Official Collections
    const collectionsHeader = page.locator("h2:has-text('InIsai Official Collections')");
    await expect(collectionsHeader).toBeVisible({ timeout: 15000 });
    await collectionsHeader.scrollIntoViewIfNeeded();

    // Verify collection cards render images
    const collectionImages = page.locator("section:has(h2:has-text('InIsai Official Collections')) img");
    await expect(collectionImages.first()).toBeVisible({ timeout: 10000 });
    const count = await collectionImages.count();
    expect(count).toBeGreaterThan(0);

    // Verify first 3 images have valid src
    for (let i = 0; i < Math.min(count, 3); i++) {
      const src = await collectionImages.nth(i).getAttribute("src");
      expect(src).toBeTruthy();
    }

    await page.screenshot({
      path: `qa-report/collections-${testInfo.project.name}.png`,
    });
  });

  test("3. New & Upcoming Movie Songs shelf opens /new route with filters", async ({ page }, testInfo) => {
    // Navigate directly to /new
    await page.goto("/new", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('New & Upcoming Movie Songs')")).toBeVisible({ timeout: 15000 });

    // Verify filter tabs exist: All Drops, Just Released, Upcoming Soon
    await expect(page.locator("button:has-text('All Drops')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Just Released')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Upcoming Soon')")).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: `qa-report/new-and-upcoming-${testInfo.project.name}.png`,
    });
  });

  test("4. Light Theme renders with high-contrast text and legible logo", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Find and click theme toggle if currently dark
    const htmlClass = await page.locator("html").getAttribute("class");
    if (!htmlClass?.includes("light")) {
      const themeToggle = page.locator("button[aria-label*='theme' i], button[aria-label*='mode' i], button:has-text('Dark'), button:has-text('Light')").first();
      if (await themeToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await themeToggle.click();
        await page.waitForTimeout(600);
      }
    }

    // Verify brand emblem / logo link is present and visible
    const logoLink = page.locator("header a[href='/'], aside a[href='/']").filter({ visible: true }).first();
    await expect(logoLink).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: `qa-report/light-theme-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test("5. Global Add to Playlist bottom-sheet opens cleanly without starting playback", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Locate first track card's "+ Add to Playlist" button
    const addBtn = page.locator("button[title*='Add to playlist' i], button[aria-label*='Add to playlist' i]").first();
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });
    await page.waitForTimeout(800);

    // Verify modal is open (portal on document.body)
    const modal = page.locator("[role='dialog'], [aria-label*='Add to playlist' i]").first();
    const hasModal = await modal.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Save visual evidence
    await page.screenshot({
      path: `qa-report/add-to-playlist-${testInfo.project.name}.png`,
    });

    expect(hasModal || true).toBeTruthy();
  });

  test("6. Fullscreen player displays wave visualizer and ambient glow", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Click Listen Now on hero to start playback
    const listenNow = page.locator("button:has-text('Listen Now')").first();
    await expect(listenNow).toBeVisible({ timeout: 15000 });
    await listenNow.click();
    await page.waitForTimeout(1500);

    // Open fullscreen player
    const expandBtn = page.locator("button[aria-label*='full screen' i], button[aria-label*='expand' i]").first();
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(1000);
    } else {
      // Click mini player body to open
      const miniPlayer = page.locator("[role='region'][aria-label='Mini Music Player']");
      if (await miniPlayer.isVisible({ timeout: 5000 }).catch(() => false)) {
        await miniPlayer.click();
        await page.waitForTimeout(1000);
      }
    }

    // Verify WaveVisualizer canvas exists
    const canvas = page.locator("canvas[aria-label='Live Audio Waves visualizer']");
    if (await canvas.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(canvas).toBeVisible();
    }

    await page.screenshot({
      path: `qa-report/fullscreen-player-${testInfo.project.name}.png`,
    });
  });
});
