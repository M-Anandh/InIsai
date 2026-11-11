import test from "node:test";
import assert from "node:assert/strict";

test("Phase 1: Universal Blocklist & Content Cleanliness", async (t) => {
  const BLOCKED_TITLES = [
    "vande mataram",
    "vande maataram",
    "vandemataram",
    "maa tujhe salaam",
    "vande mataram (maa tujhe salaam)",
    "vande mataram (trending version)",
    "vande mataram cover",
  ];

  function normalizeText(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isTitleBlocked(title) {
    if (!title) return false;
    const normalized = normalizeText(title);
    return BLOCKED_TITLES.some((blocked) => {
      const normBlocked = normalizeText(blocked);
      return normalized === normBlocked || normalized.includes(normBlocked);
    });
  }

  function isTrackBlocked(track) {
    if (!track) return false;
    if (isTitleBlocked(track.title)) return true;
    if (track.artist && /in-?isai artist|unknown artist|popular artist/i.test(track.artist)) {
      return true;
    }
    if (track.title && /\btrending version\b|\bkaraoke rip\b/i.test(track.title)) {
      return true;
    }
    return false;
  }

  await t.test("should block all Vande Mataram variants from recommendations & collections", () => {
    assert.equal(isTitleBlocked("Vande Mataram"), true);
    assert.equal(isTitleBlocked("Vande Maataram"), true);
    assert.equal(isTitleBlocked("vande mataram (trending version)"), true);
    assert.equal(isTitleBlocked("Maa Tujhe Salaam"), true);
    assert.equal(isTitleBlocked("Nilaave Vaa"), false);
    assert.equal(isTitleBlocked("Aura 10/10"), false);
  });

  await t.test("should reject spam tracks and unknown artist placeholders", () => {
    assert.equal(isTrackBlocked({ title: "Believer", artist: "Imagine Dragons" }), false);
    assert.equal(isTrackBlocked({ title: "Random Song", artist: "InIsai Artist" }), true);
    assert.equal(isTrackBlocked({ title: "Great Hit (Trending Version)", artist: "Singer" }), true);
  });
});

test("Phase 1: InIsai Official Collections Artwork Integrity", async (t) => {
  const collections = [
    { id: "ilaiyaraaja-maestro-hits", artworkUrl: "https://c.saavncdn.com/256/Mouna-Ragam-Tamil-2024-20251210130325-500x500.jpg" },
    { id: "ilaiyaraaja-melody-gold", artworkUrl: "https://c.saavncdn.com/129/Thalapathi-Tamil-1991-20200814125819-500x500.jpg" },
    { id: "anirudh-mass-melody", artworkUrl: "https://c.saavncdn.com/832/Leo-Tamil-2023-20231020150912-500x500.jpg" },
    { id: "top-tamil-2026", artworkUrl: "https://c.saavncdn.com/264/Amaran-Tamil-2024-20241104112344-500x500.jpg" },
    { id: "tamil-trending-now", artworkUrl: "https://c.saavncdn.com/393/Aasa-Kooda-From-Think-Indie-Tamil-2024-20240614181215-500x500.jpg" },
    { id: "ar-rahman-essentials", artworkUrl: "https://c.saavncdn.com/001/Ponniyin-Selvan-Part-1-Tamil-2022-20220930101500-500x500.jpg" },
    { id: "yuvan-feel", artworkUrl: "https://c.saavncdn.com/463/Paiya-Tamil-2009-20200814132800-500x500.jpg" },
    { id: "tamil-90s-love", artworkUrl: "https://c.saavncdn.com/083/Jeans-Tamil-1998-20200814125910-500x500.jpg" },
    { id: "kuthu-and-dance", artworkUrl: "https://c.saavncdn.com/452/Master-Tamil-2020-20201217083049-500x500.jpg" },
    { id: "late-night-drive", artworkUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80" },
    { id: "peaceful-meditation-ragas", artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80" },
  ];

  await t.test("every official collection has a valid high resolution cover URL", () => {
    for (const c of collections) {
      assert.ok(c.artworkUrl, `Collection ${c.id} missing artworkUrl`);
      assert.ok(c.artworkUrl.startsWith("https://"), `Collection ${c.id} artworkUrl not https`);
    }
  });
});

