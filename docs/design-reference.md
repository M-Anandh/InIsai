# InIsai (இனிசை) — Design & UX Reference Specification

**Date:** November 10, 2026  
**References Studied:** BitChord (`kushagrasinghx/BitChord` / `bitchord.org`), Apple Music Web (`music.apple.com`), Spotify Web (`open.spotify.com`)

---

## 1. BitChord Architectural & Aesthetic Takeaways

Note: **BitChord is GPL-3.0 licensed.** InIsai strictly adopts structural, visual, and UX design patterns only — zero source code or assets are copied.

1. **Audio-First Multi-Source Design:**
   - Pluggable source architecture with per-provider health diagnostics and enable/disable switches (`/settings/sources`).
   - Clean distinction between catalog metadata search and engine playback capabilities.
2. **Dynamic Artwork-Driven Canvas:**
   - Extract dominant & accent hues from the currently playing cover art to set `--accent-dynamic` (clamped for WCAG AA readability) and project a soft, blurred aurora backdrop in the Now Playing experience (`transition: 600ms`).
3. **Apple Music Inspired Frosted Glass & Layered Depth:**
   - Navigation rails, floating mini-player, and full-screen bottom sheets use `backdrop-filter: blur(24px) saturate(160%)` over hairline translucencies.
   - Graceful fallback solid/high-opacity surfaces when `@media (prefers-reduced-transparency: reduce)` is active or on low-power profiles.
4. **Honest Engine-Aware Controls:**
   - Never render fake audio data or non-functional DSP controls.
   - Web Audio API (5–10 band EQ, FFT visualizer, 0–12s dual-node crossfade, gapless pre-buffer) operates exclusively on direct audio sources (`saavn`, `local`).
   - When `YouTubeIframeEngine` (`YT.Player`) is active, cross-origin restrictions prevent Web Audio taps — UI cleanly swaps FFT bars for a calm ambient motion wave and shows playback rate (`0.5–2×`), sleep timer, lyrics, and optional video mode.
5. **Apple-Style Synced Lyrics:**
   - Active line bold & crisp at center viewport, adjacent lines gently scaled down, dimmed, and blurred (`blur(0.5px)`), eased auto-scroll, tap-to-seek, ±0.5s sync offset, and word/syllable highlight interpolation.
6. **"Stats for Nerds" Diagnostics:**
   - Optional technical overlay displaying active playback engine (`YT.Player` vs `HTMLAudioElement`), catalog source (`ytmusic` / `saavn` / `local`), track/video ID, buffer %, playback rate, and estimated latency.

---

## 2. Color Palette & Design System Tokens

### 2.1 Cinematic Dark Palette (Default Dark)
- `--bg-ink`: `#0B0A10` (primary obsidian canvas)
- `--bg-surface`: `#13111B` (elevated containers, sidebars)
- `--bg-raised`: `#1C1928` (cards, inputs, interactive sheets)
- `--glass-bg`: `rgba(255, 255, 255, 0.06)`
- `--text-primary`: `#F6F3EE` (warm pearl white — easier on eyes than stark `#FFFFFF`)
- `--text-secondary`: `#B9B2C6`
- `--text-muted`: `#7C7690`
- **Brand Accents:**
  - Turmeric: `#FF8A3D`
  - Rose: `#FF3D77`
  - Indigo: `#7A5CFF`
  - Brand Gradient: `linear-gradient(135deg, #FF8A3D 0%, #FF3D77 50%, #7A5CFF 100%)`

### 2.2 Designed Editorial Light Palette (Cream Studio)
Designed cleanly for high legibility without raw inversion:
- `--bg-ink`: `#FBF7F1` (warm editorial cream)
- `--bg-surface`: `#FFFFFF` (clean floating planes with subtle shadow `0 4px 20px rgba(27, 24, 36, 0.06)`)
- `--bg-raised`: `#FFFFFF`
- `--glass-bg`: `rgba(255, 255, 255, 0.85)`
- `--text-primary`: `#1B1824` (deep warm ink)
- `--text-secondary`: `#524B63`
- `--text-muted`: `#7C7690`
- **Contrast-Hardened Light Accents:**
  - Turmeric: `#D95F12`, Rose: `#D91B57`, Indigo: `#5D3DF2`

---

## 3. Typography, Spacing & Motion Standards

- **Font Pairing:** Display headings in `Outfit` / `Plus Jakarta Sans` + UI copy in `Inter` + crisp Tamil script in `Noto Sans Tamil`.
- **Fluid Scale:** `clamp()` sizes so headings never wrap awkwardly on 360px screens.
- **Standard Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` across 150–400ms transitions animating strictly `transform` and `opacity` (honoring `prefers-reduced-motion`).
- **Mobile-First Rules (`360px–430px`):**
  - Minimum `44×44px` touch targets on all player and header buttons.
  - One-line mobile top bar (App Icon + "InIsai", expandable search button, theme toggle, avatar — no wrapping pills).
  - Floating MiniPlayer positioned cleanly `12px` above the bottom tab bar with swipe left/right track skipping and tap/swipe-up expansion.
  - Now Playing bottom sheet uses top-left ChevronDown collapse (no verbose "Close" pill), centered "Now Playing" label, top-right `⋯` overflow menu, drag handle + swipe-down dismissal, heart button beside the title, and bottom action sheet triggers (`Lyrics`, `Queue`, `FX`, `Sleep`).

