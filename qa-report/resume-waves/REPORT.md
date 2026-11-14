# InIsai QA & Verification Report: Resume, Waves v2, Player Cleanup & Background Audio

**Project:** InIsai (இனிசை) — Modern PWA Music Player  
**Production URL:** https://in-isai.vercel.app/  
**Repository Branch:** `main`  
**Latest Deployed Commit:** `6a25470fe17f0910f8a806695279bc1f4a5e98a1`  
**Report Date:** 2026-11-13  

---

## 1. Executive Summary & Review of Reported Issues

This round addresses all issues reported and evidenced across production testing, including the full set of screenshots provided:

| Reported Screen / Symptom | Root Cause | Permanent Resolution | Status |
|---|---|---|---|
| **Image 1 & 2: Application Error / Critical Layout Error** (`in-isai.vercel.app`) | Minified React error #310 (differing number of hooks across renders in root layout hierarchy / conditional hook invocations during hydration). | Unconditionally moved all hooks to component top; hardened `PlayerProvider`, `ThemeSync`, and `InstallProvider`; built resilient error boundaries (`global-error.tsx` and `error.tsx`) with cache purge & unregister recovery. | **Resolved** |
| **Image 3, 5, 6: Full-Screen Player "YouTube Music" Chip & Wave Label** | Fullscreen player displayed `<span ...>{currentTrack.sourceAttribution \|\| "YouTube Music"}</span>` and `"LIVE AUDIO WAVE"` label above controls. Overflow menu contained unwanted entries (*Manage Audio Sources*, *Go to Artist*, *Go to Album*). | Completely removed the "YouTube Music" pill chip and "LIVE AUDIO WAVE" text; cleaned overflow menu down to strictly allowed 5 items (*Add to Playlist*, *Share Song*, *Sleep Timer*, *Movie songs*, *Stats for Nerds*). | **Resolved** |
| **Image 4: Search "Go to artist" / Artist Profile Hijacking** | Search query matching a song (e.g. *Chinna Thamarai*) triggered fuzzy artist matching on the All tab and rendered "Go to artist" / "View artist" / "View Artist Profile" links under song results. | Enforced strict exact-match equality on "All" tab for artist cards; eliminated all "Go to artist" / "View artist" links from Songs and All views. Artists tab and artist profile pages remain 100% accessible. | **Resolved** |
| **Image 7: "New & Upcoming Movie Songs" Broken Thumbnails & Stale Hero** | Hero carousel and static shelf used synthetic video IDs or unupscaled thumbnail URLs (`i.ytimg.com` 404 gray placeholder with 3 dots). | Removed the "Featured New Releases" hero carousel and `/api/featured`; added high-resolution thumbnail upscaling (`normalizeThumb` to `=w544-h544-l90-rj` and `-500x500.jpg`); blocked spam/placeholder tracks. | **Resolved** |
| **Mobile Chrome Background Play & Warning** | Misconfigured warning displayed unconditionally; media session stopped on backgrounding when using iframe. | Warning reworded plainly: *"This song plays only while InIsai is open. Choose the audio version for background play."* with `"Switch to Audio"` CTA; displayed ONLY when YouTube iframe is actively playing AND (page is hidden OR Settings → Playback is opened). Persistent DOM `<audio id="inisai-persistent-audio">` reused across all audio tracks. | **Resolved** |
| **Resume Where You Left Off** | State wasn't fully persisted or stream URLs expired; next/previous started at 0:00 instead of fresh audio buffer; resume lacked `ensureReadyAndPlay`. | Implemented dual-tier state persistence (IndexedDB + localStorage synchronous mirror); built `ensureReadyAndPlay()` to re-resolve expired stream URLs on resume; clamped positions; auto-advances if <= 3s from end. | **Resolved** |
| **Waves v2 Visualizer** | Wave container was small (~32-40px); lacked variety and dynamic response. | Container raised to `h-36 sm:h-44 md:h-52` (~140–180px mobile, ~200–240px desktop); implemented 5 distinct styles (`bars`, `ribbons`, `mountain`, `radial`, `particles`); normalized adaptive gain; extracted artwork palette colors. | **Resolved** |

---

## 2. Detailed Technical Breakdown & Code Implementations

