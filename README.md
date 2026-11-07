# InIsai (இனிசை) — Every Beat, Your World

<div align="center">
  <h3>Every Beat, Your World.</h3>
  <p><strong>A modern, installable PWA music streaming application and personal audio player.</strong></p>
</div>

---

## 🎵 Overview

**InIsai (இனிசை)** represents sweet, melodious music. Inspired by the best interaction patterns of Apple Music, Spotify, and BloomeeTunes, InIsai delivers an ad-free, dark-first music listening experience featuring:
- **Zero Recurring Infrastructure Cost (₹0 / $0)**: Engineered specifically for Vercel Hobby and Supabase Free tier.
- **Genuine Progressive Web App (PWA)**: Installable on Android Chrome, iOS Safari, and desktop Chromium with standalone display mode, maskable icons, and service worker caching.
- **Web Audio FX Pipeline**: 5-Band parametric equalizer, dynamic Bass Boost, Treble Clarity, configurable Crossfade (0–12s), and real-time audio frequency visualizer.
- **Synchronized LRC Lyrics Engine**: Karaoke-style live auto-scrolling lyrics with line glow and manual sync calibration (+/- 0.5s).
- **Local Music Player**: Drag & drop or folder import for MP3, WAV, FLAC, and M4A audio files, stored 100% privately in origin-isolated IndexedDB without remote server uploads.
- **Modular Music Source Adapters**: Clean separation between metadata, search, and audio stream resolution (Curated Originals, Jamendo Creative Commons, and Local Storage).
- **Persistent Player & Media Session**: Seamless background playback with lock-screen media notifications and hardware headset controls.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router)
- **UI & Styling**: React 19, Tailwind CSS, Lucide Icons, Framer Motion
- **State Management**: Zustand with persistent storage
- **Audio Processing**: HTML5 Audio Element + Web Audio API (`AudioContext`, `BiquadFilterNode`, `GainNode`, `AnalyserNode`)
- **Backend & Auth**: Supabase PostgreSQL with Row Level Security (RLS) & Supabase Auth
- **Client Database**: IndexedDB via `idb-keyval` for local files and offline metadata
- **PWA**: Web App Manifest (`manifest.webmanifest`), Service Worker (`public/sw.js`), and Media Session API

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18.0 or newer)
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/your-username/inisai.git
cd inisai
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(Note: If Supabase credentials are not provided, InIsai automatically operates in offline-ready Guest Mode with full local music and curated catalog access).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Unit Tests
```bash
npm test
```

### 6. Build for Production
```bash
npm run build
npm start
```

---

## 📱 PWA Android Chrome Installation

1. Open InIsai in **Chrome on Android** (or any Chromium browser).
2. Tap the **Install App (நிறுவு)** button in the sidebar/header or tap Chrome's three-dot menu `⋮` and select **"Install app"** or **"Add to Home screen"**.
3. Confirm installation. InIsai will launch as a standalone, distraction-free app without browser address bars!

---

## 🔒 Copyright & Audio Compliance
InIsai strictly adheres to intellectual property standards:
- Commercial music services are never scraped, and DRM is never bypassed.
- Streaming catalogs feature legal Creative Commons, public domain, and authorized sample recordings.
- Personal music selected by the user remains entirely on the user's device and is never uploaded or redistributed.

---

## 📄 License
This project is licensed under the MIT License.

