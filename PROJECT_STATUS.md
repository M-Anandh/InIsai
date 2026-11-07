# InIsai (இனிசை) — Project Status

*Last updated: Search & Playback Architecture Upgraded*

---

## 1. Project Overview
- **Name:** InIsai (இனிசை)
- **Tagline:** Every Beat, Your World.
- **Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand, Supabase PostgreSQL, Web Audio API, PWA (Service Worker + Manifest).
- **Target Deployment:** Vercel Hobby + Supabase Free ($0 / ₹0 recurring cost).

---

## 2. Recent Critical Fixes & Enhancements

1. **Real Cloud Music Search & Decryption Engine (`/api/music/search`):**
   - Implemented real cloud catalog search querying Indian and Tamil music databases directly.
   - Integrated CryptoJS DES decryption for high-bitrate audio streams (`38346591` cipher key).
   - Searches for queries like **"oru chinna thamarai"**, **"chinna thamarai"**, **"naa ready"**, **"ilaiyaraaja"**, **"anirudh"**, etc., now instantly return real songs with album names, artists, 500x500 high-resolution cover artwork, and direct 320kbps `.mp4` audio streams.

2. **Bulletproof Audio Engine & Background Playback (`src/lib/audio-engine.ts`):**
   - Fixed the issue where audio appeared to play on the timer but produced no sound or stayed stuck at `0:00`.
   - Removed restrictive `crossOrigin="anonymous"` from the native HTML5 `<audio>` element so the browser can stream any remote audio origin without CORS blocking or Web Audio node silencing.
   - Guaranteed full background playback support on mobile Chrome and desktop browsers via native HTML5 Audio + Media Session API (`navigator.mediaSession.metadata`, position state, and play/pause/prev/next action handlers).

3. **Curated Catalog Stream URLs (`src/music/curated-data.ts`):**
   - Replaced old Pixabay (which returned HTTP 403 Forbidden on hotlinks) and Archive.org links with ultra-fast, verified 320kbps high-fidelity CDN streams for *Malarndhum Malaraadha*, *Kanne Kalaimane*, *Chinna Thamarai*, *Veena Serenade*, *Gayatri Mantra*, and *Kesariya*.

4. **SSR Hydration Fix (`src/components/layout/Header.tsx`):**
   - Resolved the React SSR hydration mismatch warning that triggered the red "1 Issue" badge in the development overlay.

---

## 3. Verification & Test Status
- **Unit Tests:** `npm test` passed 9/9 tests (0 failures).
- **Production Build:** `npm run build` compiled cleanly (18/18 routes statically generated & optimized).
