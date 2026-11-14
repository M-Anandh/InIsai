# QA Report: Android Chrome Mobile Background Playback & UI Overhaul

**Target:** `https://in-isai.vercel.app/`  
**Date:** November 14, 2026  
**Status:** ALL TESTS PASSING (73 Unit & Architectural Tests, 0 Failures)  
**Production Build:** Clean Next.js 15.5.29 production compilation (0 errors)

---

## 1. Executive Summary & Root Cause Analysis

From real Android Chrome testing (11:32–11:41), six primary issues were identified and addressed:

| Issue | Root Cause | Fix Applied |
|---|---|---|
| **Background Play Pausing & Warning Banner** | Tracks like *"God Mode"* and *"Skyfall"* had title metadata noise (e.g. `(From "Karuppu")`) and minor video duration mismatches that caused the audio source matcher to miss and fall back to the YouTube iframe. | Server-side fuzzy audio matcher with 4 parallel query variants (`cleanTitle + artist`, `cleanTitle + film`, `cleanTitle`, `artist + cleanTitle`), film extraction, Jaro-Winkler + token set scoring, artist alias mapping, and adaptive duration tolerance curve. |
| **Search Dropdown Glitch** | The suggestions panel rendered inline without overflow clamping, overlaying the Best Match card, while duplicate search forms re-triggered the keyboard. | Unified search architecture: single search input (`#search-input`), bounded suggestion overlay (`max-h-[min(35vh,260px)]`, `z-40`), and auto-dismiss on submit, scroll, click, or Android back. |
| **Video Mode Inconsistency** | Toggle between Song and Video caused playback state divergence, layout shifts, and non-backgroundable iframe playback. | Complete elimination of Video option: removed Song/Video toggle buttons, video viewport, and video state. The player now renders dynamic artwork with ambient glow across all tracks. |
| **Header Status Bar Clipping** | Mobile phone notches clipped the Chevron and options buttons on Now Playing and Lyrics, while sitting lower on Queue. | Standardized player header across all tabs: `paddingTop: max(env(safe-area-inset-top, 0px), 8px)`, height `h-14` (56px), and 44px touch targets. |
| **Queue Horizontal Overflow** | Title and artist text containers lacked `min-w-0`, causing text to push reorder and remove buttons off-screen on 360px viewports. | Strict flex truncation: `min-w-0 overflow-hidden text-ellipsis`, `overflow-x-hidden` container, and 36px/40px touch controls. |
| **Lyrics Glitches & Layout Shift** | Auto-scroll used element `.scrollIntoView()` on every frame, fighting user touches, while active line font scaling caused jumpiness. | Container-based smooth scroll (`container.scrollTo`), 4-second user manual scroll detection with floating "Auto Sync" button, and non-shifting font sizing. |

---

## 2. Matcher Test Fixtures & Coverage Diagnostic

Tested with live audio sources via `scratch/test-audio-match.mjs`:

| Track Query | Clean Title | Extracted Film | Matched Title & Artist | Match Score | Stream URL Resolved |
|---|---|---|---|---|:---:|
| `God Mode (From "Karuppu")` | God Mode | Karuppu | God Mode (Vishnu Edavan, Sai Abhyankkar) | **0.968** | YES |
| `Skyfall` | Skyfall | None | Skyfall (Adele) | **1.000** | YES |
| `One Name (From "Jailer 2")` | One Name | Jailer 2 | One Name (Anirudh Ravichander, Super Subu) | **0.985** | YES |
| `Vibe Venuma (From "Meesaya Murukku 2")` | Vibe Venuma | Meesaya Murukku 2 | Vibe Venuma (Hiphop Tamizha, Kaushik Krish) | **0.865** | YES |
| `Chinna Thamarai` | Chinna Thamarai | Vettaikaaran | Chinna Thamarai (Vijay Antony, Krish, Suchitra) | **0.985** | YES |
| `Believer` | Believer | None | Believer (Imagine Dragons) | **0.950** | YES |
| `On My Way` | On My Way | None | On My Way (Alan Walker, Sabrina Carpenter) | **0.865** | YES |

**Measured Coverage:** **100%** of tested target tracks resolved to direct audio streams (`score >= 0.865`).

---

## 3. Playback & Settings Architecture

1. **Background Play by Construction:**
   - Songs resolve to direct backgroundable audio streams played via `<audio id="inisai-persistent-audio">`.
   - YouTube iframe background warning banner is hidden by default and only shown if the user explicitly turns ON *"Show foreground-only songs"* in Settings → Playback.
   - When displayed, the warning banner is positioned safely at `bottom-24` on mobile so it never covers the player header buttons.
2. **"Wrong version?" Selection:**
   - FullScreenPlayer overflow menu (⋯) includes a *"Wrong version?"* option.
   - Opens `WrongVersionModal` showing top 5 candidate matches with metadata, duration, match score, and one-tap choice saving.
3. **Responsive Mobile Standards:**
   - Tested and verified on viewports: 360×640, 390×844, 412×915, and 430×932.
   - Zero horizontal overflow (`scrollWidth <= clientWidth`).

---

## 4. Verification Evidence

- **Unit Tests:** `node --test tests/**/*.test.mjs`
  - 73 passed, 0 failed across 30 test suites.
- **Production Build:** `npm run build`
  - Exit code 0, 39/39 static & dynamic pages successfully generated.

