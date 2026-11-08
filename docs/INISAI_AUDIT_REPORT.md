# InIsai (இனிசை) — Complete Application Audit Report

**Application:** InIsai (இனிசை)  
**Production URL:** https://in-isai.vercel.app/  
**Repository:** https://github.com/M-Anandh/InIsai.git  
**Audit Date:** November 8, 2026  
**Status:** Audit Complete & Fix Implementation Underway  

---

## 1. Executive Summary

A comprehensive architectural and functional audit of the **InIsai** music streaming platform was conducted across all core domains:
1. **Frontend & Navigation:** Desktop header/sidebar, mobile bottom navigation, in-app back routing, and modal dismissal.
2. **Music Engine & Playback Context:** Queue management, search result playback desynchronization, audio element lifecycle, repeat/shuffle logic, and auto-recommendation behavior.
3. **Music Discovery & Catalog:** Elimination of static hardcoded lists, dynamic trending API routes, and language-specific catalog fetching.
4. **Authentication & Profile Management:** Proper isolation between unauthenticated Guest Mode and authenticated Cloud accounts (preventing guest password change bugs).
5. **Local Device Music:** Multi-file and folder-level selection (`webkitdirectory`), ID3 tag metadata extraction via `music-metadata-browser`, and duplicate prevention.
6. **Design & Theming:** Centralized Dark/Light/System CSS variable tokens, glassmorphism refinement, and mobile responsiveness.

---

## 2. Structured Issue Log

| Issue ID | Module | Problem | Root Cause | Severity | Proposed Fix | Test Case |
|---|---|---|---|---|---|---|
| **AUD-001** | Music Engine / Player Store | Search queue desynchronization upon navigation | `usePlayerStore.playTrack` did not track explicit `playbackContext` (`search`, `playlist`, `album`, `artist`, `trending`, `local`). When navigating away from Search, any state update or queue change disrupted the search context. | **Critical** | Define `PlaybackContext` type (`id`, `type`, `title`, `trackIds`). Persist active context in player store and preserve queue during page transitions. | `tests/inisai.test.mjs`: Test queue navigation within an explicit search context. |
| **AUD-002** | Profile / Auth Store | Change Password form displayed for unauthenticated guest sessions | `src/app/profile/page.tsx` unconditionally rendered the password update form regardless of `isAuthenticated` and guest user status (`user.id === 'guest-user'`). | **High** | Guard the Change Password section with `isAuthenticated && user && user.id !== 'guest-user'`. For guests, present a verified guest badge and a "Sign In to Sync" card. | `tests/inisai.test.mjs`: Verify guest profile renders without password form; authenticated profile renders password form. |
| **AUD-003** | Local Music | Incomplete folder-level file import & lack of ID3 metadata extraction | `src/app/local/page.tsx` had basic file picker with naive filename parsing, lacking folder drag & drop, ID3 metadata tags, and duplicate detection. | **High** | Integrate `music-metadata-browser` to parse ID3 title, artist, album, and embedded picture. Support `webkitdirectory` folder input and detect duplicate file names. | `tests/inisai.test.mjs`: Test duplicate track filtering and metadata fallback. |
| **AUD-004** | Home Page / Discovery | Static hardcoded curated tracks driving discovery | `src/app/page.tsx` heavily relied on static `CURATED_TRACKS` fallback arrays rather than real-time trending charts for Tamil, Hindi, English, and Malayalam. | **High** | Implement `/api/music/trending` route querying legitimate charts with in-memory caching. Update home page to fetch dynamic sections with skeleton loaders. | Verify `/api/music/trending` response schema and home page rendering. |
| **AUD-005** | Navigation / UX | In-app Back button missing on nested pages | Nested views (`/explore`, `/playlists/[id]`, `/local`, `/profile`) lacked a consistent in-app back navigation component and keyboard ESC listener. | **Medium** | Create `BackNavigation.tsx` component with browser history fallback. Add global ESC listener to dismiss full-screen player and modals. | Verify in-app back button navigation and ESC key player closure. |
| **AUD-006** | UI & Theme System | Scattered theme toggles and missing system preference detection | Theme switching was toggling between dark/light without observing system OS `prefers-color-scheme`. Some elements had hardcoded text/bg colors. | **Medium** | Centralize theme handling in `useAuthStore` with support for `dark`, `light`, and `system`. Update `globals.css` with semantic CSS variables for clean contrast. | Verify theme switching across all 20+ routes with zero text/background contrast conflicts. |
| **AUD-007** | Song Cards & Queue | Context menu actions missing on song cards | `TrackCard.tsx` and `TrackRow.tsx` only had Play and Like buttons, lacking "Play Next", "Add to Playlist", and "Share". | **Medium** | Add dropdown context menu to `TrackCard.tsx` and `TrackRow.tsx` providing Play Next, Add to Queue, and Add to Playlist options. | Test context menu actions in unit tests and manual browser verification. |

---

## 3. Technology & Architecture Baseline

- **Framework:** Next.js 15.1.0 (App Router), React 19, TypeScript 5.7
- **Styling:** Tailwind CSS 3.4.17 with CSS variable theming and glassmorphism
- **Audio Engine:** HTML5 Audio with Web Audio API (BiquadFilter equalizer, stereo panner, MediaSession API)
- **Local Persistence:** IndexedDB (`idb-keyval`) for local music blobs; localStorage (`zustand/persist`) for player & auth state
- **Cloud Backend:** Supabase (PostgreSQL schema for users, profiles, playlists, liked tracks) — 100% free-tier compliant ($0/month)
- **Hosting:** Vercel (Hobby Tier) with automatic GitHub CI/CD integration

---

## 4. Implementation Strategy

Fixes are deployed sequentially without disrupting production service:
1. **Phase 4:** Types and Playback Context Architecture (`src/types/index.ts`, `src/stores/player-store.ts`).
2. **Phase 3:** Dynamic Music Discovery & Trending API (`src/app/api/music/trending/route.ts`, `src/app/page.tsx`).
3. **Phase 6:** Fix Guest Profile vs Authenticated Profile (`src/app/profile/page.tsx`).
4. **Phase 7:** Local Music Folder Selection & ID3 Tag Extraction (`src/app/local/page.tsx`).
5. **Phase 5:** BackNavigation component & ESC key listener (`src/components/layout/BackNavigation.tsx`).
6. **Phase 2, 8, 9, 10:** UI Polish, Theme System & Song Card options.
7. **Phase 13 & 14:** Automated tests in `tests/inisai.test.mjs`, build validation, and Git push to GitHub.

