import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

interface ContrastFailure {
  route: string;
  viewport: string;
  theme: string;
  selector: string;
  textSnippet: string;
  fontSize: string;
  fontWeight: string;
  color: string;
  worstBgColor: string;
  contrastRatio: number;
  requiredRatio: number;
}

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

const allFailures: ContrastFailure[] = [];

test.describe("Pixel-Based WCAG Contrast Checker", () => {
  test.afterAll(() => {
    const reportDir = path.join(process.cwd(), "qa-report", "light-mode");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const outputPath = path.join(reportDir, "contrast-failures.json");
    fs.writeFileSync(outputPath, JSON.stringify(allFailures, null, 2));
    console.log(`\n======================================================`);
    console.log(`[WCAG PIXEL CONTRAST AUDIT] Total failures recorded: ${allFailures.length}`);
    console.log(`Report written to ${outputPath}`);
    console.log(`======================================================\n`);
  });

  for (const r of ROUTES) {
    test(`Verify pixel contrast for ${r.name}`, async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes("mobile");
      const isLight = testInfo.project.name.includes("light");
      const theme = isLight ? "light" : "dark";
      const viewportName = isMobile ? "mobile" : "desktop";

      await page.goto(r.path, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(800);

      // Deterministically set theme and remove animations
      await page.evaluate((th) => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(th);
        const style = document.createElement("style");
        style.id = "__contrast_test_style";
        style.innerHTML = "* { animation: none !important; transition: none !important; }";
        document.head.appendChild(style);
      }, theme);

      await page.waitForTimeout(400);

      // Collect bounding boxes and text colors before hiding text
      const elementsToAudit = await page.evaluate(() => {
        const results: Array<{
          id: number;
          selector: string;
          text: string;
          fontSize: number;
          fontWeight: number;
          computedColor: string;
          box: { x: number; y: number; width: number; height: number };
        }> = [];

        let idCounter = 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
          acceptNode(node: Node) {
            const el = node as HTMLElement;
            if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH"].includes(el.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        });

        let current = walker.nextNode() as HTMLElement | null;
        while (current) {
          const style = window.getComputedStyle(current);
          const rect = current.getBoundingClientRect();

          // Only audit visible elements with non-empty direct text or meaningful buttons/inputs
          let hasDirectText = false;
          let textContent = "";
          for (let i = 0; i < current.childNodes.length; i++) {
            const child = current.childNodes[i];
            if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
              hasDirectText = true;
              textContent += child.textContent.trim() + " ";
            }
          }

          if (hasDirectText && rect.width > 4 && rect.height > 4 && rect.bottom > 0 && rect.top < window.innerHeight * 2.5) {
            results.push({
              id: idCounter++,
              selector: current.tagName.toLowerCase() + (current.className ? "." + String(current.className).trim().split(/\s+/)[0] : ""),
              text: textContent.trim().slice(0, 50),
              fontSize: parseFloat(style.fontSize) || 14,
              fontWeight: parseInt(style.fontWeight, 10) || 400,
              computedColor: style.color,
              box: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            });
          }
          current = walker.nextNode() as HTMLElement | null;
        }

        return results;
      });

      // Now hide text and take screenshot to capture background-only pixels
      await page.evaluate(() => {
        const textHider = document.createElement("style");
        textHider.id = "__text_hider";
        textHider.innerHTML = `
          * {
            -webkit-text-fill-color: transparent !important;
            text-shadow: none !important;
          }
        `;
        document.head.appendChild(textHider);
      });

      await page.waitForTimeout(200);
      const bgScreenshotB64 = (await page.screenshot({ fullPage: false })).toString("base64");

      // Remove text hider
      await page.evaluate(() => {
        document.getElementById("__text_hider")?.remove();
      });

      // In browser canvas context, sample background pixels and compute contrast
      const elementContrasts = await page.evaluate(
        async ({ items, b64 }) => {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = "data:image/png;base64," + b64;
          });

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(img, 0, 0);

          function parseRgba(colStr: string): [number, number, number, number] {
            const m = colStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (!m) return [255, 255, 255, 1];
            return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), m[4] !== undefined ? parseFloat(m[4]) : 1];
          }

          function toLuminance(r: number, g: number, b: number): number {
            const a = [r, g, b].map((v) => {
              const s = v / 255;
              return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
          }

          function getContrast(l1: number, l2: number): number {
            const lighter = Math.max(l1, l2);
            const darker = Math.min(l1, l2);
            return (lighter + 0.05) / (darker + 0.05);
          }

          const findings: Array<{
            id: number;
            worstBgColor: string;
            contrastRatio: number;
            requiredRatio: number;
          }> = [];

          for (const item of items) {
            const box = item.box;
            if (box.x < 0 || box.y < 0 || box.x + box.width > img.width || box.y + box.height > img.height) {
              continue;
            }

            // Sample points across bounding box
            const samplePoints: Array<[number, number, number]> = [];
            const stepX = Math.max(2, Math.floor(box.width / 5));
            const stepY = Math.max(2, Math.floor(box.height / 3));

            for (let sy = box.y + 2; sy < box.y + box.height; sy += stepY) {
              for (let sx = box.x + 2; sx < box.x + box.width; sx += stepX) {
                if (sx < img.width && sy < img.height) {
                  const pixel = ctx.getImageData(sx, sy, 1, 1).data;
                  samplePoints.push([pixel[0], pixel[1], pixel[2]]);
                }
              }
            }

            if (samplePoints.length === 0) continue;

            const [tr, tg, tb, ta] = parseRgba(item.computedColor);

            // Compute contrast for 5th and 95th percentile luminance
            const lums = samplePoints.map((p) => toLuminance(p[0], p[1], p[2])).sort((a, b) => a - b);
            const p5 = lums[Math.floor(lums.length * 0.05)];
            const p95 = lums[Math.floor(lums.length * 0.95)];

            // Composite text color over background
            const avgBg = samplePoints[Math.floor(samplePoints.length / 2)];
            const compR = Math.round(tr * ta + avgBg[0] * (1 - ta));
            const compG = Math.round(tg * ta + avgBg[1] * (1 - ta));
            const compB = Math.round(tb * ta + avgBg[2] * (1 - ta));
            const textLum = toLuminance(compR, compG, compB);

            const ratioP5 = getContrast(textLum, p5);
            const ratioP95 = getContrast(textLum, p95);
            const worstRatio = Math.min(ratioP5, ratioP95);

            const isLargeText = item.fontSize >= 24 || (item.fontSize >= 18.66 && item.fontWeight >= 700);
            const required = isLargeText ? 3.0 : 4.5;

            findings.push({
              id: item.id,
              worstBgColor: `rgb(${avgBg[0]}, ${avgBg[1]}, ${avgBg[2]})`,
              contrastRatio: Math.round(worstRatio * 100) / 100,
              requiredRatio: required,
            });
          }

          return findings;
        },
        { items: elementsToAudit, b64: bgScreenshotB64 }
      );

      for (const finding of elementContrasts) {
        if (finding.contrastRatio < finding.requiredRatio) {
          const el = elementsToAudit.find((e) => e.id === finding.id);
          if (el) {
            allFailures.push({
              route: r.path,
              viewport: viewportName,
              theme,
              selector: el.selector,
              textSnippet: el.text,
              fontSize: `${el.fontSize}px`,
              fontWeight: String(el.fontWeight),
              color: el.computedColor,
              worstBgColor: finding.worstBgColor,
              contrastRatio: finding.contrastRatio,
              requiredRatio: finding.requiredRatio,
            });
          }
        }
      }
    });
  }
});

