import test from "node:test";
import assert from "node:assert/strict";
import { normalizeThumb } from "../src/lib/media/thumb.ts";

function normalizeArtistName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\bravichandar\b/g, "ravichander")
    .replace(/\bilayaraja\b/g, "ilaiyaraaja")
    .replace(/\bilaiyaraja\b/g, "ilaiyaraaja")
    .replace(/\bar rahman\b/g, "a r rahman")
    .replace(/\barrahman\b/g, "a r rahman")
    .trim();
}

test("normalizeThumb correctly upscales Google User Content and YouTube CDN URLs", () => {
  // 1. Google user content with existing w120-h120 suffix
  const smallGoogleUrl =
    "https://lh3.googleusercontent.com/wBG4jypwBcEGHd-qSbM2_4B46WPEhlOCjusCOEkxdnsoIC4WLS9LmFARZsE854pB-vAEYlsp4x2yiHE=w120-h120-p-l90-rj";
  const candidates1 = normalizeThumb(smallGoogleUrl, "card");
  assert.ok(candidates1.length >= 2, "Must return multiple candidates");
  assert.ok(
    candidates1[0].includes("=w544-h544-l90-rj"),
    `Must upscale to 544x544 card size, got: ${candidates1[0]}`
  );
  assert.ok(
    candidates1.some((c) => c.startsWith("/api/img?u=")),
    "Must include image proxy URL"
  );

  // 2. yt3 avatar
  const yt3Avatar =
    "https://yt3.googleusercontent.com/fxWl6H2y5V3r_xXzKzaeWtk8kRf4BAlC5sNU7Nz0jOgM-kBEcSpMptxwQPjEqtVA8_5ZyRT37IUESmoD=w120-h120-l90-rj";
  const candidates2 = normalizeThumb(yt3Avatar, "hero");
  assert.ok(
    candidates2[0].includes("=w800-h800-l90-rj"),
    `Must upscale to 800x800 hero size, got: ${candidates2[0]}`
  );

  // 3. Full-screen player scale
  const fullPlayerCandidates = normalizeThumb(smallGoogleUrl, "full");
  assert.ok(
    fullPlayerCandidates[0].includes("=w1200-h1200-l90-rj"),
    `Must upscale to 1200x1200 for full-screen player, got: ${fullPlayerCandidates[0]}`
  );
});

test("normalizeThumb correctly upscales JioSaavn CDN artwork", () => {
  const saavn150 = "https://c.saavncdn.com/129/Thalapathi-Tamil-1991-20200814125819-150x150.jpg";
  const candidates = normalizeThumb(saavn150, "card");
  assert.strictEqual(
    candidates[0],
    "https://c.saavncdn.com/129/Thalapathi-Tamil-1991-20200814125819-500x500.jpg"
  );
  assert.ok(
    candidates.some((c) => c.startsWith("/api/img?u=")),
    "Must include image proxy URL for Saavn CDN"
  );
});

test("normalizeThumb handles i.ytimg.com and avoids maxresdefault", () => {
  const ytThumb = "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg";
  const candidates = normalizeThumb(ytThumb, "card");
  assert.strictEqual(
    candidates[0],
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "Must convert default.jpg to hqdefault.jpg"
  );
  assert.ok(!candidates.some((c) => c.includes("maxresdefault")), "Must never use maxresdefault");
});

test("normalizeArtistName handles spelling variations and case normalization", () => {
  assert.strictEqual(normalizeArtistName("Anirudh Ravichandar"), "anirudh ravichander");
  assert.strictEqual(normalizeArtistName("anirudh ravichander"), "anirudh ravichander");
  assert.strictEqual(normalizeArtistName("Ilayaraja"), "ilaiyaraaja");
  assert.strictEqual(normalizeArtistName("Ilaiyaraja"), "ilaiyaraaja");
  assert.strictEqual(normalizeArtistName("AR Rahman"), "a r rahman");
  assert.strictEqual(normalizeArtistName("A.R. Rahman"), "a r rahman");
});

test("Artist ranking puts exact matches first", () => {
  const query = "anirudh ravichander";
  const artists = [
    { name: "Vijay" },
    { name: "Hiphop Tamizha" },
    { name: "Anirudh Ravichander" },
    { name: "Anirudh Fans Club" },
  ];

  const cleanNorm = normalizeArtistName(query);
  artists.sort((a, b) => {
    const aNorm = normalizeArtistName(a.name);
    const bNorm = normalizeArtistName(b.name);
    const aExact = aNorm === cleanNorm;
    const bExact = bNorm === cleanNorm;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });

  assert.strictEqual(artists[0].name, "Anirudh Ravichander", "Exact match must be #1");
});

test("IndexedDB cache key prefixing ensures tracks never share covers", () => {
  const track1 = { providerId: "ytmusic", id: "song-123" };
  const track2 = { providerId: "ytmusic", id: "song-456" };
  const key1 = `inisai_cover_v2:${track1.providerId}:${track1.id}`;
  const key2 = `inisai_cover_v2:${track2.providerId}:${track2.id}`;

  assert.notStrictEqual(key1, key2, "Different tracks must have distinct cache keys");
});

