# InIsai (இனிசை) — Project Status

*Last updated: SSR Hydration Mismatch Resolution & Direct CDN Images*

---

## 1. Project Overview
- **Name:** InIsai (இனிசை)
- **Tagline:** Every Beat, Your World.
- **Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand, Supabase PostgreSQL, Web Audio API, PWA (Service Worker + Manifest).
- **Target Deployment:** Vercel Hobby + Supabase Free ($0 / ₹0 recurring cost).

---

## 2. Recent Critical Fixes & Enhancements

1. **Hydration Mismatch Fix (`useMounted` guard):**
   - **Root Cause:** React 19 / Next.js 15 fatal hydration error occurred when Zustand's `persist` middleware hydrated client properties (such as `likedTrackIds`, `currentTrack`, `user.displayName`) from `localStorage` immediately upon client load. This caused SSR HTML (e.g. `title="Like"`) to mismatch Client properties (e.g. `title="Unlike"`), triggering:
     `"A tree hydrated but some attributes of the server rendered HTML didn't match the client properties... Application error: a client-side exception has occurred"`.
   - **Fix Applied:** Implemented a unified `useMounted()` hook (`src/hooks/use-mounted.ts`) and guarded all dynamic local-storage attributes in `TrackCard`, `TrackRow`, `Header`, `MiniPlayer`, `FullScreenPlayer`, `LikedSongsPage`, `HistoryPage`, `LibraryPage`, `PlaylistsPage`, and `ProfilePage`. Server rendering and initial client hydration now match 100%, and dynamic state updates smoothly post-mount.

2. **Direct CDN Image Rendering & Fix for Broken Thumbnails:**
   - Standardized on native `<img ... loading="lazy" referrerPolicy="no-referrer" />` with `onError` fallbacks across the entire application.
   - Bypasses hotlink and proxy issues completely, allowing remote album art from CDNs (`c.saavncdn.com`, Unsplash, etc.) to load instantly without broken image icons or alt text overflow.

3. **Sequential Search Queue Playback (Next/Previous Navigation):**
   - When any song is clicked in the search results, the entire result list becomes the active queue (`playlistContext={results}`).
   - Clicking **Next** (`⏭`) plays the next search result sequentially.
   - Clicking **Previous** (`⏮`) returns to the previous song (or seeks to start if > 3s).
   - Once the search list finishes, auto-radio recommendations are queued automatically so music never halts.

4. **Clean English UI & Removal of Parenthesized Tamil Labels:**
   - Removed all bracketed translations across navigation, header, sidebar, installer, lyrics, and settings (`Home`, `Explore`, `Search`, `Your Library`, `Local Music`, `Install App`, `Good Evening`, `InIsai Listener`).

5. **Live Synchronized Lyrics Engine (`/api/music/lyrics`):**
   - Integrated LRCLIB for live synchronized LRC and plain lyrics with dynamic line-by-line scrolling and calibration.

---

## 3. Verification & Test Status
- **Unit Tests:** `npm test` passed 9/9 tests (0 failures).
- **Production Build:** `npm run build` compiled 20/20 routes cleanly with 0 errors.
