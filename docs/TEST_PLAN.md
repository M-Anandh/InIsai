# InIsai (இனிசை) — Test Plan & Quality Assurance Strategy

## 1. Overview
This test plan defines the automated, unit, integration, and manual verification criteria for InIsai across web and mobile platforms.

## 2. Test Suites & Coverage

### Suite 1: Audio Engine & Queue Lifecycle
- **Queue Navigation:** Next, previous, loop around queue with `repeatMode: "all"` and `repeatMode: "one"`.
- **Playback Context:** Ensure queue is tied to an explicit `PlaybackContext` (`search`, `playlist`, `trending`, `album`, `artist`, `local`, `history`).
- **Play Next & Reorder:** Inserting a track immediately next in queue without resetting existing queue order.
- **Audio Scrubber:** Correct timestamp formatting and seek calculations.

### Suite 2: Authentication & Profile Guards
- **Guest Profile State:** Ensure unauthenticated guest sessions have `isAuthenticated = false`, display guest badge, and strictly suppress any password modification forms.
- **Authenticated Profile State:** Ensure authenticated sessions display user email, verified badge, and functional password update form.
- **Local Preferences:** Language and theme preferences persist locally regardless of authentication state.

### Suite 3: Local Music Engine & ID3 Tag Parser
- **File & Folder Pickers:** Validate extraction of `title`, `artist`, `album`, and duration.
- **Duplicate Prevention:** Avoid adding duplicate tracks if identical file name and title already exist.
- **IndexedDB Storage:** Verify blobs are stored in origin-isolated IndexedDB and revoked on cleanup.

### Suite 4: Real-time Discovery & Search
- **Trending API:** Ensure `/api/music/trending` returns valid songs across Tamil, Hindi, English, and Malayalam.
- **Search Querying:** Ensure search queries return deduplicated tracks and do not overwrite unrelated playback queues.
- **LRCLIB Lyrics Sync:** Accurate line-by-line highlighting with manual calibration offset.

### Suite 5: Responsive UI & Theme Modes
- **Theme Modes:** Dark (`#07080b`), Light (`#f8fafc`), and System preference sync.
- **Mobile Viewports:** Responsive behavior verified at 320px, 375px, 390px, 414px, 768px, 1024px, and 1920px.
- **Back Navigation:** In-app back button fallback and keyboard ESC key dismissal for modals.

## 3. Automation Execution
Automated tests are executed via Node.js built-in test runner:
```bash
npm test
```
All tests must pass with 0 failures before any git push.

