# InIsai (இனிசை) — API, Network & Runtime Audit

**Audit Date:** November 10, 2026  
**Target:** `https://in-isai.vercel.app/`  
**Verification Method:** REA MCP (`capture_browser_scenario` with Chromium 157) + Static Source Analysis

---

## 1. Live Network & Asset Audit (via REA MCP)

During a live headless Chromium inspection of `https://in-isai.vercel.app/` (`evidence_id: ev_ffa6b9179c6437603facaed65fe4369345a5b2114896072ec0cf98e155335535`), 260 network & resource events were captured:

### 1.1 Working Assets & Infrastructure
- **App Shell & Bundles:** Next.js 15 App Router static & dynamic chunks loaded HTTP `200`.
- **PWA Manifest:** `/manifest.webmanifest` (`1101` bytes) returned HTTP `200`, `display: standalone`, shortcuts configured.
- **Typography:** Google Fonts `Inter` and `Noto Sans Tamil` loaded HTTP `200` (`fonts.gstatic.com`).

### 1.2 Critical Failures Captured by REA
Multiple image URLs on the homepage and curated collections failed at the browser network layer with **`net::ERR_BLOCKED_BY_ORB`** (Opaque Response Blocking — caused when CDN URLs return stale 403/404 HTML payloads instead of JPEG content):
1. `https://c.saavncdn.com/254/Classical-Veena-Tamil-2015-500x500.jpg` — breaks **Peaceful Meditation & Ragas** cover.
2. `https://c.saavncdn.com/871/Kesariya-From-Brahmastra-Hindi-2022-20220717092820-500x500.jpg` — breaks **Kesariya** artwork.
3. `https://c.saavncdn.com/926/Maa-Tujhe-Salaam-Hindi-1997-20200827142442-500x500.jpg` — breaks **Vande Mataram** artwork.
4. `https://c.saavncdn.com/353/Moondram-Pirai-Tamil-1982-20200508133346-500x500.jpg` — breaks **Kanne Kalaimane** artwork.

**Remediation:** Build `<CoverImage>` with multi-stage fallback resolution (primary CDN $\rightarrow$ alternative provider artwork $\rightarrow$ 2×2 playlist mosaic $\rightarrow$ generated SVG/CSS gradient initials) and remove hardcoded stale URLs in favor of runtime provider resolution.

---

## 2. Current API Layer Audit & Gaps

### 2.1 Existing Endpoints
| Endpoint | Upstream Provider | Current Role | Identified Issues |
|---|---|---|---|
| `/api/music/search` | JioSaavn `search.getResults` + DES decryption | Primary search | Missing catalog coverage for non-Indian/newer tracks; missing instant autocomplete; returned single flat list without Albums/Artists/Playlists shelves. |
| `/api/music/youtube` | YouTube Data API v3 / HTML scrape | Secondary fallback | Scraped raw HTML fragile; did not use InnerTube music-mode (`youtubei.js`); raw `<iframe>` lacked `YT.Player` JS API + `origin`, causing Error 153 playback failures. |
| `/api/music/trending` | JioSaavn query-based pseudo-charts | Home & Explore | Static queries ("latest tamil top trending hits"), not real charts, mood shelves, or artist radios. |
| `/api/music/lyrics` | LRCLIB (`lrclib.net`) | Synced lyrics | Works well, needs word-timing support, YTMusic fallback, caching, and audio/iframe time-sync bridge. |
| `/api/music/recommend` | JioSaavn `reco.getrecos` | Auto-radio | Sparse for international/YT tracks; needs YTMusic `getUpNext` + taste-profile ranking. |

---

## 3. Target Source Provider Architecture

Every external source sits behind an isolated `SourceProvider` interface aggregated by `ProviderRegistry`:

1. **`ytmusic` (PRIMARY Catalog):**
   - Server-side adapter via `youtubei.js` in YouTube Music mode (`/api/yt/search`, `/api/yt/suggest`, `/api/yt/home`, `/api/yt/charts`, `/api/yt/related`, `/api/yt/artist`, `/api/yt/album`, `/api/yt/playlist`).
   - Automatic fallback to YouTube Data API v3 if InnerTube quota/request fails.
   - **Compliance Boundary:** Provides **metadata only** (IDs, titles, artists, albums, thumbnails, durations, lyrics browse IDs, up-next queues). Audio/video playback is strictly delegated to the official **YouTube IFrame Player API (`YT.Player`)**. Zero stream extraction, zero ad stripping, zero YouTube downloads.
2. **`saavn` (Secondary & Background-Audio Fallback):**
   - Retains JioSaavn API for classic regional catalog gaps and serves as the opt-in background-capable direct `<audio>` source when a mobile screen locks.
3. **`local` (Device Audio):**
   - User-selected local files (`File` / `Blob` / IndexedDB) supporting offline caching and full Web Audio DSP (EQ, crossfade, visualizer).
