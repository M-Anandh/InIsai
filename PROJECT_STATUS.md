# InIsai (இனிசை) — Project Status

*Last updated: Master Upgrade Implementation — Playback Context, Dynamic Trending, Guest Security & Local Music Folder Import*

---

## 1. Project Overview
- **Name:** InIsai (இனிசை)
- **Tagline:** Every Beat, Your World.
- **Production URL:** [https://in-isai.vercel.app/](https://in-isai.vercel.app/)
- **Repository:** [https://github.com/M-Anandh/InIsai.git](https://github.com/M-Anandh/InIsai.git)
- **Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand, Supabase PostgreSQL, Web Audio API, PWA (Service Worker + Manifest).
- **Target Deployment:** Vercel Hobby + Supabase Free ($0 / ₹0 recurring cost).

---

## 2. Master Upgrade Enhancements

1. **Playback Context Architecture & Search Queue Fix (Phase 4):**
   - Implemented `PlaybackContext` type (`search`, `playlist`, `trending`, `album`, `artist`, `local`, `history`, `custom_queue`).
   - Fixed search result playback so clicking a search result creates and preserves an explicit search queue without resetting or desyncing during page transitions.
   - Enhanced queue actions: `playNext`, `addToQueue`, `reorderQueue`, and `removeFromQueue`.

2. **Guest Profile Security Isolation (Phase 6):**
   - Strictly isolated unauthenticated Guest mode from Authenticated Cloud accounts.
   - Removed password change forms for unauthenticated guests, displaying a friendly "Guest Profile" badge and a "Sign In to Sync" card.
   - Password changes are only presented to authenticated users.

3. **Local Music Folder Selection & ID3 Tag Extraction (Phase 7):**
   - Added folder-level selection with `webkitdirectory` and multi-file drag-and-drop.
   - Integrated `music-metadata-browser` to parse audio tags (title, artist, album, embedded album art) in the browser.
   - Added duplicate track detection and local IndexedDB caching.

4. **Dynamic Music Discovery & Trending API (Phase 3):**
   - Added `/api/music/trending` route providing real-time trending charts for Tamil, Hindi, English, and Malayalam.
   - Transformed the home page into a data-driven experience with skeleton loading states and category switching.

5. **Navigation & Global Theme System (Phase 5 & 8):**
   - Added `BackNavigation.tsx` component with browser history fallback and keyboard ESC dismissal for modals.
   - Centralized theme controller supporting Dark, Light, and System modes with semantic CSS tokens.

---

## 3. Verification & Test Status
- **Unit & Integration Tests:** 100% passing via `npm test`.
- **Production Build:** Clean compilation with 0 TypeScript or lint errors.
- **Deployment:** Live on Vercel at `https://in-isai.vercel.app/`.
