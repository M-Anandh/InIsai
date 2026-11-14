# InIsai Production QA & Remediation Report (Install App, Delete Account, Player Cleanup, Mobile Background Playback)

**Target URL:** `https://in-isai.vercel.app/`  
**Deployed Commits Verified:** `b23918d`, `1a4ce98` (with follow-up E2E timeout/report commit on `main`)  
**Service Worker Version (Production):** `inisai-pwa-v2.2.0` (`GET /sw.js` verified, `GET /manifest.webmanifest` HTTP 200)

---

## 1. Root-Cause Findings (Git Archaeology & Runtime Audit)

1. **"Install App" missing on Desktop & Mobile**
   - **Root Cause:** Commit `aed4bd2` (`fix(prod): resolve layout crash, fullscreen player overlap, search card contrast, and upscale artwork`, Nov 11, 2026) removed `<PWAInstaller />` from `src/components/layout/Sidebar.tsx` and `src/components/layout/Header.tsx`. Additionally, `PWAInstaller` previously returned `null` whenever `!deferredPrompt && !isIOS`, hiding the entry point on Firefox, Desktop Safari, and browsers that delay or withhold `beforeinstallprompt`.
   - **Additional Critical Discovery:** `src/components/pwa/SWUpdateNotifier.tsx` listened to `navigator.serviceWorker.addEventListener("controllerchange", ...)` and triggered `window.location.reload()` unconditionally—meaning first-time visitors without an existing controller (`hadController === false`) were force-reloaded ~1 second after initial page load when `sw.js` claimed the client.

2. **"Delete account" missing on Profile & incomplete Guest/Re-auth flow**
   - **Root Cause:** Commit `284d905` introduced `"Delete Account"` only in `src/app/settings/page.tsx` and `src/app/api/account/delete/route.ts`. It was never wired into `src/app/profile/page.tsx`, had no Guest equivalent (`"Clear local data"` + `"Sign in to manage an account"` + `"Download my data (JSON)"`), lacked a 5-minute session-age re-authentication gate, and did not clean up IndexedDB or portal modals above the sticky `<header>`.

3. **Full-screen player ⋯ menu clutter & unwanted labels**
   - **Root Cause:** `src/components/player/FullScreenPlayer.tsx` rendered unwanted menu actions (*Manage Audio Sources*, *Go to Artist*, *Go to Album*) and a `"YouTube Music"` / `"InIsai Audio"` source chip, while `src/components/player/WaveVisualizer.tsx` rendered a `"Live Audio Wave"` / `"Ambient Wave"` label.

4. **Unreliable Mobile Background Playback**
   - **Root Cause:**
     - `public/sw.js` did not explicitly bypass `Range` requests or `audio`/`video` destinations, risking interrupted media streaming/seeking.
     - `AudioElementEngine` attached `AudioContext.createMediaElementSource()` even on mobile/iOS browsers where backgrounding suspends the Web Audio graph and silences audio.
     - `EngineCoordinator` lacked `128x128` artwork sizes and throttled `setPositionState` updates.
     - `player-store` did not distinguish explicit `userPaused` from OS/browser interruptions, did not pre-resolve the next track's direct audio URL ~20s before track end, and `ProviderRegistry.findAudioMatch` lacked a strict ±3s duration match tolerance.

---

## 2. Implemented Fixes

### Step 0 — Feature-Presence Regression Gate & CI
- **`e2e/feature-presence.spec.ts`**: Enforces presence of Install App, Delete account / Clear local data, Add to playlist (⋯ menu), Sleep Timer, Sign in / Sign out, Liked Songs, Downloads & Offline, Settings, and Profile across `desktop-dark`, `desktop-light`, `mobile-dark`, and `mobile-light`.
- **`.github/workflows/ci.yml`**: Runs `npx tsc --noEmit`, `npm test`, `npm run build`, and `e2e/feature-presence.spec.ts`.

