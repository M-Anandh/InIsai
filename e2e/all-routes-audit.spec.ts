import { test, expect } from "@playwright/test";

const ROUTES = [
  "/",
  "/explore",
  "/search",
  "/library",
  "/playlists",
  "/liked",
  "/history",
  "/local",
  "/offline",
  "/settings",
  "/profile",
  "/login",
];

test.describe("InIsai All-Routes Audit & Zero-Crash Verification", () => {
  for (const route of ROUTES) {
    test(`Route ${route} loads cleanly without React Error #310 or Application Error`, async ({
      page,
    }, testInfo) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => {
        pageErrors.push(err.message);
      });

      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // Verify no critical layout crash screen is rendered
      const appErrorHeading = page.locator("h2:has-text('Application Error')");
      await expect(appErrorHeading).toHaveCount(0);

      const clientException = page.locator("text=/Application error: a client-side exception/i");
      await expect(clientException).toHaveCount(0);

      // Assert no React hook error #310
      const hasHookError = pageErrors.some((msg) =>
        msg.includes("310") || msg.toLowerCase().includes("rendered more hooks")
      );
      expect(hasHookError).toBe(false);

      if (route === "/") {
        const viewportName = testInfo.project.name;
        await page.screenshot({
          path: `qa-report/all-routes-home-${viewportName}.png`,
        });
      }
    });
  }

  test("Theme toggle switches reliably between dark and light mode", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const html = page.locator("html");
    const toggleBtn = page.locator("button[aria-label*='theme']").first();
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });

    // Initial state
    const initialIsDark = await html.evaluate((el) => el.classList.contains("dark"));

    // Click toggle
    await toggleBtn.click();
    await page.waitForTimeout(500);

    const toggledIsDark = await html.evaluate((el) => el.classList.contains("dark"));
    expect(toggledIsDark).not.toBe(initialIsDark);

    // Toggle back
    await toggleBtn.click();
    await page.waitForTimeout(500);
    const revertedIsDark = await html.evaluate((el) => el.classList.contains("dark"));
    expect(revertedIsDark).toBe(initialIsDark);
  });
});
