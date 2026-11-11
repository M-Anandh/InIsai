# InIsai (இனிசை) — Production Verification & Release Audit Report

**Date:** 2026-11-11  
**Target URL:** [https://in-isai.vercel.app/](https://in-isai.vercel.app/)  
**Environment:** Next.js 15 PWA on Vercel Production  
**Scope:** Complete resolution of visual, layout, metadata, and playback defects reported from production.

---

## 1. Executive Summary & Defect Resolution Matrix

| Issue # | Area | Root Cause | Engineering Solution | Verification / Test |
| :--- | :--- | :--- | :--- | :--- |
| **P0.1** | **Old Songs & Fake Dates** | `src/app/api/featured/route.ts` contained a static mock seed catalogue (`LATEST_FILM_CATALOG`) with 2024 and early 2025 releases (*Manasilaayo*, *Hunter Vantaar*, *Sawadeeka*, *Rise of Dragon*), and fabricated release dates (*Releases Dec 15*). | Completely deleted `LATEST_FILM_CATALOG`. Replaced with live TMDB movie discovery (`discoverTmdbMovies`) and JioSaavn soundtrack search. Enforced strict 90-day window `[today - 30 days, today + 60 days]` calculated dynamically in `Asia/Kolkata`. Added `?debug=1` parameter. | `tests/new-releases.test.mjs`: Tests date boundaries in `Asia/Kolkata` and rejects 2024/2025 releases. `npm run verify:releases`. |
| **P0.2** | **YouTube 120×90 Placeholders & Incorrect Covers** | `CoverImage.tsx` fell back to `https://i.ytimg.com/vi/${id}/hqdefault.jpg`. For missing/private videos, YouTube returns HTTP 200 with a 120×90 grey box with 3 dots. `img.complete && img.naturalWidth > 0` evaluated to true. In `featured/route.ts`, "Aura 10/10" hardcoded the *Mouna Ragam* artwork. | Removed hand-constructed `i.ytimg.com` URLs. In `CoverImage.tsx`, checked `naturalWidth >= 200 && naturalHeight >= 200` to reject the 120×90 placeholder. If <200px, marks as error and falls back to TMDB artwork or gradient emblem. Fixed "Aura 10/10" cover source. | `CoverImage.tsx`, unit tests on placeholder rejection. |
| **P0.3** | **Search "Best Match" Contrast in Dark Mode** | `src/app/search/page.tsx` styled the Best Match card with `bg-white dark:bg-gradient-to-b`. In CSS, setting `background-image` does not clear `background-color: #fff`. Dark mode left the card 100% opaque white while text applied `dark:text-white`, rendering white-on-white. | Replaced with semantic theme tokens: `bg-[#FBFAF8] dark:bg-[#1C1928] border border-slate-200/80 dark:border-white/10`. Fixed text contrast to `dark:text-white`, secondary `dark:text-white/85`, and wrapped duration in high-contrast pill. Hidden tap hint on desktop. | Search page inspection, WCAG contrast ratio ≥ 4.5:1. |
| **P0.4** | **YouTube Video Chrome in Video Mode** | `YouTubeIframeEngine.ts` set `controls: 1` and `host.style.pointerEvents = "auto"`. YouTube's title, channel avatar, progress bar, and hover overlays were exposed over the video. | Configured `playerVars` with `controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, playsinline: 1, cc_load_policy: 0, enablejsapi: 1, origin: location.origin`. Set `pointer-events: none` on iframe and attached `onClick={togglePlay}` to wrapper for seamless play/pause. | `YouTubeIframeEngine.ts`, `FullScreenPlayer.tsx`. |
| **P0.5** | **Full-Screen Player Overlap on Shorter Screens** | On screens <820px, large artwork dimensions (`max-h-[36vh] sm:max-h-[42vh]`) pushed the transport row down until it collided with the bottom drawer triggers (Lyrics/Queue/FX/Sleep). Context label showed "Featured: Aura 10/10" when playing other songs. | Scaled artwork on viewports <820px to `max-h-[26vh] sm:max-h-[32vh] md:max-h-[38vh]`, added `min-h-0` to flex containers, and updated context label to show clean source context ("Featured New Releases", "Search", etc.). | `FullScreenPlayer.tsx`. |
| **P0.6** | **Wave Visualizer Following Song** | `WaveVisualizer.tsx` previously looped the same static sine waves across all songs. | Implemented real Web Audio log-scale 64-bin frequency mapping with spectral flux beat pulse for direct audio (`AudioElementEngine`), and a deterministic 32-bit FNV-1a track-seeded non-repeating ambient wave for YouTube iframe audio with live indicator badges. | `WaveVisualizer.tsx`, `AudioElementEngine.ts`. |

---

## 2. API Pipeline & Verification (`/api/featured`)

### Query Parameters
- `lang`: Comma-separated languages (e.g., `ta,te,hi,en`).
- `debug=1`: Returns filter pipeline telemetry, rejection causes, natural dimensions, and date sources.

### Verification Command
```bash
npm run verify:releases
```

### Date Window Rule (Asia/Kolkata)
```typescript
const kolkataDateStr = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const today = new Date(kolkataDateStr + "T00:00:00Z");
const past30 = new Date(today.getTime() - 30 * 86400000);
const future60 = new Date(today.getTime() + 60 * 86400000);
```

---

## 3. Deployment Instructions for Vercel

To enable live theatrical release querying from TMDB:
1. Navigate to **Vercel Dashboard → in-isai Project → Settings → Environment Variables**.
2. Add:
   - **Key:** `TMDB_API_KEY`
   - **Value:** `<Your TMDB API Read Access Token or v3 API Key>`
   - **Scope:** Production, Preview, Development.
3. Redeploy or push to `main` for automatic redeployment.

