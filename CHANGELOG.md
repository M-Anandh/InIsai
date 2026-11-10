# Changelog

All notable changes to **InIsai (இனிசை)** will be documented in this file.

## [Phase 8] - 2026-11-10
### Documentation, Live Browser QA Bug Fixes & Production Verification

#### Fixed & Verified
- **Stale `c.saavncdn.com` Artwork URLs Removed (`src/music/curated-data.ts`)**:
  - Cleared the 4 remaining ORB-blocked hardcoded artwork URLs (`Kesariya`, `Kanne Kalaimane`, `Gayatri Mantra`, `Vande Mataram`) so `<CoverImage>` renders clean deterministic gradients with zero `ERR_BLOCKED_BY_ORB` network errors on Home.
- **YouTube Music Cold-Connect Timeouts, Collection Latency & Cache Poisoning (`src/music/providers/ytmusic-server.ts`, `src/app/api/yt/collections/route.ts`)**:
  - Enabled `dns.setDefaultResultOrder("ipv4first")`, added bounded per-RPC `withTimeout` guards across all YT Music endpoints, skipped redundant general search when `typeFilter === "song"`, and stopped caching partial `< 4` home shelves for 30 minutes when transient timeouts occur.
  - Optimized `/api/yt/collections` with an in-memory 1h cache and prioritized 4-query resolution (dropping cold load latency from `83.6s` to `< 1s`, e.g., `653ms` cold / `10ms` warm for `ilaiyaraaja-maestro-hits` with 35 tracks).
- **Non-Blocking Font Loading (`src/components/ui/FontLoader.tsx`, `src/app/layout.tsx`)**:
  - Moved Google Fonts stylesheet loading out of blocking `<head>` `<link rel="stylesheet">` into async client-side `FontLoader` so offline or throttled font requests never delay initial paint or document `load` events.
- **Documentation & End-to-End QA (`README.md`, `tests/inisai.test.mjs`)**:
  - Updated `README.md` with full v2.0 architecture, provider registry, dual-engine playback, personalization, lyrics, and compliance boundaries.
  - Verified `32/32` unit tests, `npx tsc --noEmit`, `npm run build` (`32` routes), Desktop `1280×800` (`28/28` steps, `0` page/console/network errors), Mobile `375×812` (`14/14` steps, `0` page/console errors), and live collection playback + automatic fallback recovery via REA Chromium.

## [Phase 7] - 2026-11-10
### Mobile-First Top Bar, Search Sync & PWA Shell v2

#### Added / Fixed
- **Single-Line Mobile Top Bar (`src/components/layout/Header.tsx`, `InisaiLogo.tsx`)**:
  - Removed overlapping desktop badges and tagline on small mobile screens (`< 768px`), displaying compact App Icon + `InIsai` (`text-slate-900 dark:text-[#F6F3EE]` fixing Light mode wordmark contrast), expandable mobile full-width Search toggle, Theme Icon toggle, and compact Profile/Login avatar (`>= 40px` touch targets, zero wrap down to `360px`).
  - Added `?q=` URL parameter synchronization in `src/app/search/page.tsx` with `Suspense`.
- **Install Experience & PWA Manifest (`PWAInstaller.tsx`, `manifest.webmanifest`, `sw.js`)**:
  - Moved mobile "Install App" out of the top bar into a one-time dismissible Home banner and permanent entry inside Settings.
  - Updated `manifest.webmanifest` colors to `#0B0A10` Obsidian Ink and configured `Search` and `Liked Songs` shortcuts; bumped service worker (`inisai-pwa-v2`) skipping stream CDNs cleanly.
- **Secondary Page Light-Theme Harmony (`globals.css`, `MobileNav.tsx`)**:
  - Updated glass bottom navigation touch areas (`>= 48px`) with safe-area padding and ensured headings/cards across `/library`, `/liked`, `/playlists`, `/history`, `/local`, `/offline`, and `/profile` stay high contrast in both themes.

## [Phase 6] - 2026-11-10
### Design System, Dual Palettes, View Transitions & Motion Grammar

#### Added
- **Editorial Design System Tokens (`tailwind.config.ts` & `src/app/globals.css`)**:
  - Obsidian Dark palette (`#0B0A10` ink, `#13111B` surface, `#1C1928` raised, `#F6F3EE` text, turmeric `#FF8A3D`, rose `#FF3D77`, indigo `#7A5CFF`, 135° brand gradient) and designed Cream Studio Light palette (`#FBF7F1` cream, white raised surfaces with soft shadows, `#1B1824` ink, darkened accessible accents).
  - Glass panels with `backdrop-filter: blur(24px) saturate(160%)` and `prefers-reduced-transparency: reduce` fallback.
  - Typography upgrade pairing `Plus Jakarta Sans` + `Inter` + `Noto Sans Tamil` with fluid `clamp()` scaling.