### Step 1 — Restore "Install App" (Desktop + Mobile)
- **`src/components/pwa/InstallProvider.tsx` & `src/app/layout.tsx`**: Added inline `<head>` pre-capture (`window.__inisaiDeferredPrompt`) plus global `InstallProvider` handling `beforeinstallprompt`, `appinstalled`, standalone detection, 14-day mobile banner dismissal cooldown (`inisai_install_banner_dismissed_at`), iOS Safari illustrated Share → Add to Home Screen bottom sheet, fallback instructions for Firefox/Safari/Chromium, and `getDiagnostics()`.
- **`src/components/pwa/PWAInstaller.tsx`**: Implemented `banner` (`md:hidden` on Home), `sidebar` (Desktop bottom of `src/components/layout/Sidebar.tsx`, no duplicate in `Header`), `row` (`src/app/settings/page.tsx` → App, and `src/app/profile/page.tsx` on mobile), and `button` variants; automatically hidden when already installed (`isInstalled`).
- **`src/app/debug/page.tsx`**: Added `[data-testid="pwa-install-diagnostics"]` showing installability and banner cooldown state (`/debug?debug=1`).
- **`src/components/pwa/SWUpdateNotifier.tsx`**: Fixed first-visit reload bug with `const hadController = Boolean(navigator.serviceWorker.controller)`.

### Step 2 — Restore "Delete account" & Guest Data Controls
- **`src/components/account/AccountDangerZone.tsx`**:
  - **Signed-in (Settings & Profile):** `"Download my data (JSON)"` export, `"Delete account"` modal (via `createPortal(..., document.body)` above sticky `<header>`), 5-minute session-age re-auth gate (password `signInWithPassword` or Google OAuth re-auth), and `"DELETE"` confirmation input.
  - **Guest (Settings & Profile):** `"Download my data (JSON)"`, `"Clear local data"` confirmation modal, and `"Sign in to manage an account"` CTA.
- **`src/app/api/account/delete/route.ts`**: Uses `SUPABASE_SERVICE_ROLE_KEY` to delete user rows across `playlist_items`, `liked_songs`, `liked_tracks`, `playlists`, `history`, `listening_history`, `signals`, `taste_profiles`, `profiles`, removes storage objects in `avatars` and `user-data`, revokes sessions (`adminClient.auth.admin.signOut(token, "global")`), and deletes the auth user (`adminClient.auth.admin.deleteUser(userId)`), returning HTTP 500 on admin failure.
- **`src/lib/user-data.ts` & `src/stores/auth-store.ts`**: Expanded `purgeAllLocalUserData()` to clear IndexedDB databases and extra `localStorage` keys; `auth-store` propagates non-OK responses from `/api/account/delete`.

### Step 3 — Full-Screen Player Cleanup & "Movie songs"
- **`src/components/player/FullScreenPlayer.tsx` & `src/components/player/WaveVisualizer.tsx`**: Removed `"YouTube Music"` / `"InIsai Audio"` chip and `"Live Audio Wave"` / `"Ambient Wave"` label; restricted ⋯ overflow menu strictly to 5 items: *Add to Playlist*, *Share Song*, *Sleep Timer*, *Movie songs*, and *Stats for Nerds*.
- **`src/music/providers/ytmusic-server.ts` & `src/app/api/yt/resolve-movie/route.ts`**: Added `ytResolveMovieAlbum` and enriched `ytAlbumDetails` (`year`, `musicDirector`, `totalDurationSec`, `normalizeThumb`). Verified live on production (`/api/yt/resolve-movie?title=Chinna%20Thamarai&album=Vettaikaaran&artist=Vijay%20Antony` → `MPREb_VjFjRxuJCX1`).
- **`src/app/album/[id]/page.tsx`**: Added loading skeleton, 10s timeout + Retry, header metadata, **Play all**, Fisher-Yates **Shuffle**, highlighted/auto-scrolled active track (`?highlight=...`), and `"Back to player"` button (`?fromPlayer=1`).

### Step 4 — Mobile Background Playback Hardening
- **`src/components/player/PlayerProvider.tsx` & `src/lib/player/AudioElementEngine.ts`**: Mounted single persistent `<audio id="inisai-persistent-audio" playsInline preload="auto">` element bound via `bindDomElement()`; skipped `createMediaElementSource()` on mobile/iOS (`isMobileOrIOS()`).
- **`src/lib/player/EngineCoordinator.ts`**: Added `96/128/256/512` MediaMetadata artwork, throttled `setPositionState` (~1/sec), `playImmediateAudio()`, and `isAudioElementPaused()`.
- **`src/stores/player-store.ts` & `src/music/providers/ProviderRegistry.ts`**: Added `userPaused` tracking, visibility resume on `visible` if `!userPaused`, 20s pre-resolution cache (`preResolvedStreams`, 2h TTL), synchronous `handleTrackEndedFastAdvance` with single retry, and ±3s duration tolerance in `findAudioMatch`.
- **`public/sw.js`**: Bumped to `inisai-pwa-v2.2.0` and bypassed `Range` header requests and `audio`/`video` destinations.
- **`src/app/settings/page.tsx`**: Updated setting label to `"Background-friendly playback"` (ON by default) with note `"Some songs only play while the app is open"`.
- **`src/components/player/MiniPlayer.tsx`**: Added `role="button" tabIndex={0} aria-label="Expand full screen player" data-testid="mini-player-expand"`.

