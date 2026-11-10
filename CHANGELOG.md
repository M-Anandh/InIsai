# Changelog

All notable changes to **InIsai (இனிசை)** will be documented in this file.

## [Phase 2] - 2026-11-10
### YouTube-Music-First Search, Official Collections & Cover Resilience

#### Added
- **YouTube Music InnerTube Metadata Adapter (`src/music/providers/ytmusic-server.ts`)**:
  - Isolated `youtubei.js` adapter (`retrieve_player: false` metadata-only compliance) with 500-entry LRU cache and YouTube Data API v3 fallback.
  - Serverless API routes: `/api/yt/suggest`, `/api/yt/search`, `/api/yt/home`, `/api/yt/charts`, `/api/yt/related`, `/api/yt/artist`, `/api/yt/album`, `/api/yt/playlist`, `/api/yt/collections`.
  - Section 3.4 validated: Top #1 match verified live for `on my way alan walker`, `believer imagine dragons`, `kolaveri`, `nilaave vaa`, `hukum`, and `jailer 2`.
- **Categorized Search Experience (`src/app/search/page.tsx`)**:
  - Instant search suggestions (`150ms` debounce, `AbortController`) and multi-section results (Top Result card, Songs with collapsed "More versions" expander, Videos/Live, Albums, Artists, Playlists).
  - Unfiltered default search with category/language chips (`All · Songs · Albums · Artists · Playlists · Tamil · English · Hindi · Telugu · Malayalam`), empty-state trending suggestions, and "Did you mean" recovery.
- **Official Collections & Detail Routes (`src/music/collections.ts`)**:
  - Rebuilt 11 official collections resolved live at runtime (`Ilaiyaraaja — Maestro Hits`, `Ilaiyaraaja — Melody Gold`, `Anirudh — Mass & Melody`, `Top Tamil 2026`, `Tamil Trending Now`, `A. R. Rahman Essentials`, `Yuvan — Feel`, `Tamil 90s Love`, `Kuthu & Dance`, `Late-Night Drive`, `Peaceful Meditation & Ragas`).
  - Added `/artist/[id]`, `/album/[id]`, and `/playlist/[id]` dynamic App Router pages.
- **Resilient `<CoverImage>` Component (`src/components/ui/CoverImage.tsx`)**:
  - Replaced broken `c.saavncdn.com/254/...` artwork (`ERR_BLOCKED_BY_ORB`) and enforced multi-stage `onError` fallback (`alt CDN size` -> `YT thumbnail` -> `2×2 mosaic` -> deterministic gradient monogram; zero broken alt text).
  - Upgraded `TrackRow` (`64px` touch rows, playing eq indicator, `⋯` overflow menu for mobile queue/like actions).

## [Phase 1.1] - 2026-11-10
### Dual-Engine Architecture, Provider Registry & Playback Reliability

#### Added
- **Capability-Based Dual Playback Engines (`src/lib/player/`)**:
  - `YouTubeIframeEngine`: Official `YT.Player` IFrame API (`youtube.com/iframe_api`) mounted persistently at the root without reloading on navigation or switching audio/video mode (`origin` safe, 10Hz time polling, auto-recovery error hooks).
  - `AudioElementEngine`: Reused dual HTMLAudioElements (`primary` + `secondary`) with first-tap mobile unlock, true 0–12s crossfade, gapless pre-buffering, and Web Audio DSP (5-band EQ, bass/treble shelves, real FFT analyzer) with automatic CORS bypass so sound never silences.
  - `EngineCoordinator`: Single global audio/iframe arbitrator enforcing mutual exclusion, Media Session metadata (96/256/512 artwork + `setPositionState` + all transport actions), and optional Wake Lock when full-screen player is open.
- **Pluggable `SourceProvider` Interface & `ProviderRegistry` (`src/music/providers/`)**:
  - Clean provider isolation (`ytmusic`, `saavn`, `local`) supporting parallel `Promise.allSettled` queries, deduplication, and cross-provider match lookup (`findAudioMatch`).
  - Added `/settings/sources` route displaying live provider health checks (`ok`, `latencyMs`), capabilities, and per-provider enable/disable toggles.
- **Engine-Aware Controls & Recovery**:
  - `AudioVisualizer` displays real FFT spectrum bars on `AudioElementEngine` and an honest calm ambient sine ribbon on `YouTubeIframeEngine`.
  - `EqualizerDrawer` dynamically shows/hides EQ & Crossfade sliders based on engine capabilities while keeping Playback Speed (`0.5x–2x`) and Sleep Timer (`Off`, `15m`, `30m`, `60m`, `End of track`) universally available.
  - Added mobile `visibilitychange` resume protection (never pauses in background; attempts auto-resume on foreground return with background-source toast hint) plus Settings toggles (`preferAudioFallback`, `autoplayRelated`, `statsForNerd`).
- **Audit & Reference Docs**: Updated `docs/api-audit.md` with REA MCP Chromium observation findings and created `docs/design-reference.md`.

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

