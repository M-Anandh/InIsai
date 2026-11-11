/**
 * normalizeThumb: Resilient thumbnail normalizer and candidate generator for InIsai.
 *
 * Automatically upscales tiny thumbnails from YouTube Music and JioSaavn to high-resolution
 * targets, strips low-res artifacts, and returns an ordered array of candidate URLs.
 */

export type ThumbSize = "card" | "hero" | "full" | "small";

/**
 * Normalises an artwork/avatar URL and returns an ordered list of candidate URLs
 * (upscaled direct URL, proxied URL, and fallbacks).
 */
export function normalizeThumb(url?: string | null, size: ThumbSize = "card"): string[] {
  if (!url || !url.trim()) return [];

  const trimmed = url.trim();
  const candidates: string[] = [];

  // Determine target dimension based on surface
  const targetPx = size === "full" ? 1200 : size === "hero" ? 800 : size === "small" ? 120 : 544;

  // 1. Google / YouTube Music User Content & Avatar hosts
  if (
    trimmed.includes("lh3.googleusercontent.com") ||
    trimmed.includes("yt3.googleusercontent.com") ||
    trimmed.includes("yt3.ggpht.com")
  ) {
    const suffix = `=w${targetPx}-h${targetPx}-l90-rj`;
    let upscaled = trimmed;
    if (/=w\d+-h\d+[^&]*/i.test(trimmed)) {
      upscaled = trimmed.replace(/=w\d+-h\d+[^&]*/i, suffix);
    } else if (trimmed.includes("=")) {
      upscaled = trimmed.replace(/=[^&]+$/, suffix);
    } else {
      upscaled = `${trimmed}${suffix}`;
    }

    candidates.push(upscaled);
    // Add proxied version as fast resilient fallback
    candidates.push(`/api/img?u=${encodeURIComponent(upscaled)}&w=${targetPx}`);
    if (upscaled !== trimmed) {
      candidates.push(trimmed);
    }
    return Array.from(new Set(candidates));
  }

  // 2. JioSaavn CDN (c.saavncdn.com)
  if (trimmed.includes("c.saavncdn.com") || trimmed.includes("saavn.com")) {
    const upscaled = trimmed
      .replace(/-\d+x\d+\.jpg$/i, "-500x500.jpg")
      .replace(/-\d+x\d+\.png$/i, "-500x500.png");
    candidates.push(upscaled);
    candidates.push(`/api/img?u=${encodeURIComponent(upscaled)}&w=500`);
    if (upscaled !== trimmed) {
      candidates.push(trimmed);
    }
    return Array.from(new Set(candidates));
  }

  // 3. YouTube Video Thumbnail host (i.ytimg.com)
  if (trimmed.includes("i.ytimg.com")) {
    // Only use hqdefault (480x360), avoid maxresdefault (which 404s on non-HD uploads)
    // and avoid default.jpg (120x90 grey box)
    const hqUrl = trimmed
      .replace(/\/default\.jpg$/i, "/hqdefault.jpg")
      .replace(/\/mqdefault\.jpg$/i, "/hqdefault.jpg")
      .replace(/\/sddefault\.jpg$/i, "/hqdefault.jpg")
      .replace(/\/maxresdefault\.jpg$/i, "/hqdefault.jpg");
    candidates.push(hqUrl);
    candidates.push(`/api/img?u=${encodeURIComponent(hqUrl)}&w=480`);
    return Array.from(new Set(candidates));
  }

  // 4. TMDB Image CDN
  if (trimmed.includes("image.tmdb.org")) {
    const sizeStr = size === "full" || size === "hero" ? "w780" : "w500";
    const upscaled = trimmed.replace(/\/t\/p\/w\d+\//, `/t/p/${sizeStr}/`);
    candidates.push(upscaled);
    candidates.push(`/api/img?u=${encodeURIComponent(upscaled)}&w=${targetPx}`);
    return Array.from(new Set(candidates));
  }

  // Generic https image
  candidates.push(trimmed);
  if (trimmed.startsWith("https://")) {
    candidates.push(`/api/img?u=${encodeURIComponent(trimmed)}&w=${targetPx}`);
  }

  return Array.from(new Set(candidates));
}