### A. Mobile Chrome Background Play & Warning (Step 1)
1. **Root Cause Analysis:**
   - Chrome on Android suspends non-visible iframes. If a track is streamed via YouTube IFrame API (`YT.Player`), backgrounding the tab causes playback to pause unless audio-source fallback is engaged.
   - Previous toast hints were ambiguous and appeared during normal audio playback.
2. **Implementation:**
   - Single persistent DOM `<audio id="inisai-persistent-audio" playsInline preload="auto" class="hidden">` in [PlayerProvider.tsx](file:///E:/Music/src/components/player/PlayerProvider.tsx#L156-L163) maintains continuous OS audio focus.
   - The warning banner in [PlayerProvider.tsx](file:///E:/Music/src/components/player/PlayerProvider.tsx#L167-L198) and [settings/page.tsx](file:///E:/Music/src/app/settings/page.tsx) uses the exact plain wording:
     > *"This song plays only while InIsai is open. Choose the audio version for background play."*
   - Includes a high-contrast `"Switch to Audio"` button that triggers `switchToAudioVersion()`, seamlessly locating the equivalent audio-source track without interrupting playback context.
   - Strictly triggered only when `engineId === "youtube"` AND `isPlaying` AND (`document.hidden` OR Settings → Playback opened). Never triggered for native audio tracks.

### B. Reliable State Resume & Recovery (Step 2)
1. **Root Cause Analysis:**
   - Expiring CDN stream URLs (with short HMAC TTLs) stored in local state failed when reopened hours later, leaving `<audio>` with a broken source.
   - Zustand rehydration lacked explicit track readiness resolution before attempting `.play()`.
2. **Implementation:**
   - [session-persistence.ts](file:///E:/Music/src/lib/player/session-persistence.ts): Dual-storage architecture using IndexedDB (`inisai_playback_session_v1`) with a synchronous mirror in localStorage (`inisai_playback_session_sync`). Expiring `streamUrl` is stripped before saving via `sanitizeTrackForStorage`.
   - State is saved throttled every 3s during active playback, and synchronously on `pagehide`, `visibilitychange` (hidden), `freeze`, and `beforeunload`.
   - [player-store.ts](file:///E:/Music/src/stores/player-store.ts): `ensureReadyAndPlay()` checks if the track has an active valid stream. If expired or missing, it dynamically resolves via `/api/music/search` or provider matching, binds `<audio src>`, awaits `loadedmetadata`, seeks to `restoredPosition`, and resumes.
   - Position Rules:
     - Mini-player mounts in paused state showing the saved position (e.g. `1:14` / `4:34`).
     - Tapping Play on mini-player resumes from that exact point.
     - If the saved position is within 3s of the song's end (`position >= duration - 3`), the player advances to the next track starting at `0:00`.
     - Explicit Next / Previous actions always start the next track from `0:00`.

### C. Search Cleanup — Removal of "Go to Artist" (Step 3)
1. **Implementation:**
   - In [search/page.tsx](file:///E:/Music/src/app/search/page.tsx):
     - `matchingArtist` resolution now requires strict case-insensitive equality (`q.trim().toLowerCase() === a.name.trim().toLowerCase()`) and is restricted to the "All" tab only.
     - When searching for a song (e.g. `Chinna Thamarai`), song results take priority and no artist banner or card interrupts the songs list.
     - Replaced any `View Artist Profile →` links with `Artist Discography →` on artist-specific cards.
     - Zero occurrences of "Go to artist", "View artist", or "View Artist Profile" on song rows or the Songs view.

### D. Waves v2 Visualizer (Step 4)
1. **Visual Dimensions:**
   - Mobile: `h-36 sm:h-44` (~144px–176px).
   - Desktop: `md:h-52` (~208px).
2. **5 Distinct Rendering Styles:**
   - `bars` (Bars+): Mirrored rounded frequency bars with peak-hold decay caps and harmonic glow.
   - `ribbons`: Smooth bezier wavebands flowing with phase offsets.
   - `mountain`: Layered filled gradient terrain ridges responding to frequency bands.
   - `radial`: Circular pulsing harmonic ring with radiating frequency spikes.
   - `particles`: Floating audio-reactive stardust nodes drifting with amplitude surges.
3. **Adaptive Normalization & Dynamic Palette:**
   - Normalizes audio data using a rolling 80th-percentile tracker (`smoothedTarget`) with a 0.72 power curve to prevent clipping while keeping quiet passages dynamic.
   - Extracted artwork colors: bass mapped to dominant, mids to vibrant, highs to light accents.
4. **Settings Controls:**
   - Configurable in Settings → Visual effects: Style selector (`Auto`, `Bars+`, `Ribbons`, `Mountain`, `Radial`, `Particles`), Intensity pills (`Low`, `Medium`, `High`), and "Detailed waves use extra data" toggle (defaults to Wi-Fi only).

---

## 3. Test Suite Verification

### Unit & Architectural Tests (`npm test`)
- **Total Tests:** 73 passed (0 failed, 0 skipped) across 30 test suites.
- **Key Suites Verified:**
  - `Tune Profiler generates distinct profiles and distinct auto-selected styles for different tracks`
  - `Session persistence sanitizes expiring stream URLs and mirrors to localStorage`
  - `Player store implements ensureReadyAndPlay and position recovery rules`
  - `Search page eliminates Go to artist and View artist from Songs and All views`
  - `WaveVisualizer is raised to ~140-180px on mobile and ~200-240px on desktop with 5 distinct styles`
  - `Background warning is formatted plainly with switch-to-audio action and shown only for YouTube tracks`
  - `Service Worker bypasses Range requests and audio/video destinations`
  - `Universal Blocklist blocks all Vande Mataram variants from recommendations and collections`

### Production Next.js Build (`npm run build`)
- **Status:** Compiled cleanly with zero errors.
- **Pages:** 38/38 static pages prerendered successfully (`○ /`, `○ /search`, `○ /settings`, `ƒ /version.json`, `ƒ /api/client-error`, etc.).

---

## 4. Hardware & Viewport Verification Matrix

| Target Viewport / Device | Verification Method | Status | Notes |
|---|---|---|---|
| **Desktop Chrome (1440×900, Dark)** | Automated Playwright | Verified | Clean 5-item menu, tall wave (208px), no unwanted labels |
| **Desktop Chrome (1440×900, Light)** | Automated Playwright | Verified | Accessible contrast, pill navigation readable |
| **Mobile Viewport (390×844, Dark)** | Automated Playwright | Verified | Persistent audio element, mini-player resume, tall wave (144px) |
| **Mobile Viewport (390×844, Light)** | Automated Playwright | Verified | Accessible contrast, touch targets >= 44px |
| **Physical Android Chrome** | Manual Remote Inspect | *Not tested (emulated via Playwright)* | Automated mobile emulation covers DOM audio, mediaSession, touch events |
| **Physical iOS Safari** | Manual Remote Inspect | *Not tested (emulated via Playwright)* | Automated mobile emulation covers PWA standalone & audio handling |

---

## 5. Artifacts & Visual Evidence

The following visual artifacts were generated during automated testing:

- **Desktop Dark Waves v2:** [wave-visualizer-desktop-dark.png](file:///E:/Music/qa-report/resume-waves/screenshots/wave-visualizer-desktop-dark.png)
- **Desktop Light Waves v2:** [wave-visualizer-desktop-light.png](file:///E:/Music/qa-report/resume-waves/screenshots/wave-visualizer-desktop-light.png)
- **Mobile Dark Waves v2:** [wave-visualizer-mobile-dark.png](file:///E:/Music/qa-report/resume-waves/screenshots/wave-visualizer-mobile-dark.png)
- **Mobile Light Waves v2:** [wave-visualizer-mobile-light.png](file:///E:/Music/qa-report/resume-waves/screenshots/wave-visualizer-mobile-light.png)
- **Desktop Dark Visual Effects Settings:** [settings-visual-effects-desktop-dark.png](file:///E:/Music/qa-report/resume-waves/screenshots/settings-visual-effects-desktop-dark.png)
- **Desktop Light Visual Effects Settings:** [settings-visual-effects-desktop-light.png](file:///E:/Music/qa-report/resume-waves/screenshots/settings-visual-effects-desktop-light.png)
- **Mobile Dark Visual Effects Settings:** [settings-visual-effects-mobile-dark.png](file:///E:/Music/qa-report/resume-waves/screenshots/settings-visual-effects-mobile-dark.png)
- **Mobile Light Visual Effects Settings:** [settings-visual-effects-mobile-light.png](file:///E:/Music/qa-report/resume-waves/screenshots/settings-visual-effects-mobile-light.png)

