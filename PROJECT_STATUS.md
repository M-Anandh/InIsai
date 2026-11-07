# InIsai (இனிசை) — Project Status

*Last updated: Direct CDN Images, Queue Traversal & Clean English UI*

---

## 1. Project Overview
- **Name:** InIsai (இனிசை)
- **Tagline:** Every Beat, Your World.
- **Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand, Supabase PostgreSQL, Web Audio API, PWA (Service Worker + Manifest).
- **Target Deployment:** Vercel Hobby + Supabase Free ($0 / ₹0 recurring cost).

---

## 2. Recent Critical Fixes & Enhancements

1. **Direct CDN Image Rendering & Fix for Broken Thumbnails:**
   - Eliminated Next.js `next/image` proxy overhead across all components (`TrackRow`, `TrackCard`, `PlaylistCard`, `MiniPlayer`, `FullScreenPlayer`, `QueueView`, `HomePage`).
   - Standardized on native `<img ... loading="lazy" referrerPolicy="no-referrer" />` with `onError` fallbacks.
   - Bypasses hotlink and proxy issues completely, allowing remote album art from CDNs (`c.saavncdn.com`, Unsplash, etc.) to load instantly without broken image icons or alt text overflow.

2. **Sequential Search Queue Playback (Next/Previous Navigation):**
   - Verified that selecting any song in the search results sets the entire search list as the active playback queue.
   - Clicking **Next** (`⏭`) plays the next search result sequentially.
   - Clicking **Previous** (`⏮`) returns to the previous song (or seeks to start if > 3s).
   - If the queue reaches the end, auto-radio recommendations are fetched and queued so music never halts.

3. **Clean English UI & Removal of Parenthesized Tamil Labels:**
   - Removed all bracketed translations across navigation, header, sidebar, installer, lyrics, and settings (`Home`, `Explore`, `Search`, `Your Library`, `Local Music`, `Install App`, `Good Evening`, `InIsai Listener`).

4. **Live Synchronized Lyrics Engine (`/api/music/lyrics`):**
   - Integrated LRCLIB for live synchronized LRC and plain lyrics.
   - Real-time lyrics scrolling and calibration support in `LyricsView.tsx`.

5. **Audio Streaming & Decryption:**
   - DES stream decryption with 320kbps `.mp4` audio output.
   - Native HTML5 Audio engine ensuring flawless background and lock-screen playback.

---

## 3. Verification & Test Status
- **Unit Tests:** `npm test` passed 9/9 tests (0 failures).
- **Production Build:** `npm run build` compiled 20/20 routes cleanly with 0 errors.
