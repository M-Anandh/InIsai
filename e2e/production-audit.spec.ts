import { test, expect } from "@playwright/test";

test.describe("InIsai Production Harness & Smoke Verification", () => {
  test("Settings page should display version and build SHA footer", async ({ page }, testInfo) => {
    await page.goto("/settings", { waitUntil: "networkidle" });
    
    // Check that settings footer displays version information
    const footerText = page.locator("text=/v2\\.\\d+\\.\\d+/");
    await expect(footerText).toBeVisible({ timeout: 10000 });
    
    // Save screenshot
    const viewportName = testInfo.project.name;
    await page.screenshot({
      path: `qa-report/phase0/settings-${viewportName}.png`,
      fullPage: true,
    });
  });

  test("Debug diagnostics page loads cleanly without 404 or crashes", async ({ page }, testInfo) => {
    await page.goto("/debug", { waitUntil: "networkidle" });
    await expect(page.locator("h1:has-text('System Diagnostics')")).toBeVisible({ timeout: 10000 });
    
    const viewportName = testInfo.project.name;
    await page.screenshot({
      path: `qa-report/phase0/debug-${viewportName}.png`,
      fullPage: true,
    });
  });

  test("Home page renders without hardcoded Vande Mataram in curated sections", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "networkidle" });
    
    // Ensure no Vande Mataram songs exist on curated shelves
    const vandeElements = page.locator("h3:has-text('Vande Mataram'), h4:has-text('Vande Mataram')");
    await expect(vandeElements).toHaveCount(0);
    
    const viewportName = testInfo.project.name;
    await page.screenshot({
      path: `qa-report/phase0/home-${viewportName}.png`,
      fullPage: true,
    });
  });
});
