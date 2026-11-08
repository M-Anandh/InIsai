# InIsai (இனிசை) — Master Implementation Plan: Aurora Glass Upgrade

## 1. Objectives & Scope
Transform InIsai into a world-class music streaming platform implementing the **Aurora Glass** design system, dynamic multi-signal music discovery, seamless search queue synchronization, and a mobile-first responsive architecture.

---

## 2. Work Breakdown Structure

### Phase 1: Design Tokens & CSS Architecture
- **Tokens:** Define `--background: #080A12`, `--surface: #101522`, `--surface-elevated: #171D2C`, `--glass`, `--glass-border`, `--accent-primary: #9565FF`, `--accent-secondary: #20C7E8` in `src/app/globals.css`.
- **Tailwind Extension:** Update `tailwind.config.ts` with Aurora Glass color tokens, glass backdrop filters, and neon glow box-shadows.

### Phase 2: Dynamic Recommendation Engine & Music Discovery
- **Modules:** Create `src/lib/recommendations/recommendation-engine.ts` and `user-music-profile.ts`.
- **Signals:** Evaluate user preferred language, listening history recency, liked tracks, and trending charts.
- **Dynamic Featured Track:** Automatically select the optimal featured song dynamically instead of a hardcoded track, with caching to prevent jitter across re-renders.

### Phase 3: Desktop & Mobile Component Redesign
- **Header (`Header.tsx`):** Aurora Glass frosted bar with greeting, dynamic search bar, theme toggle, and profile/sign-in avatar.
- **Sidebar (`Sidebar.tsx`):** Grouped navigation (Discover, Library, Settings) with subtle neon active borders and collapse support.
- **Mobile Bottom Dock (`MobileNav.tsx`):** Translucent 4-tab glass bar (Home, Explore, Search, Library) with active glowing pills.
- **Music Carousel (`MusicCarousel.tsx`):** Touch-friendly horizontal carousels with smooth scroll-snap on mobile and desktop arrow navigation.
- **Music Card (`TrackCard.tsx`):** 1:1 artwork aspect ratio, ambient glow, floating play circle on hover, quick Play Next and Add to Queue actions.

### Phase 4: Homepage Transformation
- **Greeting & Quick Access:** Time-aware greeting ("Good morning / afternoon / evening") with 6-card quick recents grid.
- **Hero Featured Banner:** Dynamic featured track with ambient color glow, high-fidelity artwork, and instant play/queue buttons.
- **Dynamic Shelves:**
  1. Made for You (Personalized Recommendations)
  2. Trending Now (Live Catalog Charts)
  3. Tamil Love & Melodies (Categorized Discovery)
  4. Global English & Multi-Language Carousels
  5. Hand-Crafted Featured Playlists

### Phase 5: Verification & Quality Assurance
- Automated tests in `tests/inisai.test.mjs` verifying recommendation scoring, queue lifecycle, and theme transitions.
- Full Next.js production build (`npm run build`) ensuring 100% type safety and 0 compilation warnings.
- Push to GitHub `main` for instant Vercel production preview and deployment.

