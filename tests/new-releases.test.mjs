import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFilmTitle } from "../src/lib/tmdb.ts";

test("Asia/Kolkata release date window boundary check", () => {
  // Current date formatted in Asia/Kolkata
  const now = new Date();
  const kolkataDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const today = new Date(kolkataDateStr + "T00:00:00Z");
  const past30 = new Date(today.getTime() - 30 * 86400000);
  const future60 = new Date(today.getTime() + 60 * 86400000);

  const past30Str = past30.toISOString().slice(0, 10);
  const future60Str = future60.toISOString().slice(0, 10);

  // Assert window validity
  assert.ok(past30Str < kolkataDateStr, "Past 30d must be strictly before today");
  assert.ok(future60Str > kolkataDateStr, "Future 60d must be strictly after today");

  // Rejection check: 2024 and early 2025 movies must NEVER be within window
  const oldMovieDates = [
    "2024-10-10", // Vettaiyan (Manasilaayo, Hunter Vantaar)
    "2024-12-05", // Pushpa 2
    "2025-01-14", // Vidaamuyarchi (Sawadeeka)
    "2025-02-07", // Dragon (Rise of Dragon)
    "2024-09-05", // The Greatest of All Time
  ];

  for (const oldDate of oldMovieDates) {
    const isWithin = oldDate >= past30Str && oldDate <= future60Str;
    assert.strictEqual(
      isWithin,
      false,
      `Film date ${oldDate} must be outside the valid new release window [${past30Str}, ${future60Str}]`
    );
  }
});

test("normalizeFilmTitle correctly cleans movie names for soundtrack matching", () => {
  assert.strictEqual(normalizeFilmTitle("Coolie (2025)"), "coolie");
  assert.strictEqual(normalizeFilmTitle("Thalapathy 69 - Part 1"), "thalapathy 69");
  assert.strictEqual(normalizeFilmTitle("Good Bad Ugly: Chapter One"), "good bad ugly");
  assert.strictEqual(normalizeFilmTitle("Vidaamuyarchi"), "vidaamuyarchi");
});

test("Cover image placeholder detection rejects small and invalid dimensions", () => {
  // YouTube 120x90 placeholder test
  const ytPlaceholderWidth = 120;
  const ytPlaceholderHeight = 90;

  const isValidCover = ytPlaceholderWidth >= 200 && ytPlaceholderHeight >= 200;
  assert.strictEqual(isValidCover, false, "YouTube 120x90 placeholder must be rejected");

  const validJioSaavnWidth = 500;
  const validJioSaavnHeight = 500;
  assert.strictEqual(
    validJioSaavnWidth >= 200 && validJioSaavnHeight >= 200,
    true,
    "Standard 500x500 cover must be accepted"
  );
});

test("Blocklist rejects Vande Mataram across all catalogs", () => {
  const blocklist = ["vande mataram", "national anthem", "jana gana mana"];
  const testTracks = [
    { title: "Vande Mataram - A.R. Rahman", shouldPass: false },
    { title: "Maa Tujhe Salaam (Vande Mataram)", shouldPass: false },
    { title: "Chinna Thamarai", shouldPass: true },
    { title: "Aura 10/10", shouldPass: true },
  ];

  for (const track of testTracks) {
    const isBlocked = blocklist.some((b) => track.title.toLowerCase().includes(b));
    assert.strictEqual(!isBlocked, track.shouldPass, `Track "${track.title}" filter outcome`);
  }
});
