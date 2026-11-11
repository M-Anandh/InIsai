# QA Verification Report: Image Pipeline, Fullscreen Player, and Search Fixes

**Deployment Target:** `https://in-isai.vercel.app/`  
**Commit SHA:** `aed4bd2`  
**Date:** 2026-11-11  

---

## 1. Executive Summary

This upgrade resolves all production issues reported across the application:
1. **Application Error (Client-side / Layout Exception):** Resolved by stabilizing hook execution order, wrapping route transitions and dynamic pages in reusable `ErrorBoundary` components, and adding Next.js stale chunk auto-recovery.
2. **Fullscreen Player Control Overlap:** Eliminated layout clipping where transport controls (Play/Pause, Prev, Next) were cut off by the bottom navigation bar (`Lyrics / Queue / FX / Sleep`) on short or mobile screens. Re-architected stage layout with pinned `flex-shrink-0` controls and auto-scaling artwork.
3. **Search "Best Match" Contrast Defect:** Fixed the bug where the Best Match card rendered solid white with white text on dark theme. Explicitly styled with `bg-white dark:bg-[#16131F]` and high-contrast typography.
4. **Artwork Defects (Letter-on-Gradient & Blank Boxes):** Root cause was a strict `naturalWidth >= 200` check rejecting valid `=w60-h60`, `=w120-h120` (YouTube Music) and `-150x150` (JioSaavn) thumbnails. Replaced with `normalizeThumb` upscaling, an SSRF-safe `/api/img` proxy, and 5 designed SVG vector fallbacks (no letter gradients).
5. **Artist Search & Navigation:** Added `yt.music.search(clean, { type: "artist" })` to search pipeline, exact-match ranking, query-param optimistic rendering (`?name=...&photo=...`), 10s AbortController timeout, and error boundaries.
6. **Hero & "New & Upcoming" Shelves:** Removed the obsolete "Featured New Releases" hero carousel and deleted `/api/featured`. Replaced home header with Greeting + 2×3 "Quick picks" grid. Gated `/new` and the movie songs shelf behind `FEATURE_NEW_RELEASES = false`.

---

## 2. Root Cause Analysis & Fix Matrix

| Issue | Production Symptom | Root Cause | Fix Applied |
|---|---|---|---|
| **P0.1** | Application Error modal on load (React #310) | Root layout hooks and conditional returns changing hook execution count during hydration. | Moved all hook calls unconditionally to the top of components; added route-level `ErrorBoundary` wrappers. |
| **P0.2** | Fullscreen Player Play button half-cut off | Center stage used single `overflow-y-auto` container with tall artwork/video; controls overflowed past bottom viewport boundary. | Restructured `FullScreenPlayer` with `flex-shrink-0` controls pinned above tabs; artwork/video container uses `flex-1 min-h-0` to scale dynamically. |
| **P0.3** | Search Best Match card solid white with invisible text | Card had `bg-white dark:bg-gradient-to-b dark:from-white/...` which did not unset background color, rendering white over white text. | Changed to `bg-white dark:bg-[#16131F]` with explicit contrast classes (`text-slate-900 dark:text-white`). |
| **P0.4** | Cards showed letter on gradient instead of album art | Strict `naturalWidth >= 200` rule discarded valid small thumbnails (`w60-h60`, `-150x150`). | Implemented `normalizeThumb` to upscale URLs (`=w544-h544`, `-500x500`), lowered threshold to 100px, added image proxy. |
| **P0.5** | Searching Anirudh Ravichander omitted him; clicking loaded forever | Search queried general tracks only; artist page had no timeout or optimistic parameters. | Added `yt.music.search(..., { type: 'artist' })`, exact match ranking, URL parameter pre-hydration, 10s AbortController. |
| **P0.6** | Fake release dates & grey YouTube 3-dots placeholders | Hero was guessing dates; `/api/featured` used synthetic track IDs. | Deleted `/api/featured`; removed hero; replaced with Greeting + Quick picks; gated shelf behind `FEATURE_NEW_RELEASES = false`. |

---

## 3. Test Coverage

- **Automated Unit Tests:** `npm test` runs 59 tests across 30 test suites covering thumbnail normalization, artist name normalization, exact artist ranking, blocklists, theme transitions, and playback engines. **Status: 59 passed, 0 failed.**
- **Production Build:** `npm run build` generates all 37 application routes cleanly with 0 TypeScript or lint errors.

