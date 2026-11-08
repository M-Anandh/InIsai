# InIsai (இனிசை) — YouTube Music Discovery & Playback Architecture

**Specification:** Legally Compliant YouTube Music Discovery & IFrame Playback  
**Date:** November 8, 2026  
**Compliance Standard:** YouTube API Services Developer Policies & Terms of Service  

---

## 1. Architectural Strategy & Compliance Guarantees

In accordance with YouTube Developer Policies and Google Terms of Service:
1. **Zero Stream Ripping / Audio Extraction**: InIsai does **NOT** download, convert, extract, or intercept audio streams from YouTube videos.
2. **Official YouTube IFrame Player**: All YouTube Music tracks are played exclusively via the **official YouTube IFrame Player API** (`https://www.youtube.com/iframe_api`), ensuring required video presentation, controls, branding, and advertising capabilities remain intact.
3. **Mandatory Source Attribution**: When a track originates from YouTube, InIsai clearly displays the source badge ("YouTube Music / Google LLC"), the original video title, and the publishing artist/channel name.
4. **Graceful Handling of Embed Restrictions**: The application detects `unplayable`, `private`, `region-restricted`, and `embedding_disabled` video events and presents clear user feedback or automatically skips to the next track in the queue.

---

## 2. API Endpoints & Discovery Integration

### 2.1 Route: `/api/music/youtube`
Provides search and discovery querying the official **YouTube Data API v3** (`https://www.googleapis.com/youtube/v3/search`):
- **Parameters:**
  - `q`: Search query (e.g. "Chinna Thamarai", "Naa Ready Anirudh", "A.R. Rahman Live")
  - `category`: Preset language filters (`tamil`, `english`, `hindi`, `telugu`, `malayalam`)
  - `maxResults`: Default 20 results (max 50)
- **Filters Applied:**
  - `videoCategoryId=10` (Music category)
  - `type=video`
  - `videoEmbeddable=true` (Ensures only playable, embed-enabled music videos are returned)
- **Resilient Fallback Mode:**
  - If `YOUTUBE_API_KEY` is not present in `.env.local` or quota is temporarily exceeded, the server route automatically activates an authenticated public metadata proxy and fallback catalog so development and production users can discover and preview YouTube music without broken UI states.

---

## 3. Playback Source Abstraction

InIsai unifies playback under the `IMusicPlaybackSource` interface:

```typescript
export type AudioSourceType = "public_api" | "local" | "youtube" | "jamendo" | "curated";

export interface PlaybackSourceCapabilities {
  supportsSeek: boolean;
  supportsVolume: boolean;
  supportsEqualizer: boolean; // Web Audio API filters only apply to CORS-enabled audio streams
  requiresEmbeddedPlayer: boolean; // True for YouTube IFrame Player
  sourceAttribution: string;
}
```

When a user plays a YouTube track:
1. `audioEngine` pauses any active HTML5 audio stream.
2. The UI renders the official YouTube IFrame player docked or in full-screen mode.
3. Player events (`onStateChange`, `onEnded`, `onError`) trigger the global `usePlayerStore.nextTrack()` ensuring queue continuity.

