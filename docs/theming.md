# InIsai Theming & Contrast Architecture

## Overview
InIsai supports seamless dual-mode theming (**Dark Mode** and **Light Mode**), honoring system preferences and user overrides, while strictly upholding **WCAG 2.1 AA** contrast standards ($4.5:1$ for body text, $3:1$ for large text and key UI controls).

---

## Surface Scopes

To avoid unreadable text caused by global style overrides or dark components leaking into light mode, InIsai uses **Surface Scopes**:

### 1. `.surface` (Default Light Theme Canvas)
Used for light mode pages (Profile, Library, Playlists, Liked Songs, Settings).
- `--on-surface`: `#16131F` (Dark purple-black, $\ge 12:1$ contrast against `#FBFAF8` cream)
- `--on-surface-muted`: `#3F3A4D` ($\ge 7:1$ contrast)
- `--on-surface-subtle`: `#5E586D` ($\ge 4.5:1$ contrast)
- `--accent-text`: `#5B3DF5` (High-contrast deep purple text)
- `--accent-hot-text`: `#C21F55` (High-contrast magenta text for Liked badges)
- `--accent-teal-text`: `#0A6E86` (High-contrast cyan/teal text)
- `--accent-emerald-text`: `#0B7A4B` (High-contrast green text)

### 2. `.surface-dark` / `[data-surface="dark"]` / `#fullscreen-player-root`
Used for components that are dark by design regardless of the overall app theme:
- **Full Screen Music Player** (`#fullscreen-player-root`)
- **Playing Queue View** (`QueueView`)
- **Create Playlist Dialogs & Modals**
- **Profile Dark Hero Cards**
- **Theme-Isolated Dialogs**

All children within a `.surface-dark` container resolve high-contrast light text (`#FFFFFF` and `rgba(255,255,255,0.85)`), preventing light-mode styles from making dark cards unreadable.

---

## Key Contrast Safeguards

1. **No Blanket Tag Overrides**: Never apply blanket `html.light h1-h4 { color: #16131F !important; }` without surface scope isolation.
2. **Dual-Theme Gradients**: Quick access cards and banners use soft pastel tints in light mode (e.g., `from-purple-50 via-white to-purple-50/50`) and deep saturated gradients in dark mode. Never place text over muddy mid-tone gradients.
3. **No Low-Opacity Text in Light Mode**: Avoid `text-white/60` or `text-slate-400/50` on light backgrounds. Use semantic colors like `text-slate-600` or `text-slate-700`.
4. **Resolved Theme Derivation**:
   ```ts
   const isLight = mounted && (
     theme === "light" ||
     (!theme && user?.theme === "light") ||
     (typeof document !== "undefined" && document.documentElement.classList.contains("light"))
   );
   ```
   Ensures guest users without a cloud profile correctly see light mode as active.

---

## Verification & CI Testing

- **Unit Tests**: `tests/theming-tokens.test.mjs` verifies presence of surface scopes, isolation of `#fullscreen-player-root`, and absence of destructive CSS overrides.
- **Pixel Sampling Contrast Check**: `e2e/contrast-pixels.spec.ts` (`npm run contrast:routes`) samples canvas pixels to guarantee $4.5:1$ minimum luminance ratio across all 12 routes.

