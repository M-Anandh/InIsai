export interface DynamicPalette {
  primary: string;
  secondary: string;
  glow: string;
}

const FALLBACK_PALETTES: DynamicPalette[] = [
  { primary: "#FF8A3D", secondary: "#7A5CFF", glow: "rgba(255, 138, 61, 0.35)" },
  { primary: "#FF3D77", secondary: "#7A5CFF", glow: "rgba(255, 61, 119, 0.35)" },
  { primary: "#7A5CFF", secondary: "#20C7E8", glow: "rgba(122, 92, 255, 0.35)" },
  { primary: "#10B981", secondary: "#7A5CFF", glow: "rgba(16, 185, 129, 0.32)" },
  { primary: "#F59E0B", secondary: "#FF3D77", glow: "rgba(245, 158, 11, 0.35)" },
];

function deterministicPalette(seed: string): DynamicPalette {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_PALETTES[Math.abs(hash) % FALLBACK_PALETTES.length];
}

/**
 * Clamp saturation and lightness so dynamic accent stays legible against both Obsidian Dark and Cream Light.
 */
function clampColorForContrast(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Boost dim dark colors cleanly up to visible vibrant accent range
  const factor = max < 110 ? 150 / Math.max(1, max) : max > 235 ? 210 / max : 1;
  const nr = Math.min(245, Math.max(40, Math.round(r * factor)));
  const ng = Math.min(245, Math.max(40, Math.round(g * factor)));
  const nb = Math.min(245, Math.max(40, Math.round(b * factor)));
  if (max - min < 20) {
    // Low-saturation grayscale cover -> return vibrant InIsai indigo/turmeric accent
    return "#7A5CFF";
  }
  return `rgb(${nr}, ${ng}, ${nb})`;
}

/**
 * Extracts dominant hue from artwork image safely with zero CORS exceptions.
 */
export async function extractArtworkPalette(
  artworkUrl: string | undefined,
  seedId: string
): Promise<DynamicPalette> {
  const fallback = deterministicPalette(seedId || artworkUrl || "inisai");
  if (typeof window === "undefined" || !artworkUrl) return fallback;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timeout = setTimeout(() => resolve(fallback), 1500);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(fallback);
          return;
        }
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (count === 0) {
          resolve(fallback);
          return;
        }
        const primary = clampColorForContrast(r / count, g / count, b / count);
        resolve({
          primary,
          secondary: fallback.secondary,
          glow: primary.replace("rgb(", "rgba(").replace(")", ", 0.35)"),
        });
      } catch {
        // Cross-origin canvas taint handled cleanly with deterministic fallback
        resolve(fallback);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(fallback);
    };

    img.src = artworkUrl;
  });
}
