# Changelog

All notable changes to **InIsai (இனிசை)** will be documented in this file.

## [Phase 1] - 2026-11-10
### Critical Bug Fixes: Persistent Audio Engine, MediaSession API & Multi-Provider Search Ranking

#### Fixed
- **Persistent Player Navigation Lifecycle**: Fixed bug where navigating to Search (or other routes like `/explore`, `/library`, `/playlists`) caused audio to stutter, unmount, or reset. Mounted a persistent root `PlayerProvider` in `src/app/layout.tsx` managing `AudioEngine` callbacks, audio state subscriptions, and `navigator.mediaSession` lifecycle actions (`play`, `pause`, `nextTrack`, `prevTrack`, `seek`).
- **Search Ranking Flaw ("On My Way" / "Believer")**: Fixed ranking algorithm where covers containing the artist name in their title outranked the original song. Implemented token-based title & artist scoring with a -90 penalty for unrequested `cover`, `remix`, `karaoke`, `instrumental`, `slowed`, and `lofi` tracks.
- **Language Extraction & Tagging**: Fixed language fallback bug in `src/app/api/music/search/route.ts` where international tracks were misclassified as "Tamil". The endpoint now reads top-level `item.language` and normalizes to capitalized languages (`English`, `Tamil`, `Hindi`, `Telugu`, `Malayalam`).
- **Missing English Catalog Results**: Configured IPv4-first DNS ordering (`node:dns.setDefaultResultOrder('ipv4first')`) to prevent connection timeouts and passed comprehensive language headers (`Cookie: L=english,tamil,hindi,telugu,malayalam`) ensuring official high-fidelity tracks like *Imagine Dragons - Believer* and *Alan Walker - On My Way* are returned with valid 320kbps streams.
- **Theme Switching & Contrast (Mobile/Desktop)**: Fixed 1-click theme switching in `ThemeToggle.tsx` and `ThemeSync.tsx` so users can instantly switch between Dark and Light modes on desktop and mobile without getting trapped in OS system auto mode. Enhanced light mode contrast in `src/app/globals.css`.

#### Added
- **Spotify / Apple Music / BitChord Top Result Card**: Added prominent Top Result card in `src/app/search/page.tsx` for the #1 match featuring high-res artwork, 1-click play/pause, language tag, and 320kbps High Fidelity badge.
- **Search Request Debounce & AbortController**: Added 300ms input debounce with `AbortController` cancellation to eliminate race conditions and result flashing while typing.
- **Language Filter Chips**: Added quick language chips (`All`, `Tamil`, `English`, `Hindi`, `Telugu`, `Malayalam`) in `src/app/search/page.tsx`.
- **Skeleton Loaders**: Added shimmering loading placeholders for responsive visual feedback during active queries.
- **Automated Test Coverage**: Added comprehensive test cases in `tests/inisai.test.mjs` verifying search ranking, language normalization, and cover penalties (23 tests passing).
