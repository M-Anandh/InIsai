# InIsai (இனிசை) — API & Network Audit

**Audit Date:** November 10, 2026  
**Auditor:** Senior Full-Stack Engineer / Product Architect  
**Application Target:** InIsai (`https://in-isai.vercel.app/`)

---

## 1. Internal Application Endpoints

### 1.1 Search Endpoint: `/api/music/search`
* **Route Path:** `src/app/api/music/search/route.ts`
* **HTTP Method:** `GET`
* **Parameters:**
  * `q` (string, required): The search query (e.g. `on my way alan walker`, `believer`).
* **Upstream Providers:**
  * **Primary:** JioSaavn Search API (`https://www.jiosaavn.com/api.php?__call=search.getResults&api_version=4&_format=json&n=25`)
  * **Fallback:** JioSaavn Autocomplete API (`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&includeMetaTags=1`)
* **Payload Structure Returned:**
  ```json
  {
    "results": [
      {
        "id": "saavn-I9JGz6Jy",
        "title": "On My Way",
        "artist": "Alan Walker, Sabrina Carpenter, Farruko",
        "album": "On My Way",
        "duration": 217,
        "artworkUrl": "https://c.saavncdn.com/...",
        "streamUrl": "https://aac.saavncdn.com/..._320.mp4",
        "sourceType": "public_api",
        "sourceId": "I9JGz6Jy",
        "language": "english",
        "isPlayable": true
      }
    ]
  }
  ```
* **Issues Identified in Audit:**
  1. Default fallback set `language = "Tamil"` if `moreInfo.language` was empty, even if `item.language` was English.
  2. Sub-string sorting penalized multi-word queries like `on my way alan walker` because title comparison prioritized covers that explicitly had "Alan Walker" in the title string over the original whose title is simply "On My Way".
  3. Single-provider query without parallel multi-provider fallback.

---

### 1.2 YouTube Bridge Endpoint: `/api/music/youtube`
* **Route Path:** `src/app/api/music/youtube/route.ts`
* **HTTP Method:** `GET`
* **Parameters:**
  * `q` (string, required): Search query.
* **Upstream Providers:**
  * YouTube Data API v3 (`https://www.googleapis.com/youtube/v3/search`) when `YOUTUBE_API_KEY` is present.
  * Public HTTPS metadata bridges (Invidious instances: `https://inv.tux.pizza`, `https://vid.puffyan.us`, `https://invidious.nerdvpn.de`) for resilient zero-credential operation.
* **Payload Structure Returned:**
  ```json
  {
    "results": [
      {
        "id": "yt_dQw4w9WgXcQ",
        "title": "Song Title",
        "artist": "Channel / Artist",
        "duration": 213,
        "artworkUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        "streamUrl": "",
        "sourceType": "youtube",
        "youtubeVideoId": "dQw4w9WgXcQ",
        "sourceAttribution": "YouTube Music / Google LLC (Embedded Player)",
        "isPlayable": true
      }
    ]
  }
  ```

---

### 1.3 Trending & Charts Endpoint: `/api/music/trending`
* **Route Path:** `src/app/api/music/trending/route.ts`
* **HTTP Method:** `GET`
* **Parameters:**
  * `category` (optional, default `"tamil"`): Options: `tamil`, `tamil_melody`, `tamil_love`, `hindi`, `english`, `telugu`, `malayalam`.
* **Upstream Provider:**
  * JioSaavn Chart Query API with DES-ECB 320kbps media stream decryption.
* **Caching Strategy:**
  * Next.js ISR cache (`revalidate: 7200` seconds / 2 hours).

---

### 1.4 Synchronized Lyrics Endpoint: `/api/music/lyrics`
* **Route Path:** `src/app/api/music/lyrics/route.ts`
* **HTTP Method:** `GET`
* **Parameters:**
  * `track` (string, required)
  * `artist` (string, required)
* **Upstream Provider:**
  * LRCLIB API (`https://lrclib.net/api/get` with fallback to `https://lrclib.net/api/search`).
* **Returns:**
  * `plainLyrics` (string)
  * `syncedLyrics` (string in `[mm:ss.xx]` LRC format)

---

### 1.5 Auto-Radio & Recommendations: `/api/music/recommend`
* **Route Path:** `src/app/api/music/recommend/route.ts`
* **HTTP Method:** `GET`
* **Parameters:**
  * `id` (source track ID)
  * `artist` (artist name)
* **Upstream Provider:**
  * JioSaavn Reco API (`__call=reco.getrecos`) scored against user language and artist affinity.

---

## 2. Stream Resolution & CDN Audio Architecture

* **Decryption Scheme:** Media URLs are decrypted server-side from `encrypted_media_url` using DES in ECB mode with padding Pkcs7 and static key `38346591`.
* **Stream Quality:** All resolved streams upgrade `_96.mp4` and `_160.mp4` to `_320.mp4` (320 kbps AAC container).
* **Delivery:** Delivered over HTTPS directly from `aac.saavncdn.com`.
* **Player Support:** HTML5 `<audio>` element with native hardware decoding.
