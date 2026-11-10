# InIsai (இனிசை) — Every Beat, Your World

<div align="center">
  <h3>Every Beat, Your World.</h3>
  <p><strong>A modern, installable PWA music streaming application powered by YouTube Music discovery, official IFrame playback, Web Audio DSP, and local playback.</strong></p>
</div>

---

## 🎵 Architecture Overview (v2.0)

InIsai follows a strict modular architecture cleanly separating catalog discovery from compliant playback engines:

### 1. Source Providers (`src/music/providers/`)
All catalogs implement the unified `SourceProvider` interface coordinated by `ProviderRegistry`:
- **`ytmusic` (Primary Metadata Catalog):** Isolated server-side adapter (`ytmusic-server.ts`) via `youtubei.js` (`retrieve_player: false`, metadata-only compliance) with in-memory LRU caching and YouTube Data API v3 fallback. Backs `/api/yt/suggest`, `/api/yt/search`, `/api/yt/home`, `/api/yt/charts`, `/api/yt/related`, `/api/yt/artist`, `/api/yt/album`, `/api/yt/playlist`, and `/api/yt/collections`.
- **`saavn` (Secondary & Background-Audio Fallback):** Direct 320kbps AAC regional catalog for Indian hits and opt-in background lock-screen audio fallback.
- **`local` (On-Device Audio):** IndexedDB offline storage (`idb-keyval`) for user MP3, WAV, FLAC, and M4A tracks without remote server upload.
- **Health & Toggles (`/settings/sources`):** Live latency probes and enable/disable switches per provider.

### 2. Capability-Based Playback Engines (`src/lib/player/`)
A persistent root `PlayerProvider` coordinates `EngineCoordinator` across two mutually exclusive engines:
- **`YouTubeIframeEngine` (`YT.Player` API):** Official YouTube IFrame Player API mounted persistently at the root without reloading across navigation or Video/Audio toggling (`10Hz` time polling, automatic alternate resolution/skip recovery on dead tracks). Zero raw stream extraction or ad bypass.
- **`AudioElementEngine` (`HTMLAudioElement` + Web Audio):** Dual-node player supporting true 0–12s crossfades, gapless pre-buffering, 5-band parametric EQ, real FFT visualizer, and automatic CORS DSP bypass so audio never silences.
- **Honest Engine-Aware UI:** Controls dynamically reflect active engine capabilities (`eq`, `visualizer`, `crossfade`, `speed`, `backgroundOnMobile`), hiding DSP sliders when YouTube IFrame is active and swapping FFT bars for an ambient sine ribbon.

### 3. Personalisation & Smart Radio (`src/lib/personalization/`)
- Records plays, completions (`>= 70%`), skips (`< 15s`), likes, repeats, searches, and time-of-day locally in IndexedDB with **30-day exponential half-life decay**.
- Powers Home's *Made For You*, *Your Daily Mixes 1–3*, *"Because you listened to..."* (`/api/yt/related`), and autoplay radio continuation.
- Full user transparency & privacy controls in Settings (view recorded signal summary, export JSON profile, reset all signals, optional ListenBrainz scrobble token).

### 4. Lyrics (`src/lib/lyrics-parser.ts`, `/api/music/lyrics`)
- Primary `LRCLIB` duration-matched `.lrc` sync with `YouTube Music` fallback.
- Apple-style word/line sync driven via `requestAnimationFrame`, tap-to-seek, `±0.5s` offset calibration, crisp `Noto Sans Tamil` rendering, and `அ→Aa` Tamil transliteration toggle.

---

## 🛠️ Documentation References
- [API & Runtime Network Audit (`docs/api-audit.md`)](./docs/api-audit.md)
- [Design System & UX Reference (`docs/design-reference.md`)](./docs/design-reference.md)
- [Changelog (`CHANGELOG.md`)](./CHANGELOG.md)

---

## 🚀 Quick Start & Testing
```bash
npm install
npm test        # 32 unit & architectural assertions
npm run build   # Next.js 15 App Router production build
npm start
```

---

## 🔒 Legal & Compliance Boundaries
- YouTube playback runs strictly via the **official YouTube IFrame Player API (`YT.Player`)**. No raw stream ripping, no ad blocking, and no YouTube offline downloads exist.
- Offline storage applies strictly to user-owned device files (`local`) and authorized audio sources.