- **Zero-Flash System Theme & Circular Reveal (`ThemeToggle.tsx`, `ThemeSync.tsx`, `layout.tsx`)**:
  - Inline `<head>` script defaulting to `System` theme before first paint, synchronizing `<meta name="theme-color">` and iOS status bar style cleanly.
  - View Transitions API circular wipe on theme switches (with smooth 250ms fallback and `prefers-reduced-motion` guard).
- **Motion & Navigation Transitions (`PageTransition.tsx`, `MusicCarousel.tsx`)**:
  - Smooth 250ms `cubic-bezier(0.22, 1, 0.36, 1)` route transitions wrapping main content without ever remounting `PlayerProvider`.
  - Horizontal snap-scroll carousels with subtle edge fades.

## [Phase 5] - 2026-11-10
### BitChord-Inspired Player UI, Dynamic Artwork Palette & Gestures

#### Added
- **Dynamic Artwork Palette Extractor (`src/lib/theme/palette-extractor.ts`)**:
  - Safely extracts dominant album colors with WCAG AA saturation/lightness clamping and deterministic fallback, transitioning `--accent-dynamic` and Now Playing aurora over 600ms.
- **Floating Glass `MiniPlayer.tsx`**:
  - Floating pill bar 12px above mobile nav with thin gradient progress line, ≤ 3 compact mobile controls, tap & swipe-up expansion, swipe-left/right track skipping, and removal of noisy "YT" badge.
- **BitChord-Inspired `FullScreenPlayer.tsx`**:
  - Clean header with top-left ChevronDown collapse (`44×44px`), centered context title, `⋯` overflow menu (`Stats for Nerds`, Video Toggle, Sources), swipe-down dismissal, hover/drag preview tooltip scrubber with buffered indicator, one-row Title + Heart button with burst haptic, keyboard shortcuts (`Space`, `Left`/`Right`, `M`, `L`, `Esc`), and bottom sheet actions (`Lyrics`, `Queue`, `FX`, `Sleep`).
- **Drag-to-Reorder `QueueView.tsx`**:
  - HTML5 drag & drop reordering, arrow controls, and live `/api/yt/related` suggestions.

## [Phase 4] - 2026-11-10
### Word-Synced Lyrics, Multi-Provider LRCLIB + YTMusic Fallback & Apple Music Styling

#### Added
- **Multi-Provider Lyrics Endpoint (`src/app/api/music/lyrics/route.ts`)**:
  - Added duration-matched `LRCLIB /api/get` exact matching, scored `/api/search`, and YouTube Music native lyrics fallback (`ytLyrics`) with `s-maxage=86400` caching.
- **Word-Level Timing & Tamil Transliteration (`src/lib/lyrics-parser.ts`)**:
  - Enhanced `parseLrc` to parse inline `<mm:ss.xx>` word tags with fallback proportional word interpolation across active line durations.
  - Added `hasTamilScript` detection and phonetic `transliterateTamil` converter.
- **Apple-Style Synchronized Lyrics Experience (`src/components/player/LyricsView.tsx`)**:
  - Implemented smooth `requestAnimationFrame` clock interpolation synced smoothly with both `YouTubeIframeEngine` (10Hz poll + `rAF`) and `AudioElementEngine`.
  - Bright, scaled active line (`text-2xl/3xl`), dimmed & subtly blurred neighbors clearing on hover, tap-to-seek on any line, crisp Noto Sans Tamil display, `அ→Aa` transliteration toggle, and `±0.5s` sync calibration nudge.

## [Phase 3] - 2026-11-10
### Personalisation, On-Device Taste Profile & Privacy Controls

#### Added
- **On-Device Taste Signal Tracker (`src/lib/personalization/signal-tracker.ts`)**:
  - IndexedDB storage (`idb-keyval`) capturing plays, completions (`>= 70%`), skips (`< 15s`), likes, repeats, search queries, and time-of-day patterns (`morning`, `afternoon`, `evening`, `late_night`).
  - 30-day exponential half-life decay weighting (`computeDecayWeight`), negative skip suppression, and auto-play queue continuation.
- **Personalized Home Experience (`src/app/page.tsx`)**:
  - Added *Daily Mixes 1–3* (clustered by taste affinity and time of day) and *"Because you listened to {topArtist}"* seeded dynamically via YouTube Music `/api/yt/related` radio.
  - Fixed recommendation scorer bug where YouTube Music tracks without raw `streamUrl` were excluded; now evaluates both `streamUrl` and `youtubeVideoId`.
- **Privacy & Integration Controls (`src/app/settings/page.tsx`)**:
  - Added Personalisation Privacy section showing live recorded signal metrics & top affinity artists, with **Export Profile JSON** and **Reset Taste Profile** controls.
  - Added optional ListenBrainz scrobble token configuration.

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

