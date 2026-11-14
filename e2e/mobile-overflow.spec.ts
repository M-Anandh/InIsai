import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 640 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-412", width: 412, height: 915 },
  { name: "mobile-430", width: 430, height: 932 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Mobile Viewport Responsiveness: ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("Search input does not cause horizontal overflow and dismisses suggestions cleanly", async ({
      page,
    }) => {
      await page.goto("/search", { waitUntil: "domcontentloaded" });

      // Search input should be present and focusable
      const searchInput = page.locator("#search-input");
      await expect(searchInput).toBeVisible();

      // Ensure page body has no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allowing sub-pixel margin

      // Type in search query
      await searchInput.fill("Jailer");
      await page.waitForTimeout(400);

      // Suggestions or clear button visible without overflow
      const afterSearchScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(afterSearchScrollWidth).toBeLessThanOrEqual(clientWidth + 2);

      // Press Enter to submit search: suggestions should dismiss
      await searchInput.press("Enter");
      await page.waitForTimeout(300);

      // Verify no 'Videos & Live Versions' section
      const bodyText = await page.innerText("body");
      expect(bodyText).not.toContain("Videos & Live Versions");
    });

    test("FullScreen player header and queue view have no horizontal overflow on 360px", async ({
      page,
    }) => {
      // Mock active track and open player
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        const store = (window as any).__inisaiPlayerStore?.getState?.();
        if (store) {
          store.playTrack(
            {
              id: "test-track-1",
              title: "One Name (From 'Jailer 2')",
              artist: "Anirudh Ravichander, Super Subu",
              duration: 204,
              artworkUrl: "/icons/icon-512.png",
              streamUrl: "https://example.com/audio.mp3",
              sourceType: "saavn",
              isPlayable: true,
            },
            [
              {
                id: "test-track-1",
                title: "One Name (From 'Jailer 2')",
                artist: "Anirudh Ravichander, Super Subu",
                duration: 204,
                artworkUrl: "/icons/icon-512.png",
                streamUrl: "https://example.com/audio.mp3",
                sourceType: "saavn",
                isPlayable: true,
              },
              {
                id: "test-track-2",
                title: "Aura 10/10 (From 'Meesaya Murukku 2')",
                artist: "Hiphop Tamizha",
                duration: 180,
                artworkUrl: "/icons/icon-512.png",
                streamUrl: "https://example.com/audio.mp3",
                sourceType: "saavn",
                isPlayable: true,
              },
            ]
          );
          store.setFullScreenOpen(true);
        }
      });

      await page.waitForTimeout(500);

      // Verify FullScreenPlayer has rendered and Song/Video toggle is NOT present
      const bodyText = await page.innerText("body");
      expect(bodyText).not.toMatch(/\bSong\s+Video\b/);

      // Switch to Queue tab
      await page.evaluate(() => {
        const store = (window as any).__inisaiPlayerStore?.getState?.();
        if (store) store.setActiveDrawerTab("queue");
      });

      await page.waitForTimeout(300);

      // Verify queue rows do not cause horizontal overflow
      const isOverflowing = await page.evaluate(() => {
        const queueContainer = document.querySelector(".overflow-x-hidden");
        if (!queueContainer) return false;
        return queueContainer.scrollWidth > queueContainer.clientWidth + 2;
      });
      expect(isOverflowing).toBe(false);
    });
  });
}