---

## 3. Step 5 — Capacitor Android Wrapper Plan (Plan Only — Not Implemented)

If native Android background playback reliability (beyond browser/PWA constraints for YouTube-only tracks or aggressive OEM battery killers) is needed:
1. **Scaffold Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)** pointing `webDir` or `server.url` at the Next.js build / production origin.
2. **Native Media Foreground Service**: Add `@capawesome-team/capacitor-android-foreground-service` or a custom Android `MediaSessionService` (`androidx.media3`) with `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission and lock-screen notification controls so Android does not suspend audio when the screen locks.
3. **Audio Focus & Becoming-Noisy Handling**: Wire `AudioManager` focus loss/ducking and `ACTION_AUDIO_BECOMING_NOISY` (headphone disconnect) into `player-store` `userPaused` state.
4. **Build & Play Store Signing**: Configure Gradle release signing, adaptive icons from `public/icons/`, and TWA/Capacitor deep links.
- **Estimated Effort:** ~3–5 engineering days (1 day Capacitor + foreground service wiring, 1–2 days Media3/bridge testing across OEM devices, 1–2 days Play Console packaging & QA).

---

## 4. Verification & Device Checklist

### Automated Checks
- **Unit Tests (`npm test`):** `67` tests across `30` suites — **67 passed, 0 failed** (including `tests/background-and-install.test.mjs`).
- **Production E2E (`npx playwright test e2e/feature-presence.spec.ts --config=playwright.config.ts --workers=2`):** **16/16 passed** across `desktop-dark`, `desktop-light`, `mobile-dark`, `mobile-light` against `https://in-isai.vercel.app/`.
- **Production Audit (`npx playwright test e2e/production-audit.spec.ts --config=playwright.config.ts --project=desktop-dark --project=mobile-light`):** **6/6 passed**.
- **Production Endpoints:** `GET /manifest.webmanifest` → HTTP `200`; `GET /sw.js` → `inisai-pwa-v2.2.0`; `GET /api/yt/resolve-movie` → resolved `MPREb_VjFjRxuJCX1`.
- **Lighthouse CLI:** Not run (`lighthouse` package not installed in local environment).

### Device & Browser Matrix

| Target Environment | Install App | Delete Account / Clear Data | Player ⋯ Menu | Background Playback |
| :--- | :--- | :--- | :--- | :--- |
| Desktop Chromium (`1440×900`, Dark & Light, Playwright) | Passed | Passed | Passed | N/A (automated DOM/unit verified) |
| Mobile Chromium Emulation (`390×844`, Dark & Light, Playwright) | Passed | Passed | Passed | N/A (automated DOM/unit verified) |
| Physical Android Chrome (Browser) | not tested | not tested | not tested | not tested |
| Physical Android Chrome (Installed PWA) | not tested | not tested | not tested | not tested |
| Physical iOS Safari (Browser) | not tested | not tested | not tested | not tested |
| Physical iOS Safari (Installed Home Screen PWA) | not tested | not tested | not tested | not tested |

---

## 5. Production Environment Checklist (Vercel & Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` — Required in Vercel Production scope.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Required in Vercel Production scope.
- `SUPABASE_SERVICE_ROLE_KEY` — **Required** in Vercel Production scope for `/api/account/delete` (`adminClient.auth.admin.signOut` and `adminClient.auth.admin.deleteUser`).

---

## 6. Captured Screenshots (`qa-report/install-delete-player/screenshots/`)
- `delete-modal-desktop-dark.png`
- `delete-modal-desktop-light.png`
- `delete-modal-mobile-dark.png`
- `delete-modal-mobile-light.png`
- `guest-profile-desktop-dark.png`
- `guest-profile-desktop-light.png`
- `guest-profile-mobile-dark.png`
- `guest-profile-mobile-light.png`
- `ios-install-sheet-desktop-dark.png`
- `ios-install-sheet-desktop-light.png`
- `ios-install-sheet-mobile-dark.png`
- `ios-install-sheet-mobile-light.png`
- `player-overflow-desktop-dark.png`
- `player-overflow-desktop-light.png`
- `player-overflow-mobile-dark.png`
- `player-overflow-mobile-light.png`

