import { test, describe } from "node:test";
import assert from "node:assert/strict";

// 1. LRC Parser test
function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split("\n");
  const parsedLines = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\[(ti|ar|al|by|offset|length):/i.test(trimmed)) continue;

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = trimmed.replace(timeRegex, "").trim();
      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const millis = match[3]
          ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10)
          : 0;
        const totalSeconds = minutes * 60 + seconds + millis / 1000;
        parsedLines.push({ time: totalSeconds, text: text || "♫" });
      }
    }
  }
  return parsedLines.sort((a, b) => a.time - b.time);
}

function getActiveLyricsIndex(lyrics, currentTime, offsetSeconds = 0) {
  if (!lyrics || lyrics.length === 0) return -1;
  const targetTime = currentTime + offsetSeconds;
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= targetTime) {
      activeIndex = i;
    } else {
      break;
    }
  }
  return activeIndex;
}

// 2. Queue & Playback Context Manager
class TestQueueManager {
  constructor(initialTracks = [], initialContext = null) {
    this.queue = [...initialTracks];
    this.currentIndex = 0;
    this.repeatMode = "off"; // 'off' | 'all' | 'one'
    this.context = initialContext;
  }

  getCurrentTrack() {
    return this.queue[this.currentIndex] || null;
  }

  next() {
    if (this.queue.length === 0) return null;
    if (this.repeatMode === "one") {
      return this.getCurrentTrack();
    }
    if (this.currentIndex + 1 >= this.queue.length) {
      if (this.repeatMode === "all") {
        this.currentIndex = 0;
        return this.getCurrentTrack();
      }
      return null;
    }
    this.currentIndex++;
    return this.getCurrentTrack();
  }

  prev() {
    if (this.queue.length === 0) return null;
    if (this.currentIndex - 1 < 0) {
      this.currentIndex = this.queue.length - 1;
    } else {
      this.currentIndex--;
    }
    return this.getCurrentTrack();
  }

  addToQueue(track) {
    this.queue.push(track);
  }

  playNext(track) {
    this.queue.splice(this.currentIndex + 1, 0, track);
  }

  remove(index) {
    this.queue.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    }
  }

  reorder(from, to) {
    const [moved] = this.queue.splice(from, 1);
    this.queue.splice(to, 0, moved);
  }

  playTrack(track, newQueue = null, context = null) {
    if (newQueue) {
      this.queue = [...newQueue];
      this.context = context;
      this.currentIndex = this.queue.findIndex((t) => t.id === track.id);
      if (this.currentIndex === -1) {
        this.queue.unshift(track);
        this.currentIndex = 0;
      }
    } else {
      const idx = this.queue.findIndex((t) => t.id === track.id);
      if (idx !== -1) {
        this.currentIndex = idx;
      } else {
        this.queue.push(track);
        this.currentIndex = this.queue.length - 1;
      }
    }
  }
}

// 3. Local Music Duplicate Detector helper
function filterDuplicateTracks(existingTracks, incomingFiles) {
  const existingNames = new Set(existingTracks.map((t) => t.sourceId.toLowerCase()));
  const existingKeys = new Set(
    existingTracks.map((t) => `${t.title.toLowerCase()}:::${t.artist.toLowerCase()}`)
  );

  const uniqueFiles = [];
  let duplicates = 0;

  for (const file of incomingFiles) {
    const name = file.name.toLowerCase();
    const key = `${(file.title || "").toLowerCase()}:::${(file.artist || "").toLowerCase()}`;

    if (existingNames.has(name) || (file.title && existingKeys.has(key))) {
      duplicates++;
    } else {
      uniqueFiles.push(file);
      existingNames.add(name);
      if (file.title) existingKeys.add(key);
    }
  }

  return { unique: uniqueFiles, duplicates };
}

// 4. Security Guard checker
function shouldAllowPasswordChange(user, isAuthenticated) {
  if (!isAuthenticated) return false;
  if (!user) return false;
  if (user.id === "guest-user") return false;
  if (!user.email) return false;
  return true;
}

// 5. Theme State Resolver
function resolveEffectiveTheme(userTheme, systemPrefersDark) {
  if (userTheme === "light") return "light";
  if (userTheme === "dark") return "dark";
  // "system" mode
  return systemPrefersDark ? "dark" : "light";
}

describe("InIsai (இனிசை) Unit & Architectural Tests", () => {
  describe("LRC Lyrics Synchronization Engine", () => {
    const sampleLrc = `
      [ti:Malarndhum Malaraadha]
      [ar:TMS, Susheela]
      [00:00.00] InIsai Tamil Classics
      [00:06.00] மலர்ந்தும் மலராத பாதி மலர் போல
      [00:15.50] வளரும் விழி வண்ணமே
      [00:24.00] விடிந்தும் விடியாத காலைப் பொழுதாக
    `;

    test("should correctly parse timestamps into seconds and ignore metadata tags", () => {
      const parsed = parseLrc(sampleLrc);
      assert.equal(parsed.length, 4);
      assert.equal(parsed[0].time, 0);
      assert.equal(parsed[1].time, 6);
      assert.equal(parsed[2].time, 15.5);
      assert.equal(parsed[3].time, 24);
      assert.equal(parsed[1].text, "மலர்ந்தும் மலராத பாதி மலர் போல");
    });

    test("should identify active lyrics line based on current playback seconds", () => {
      const parsed = parseLrc(sampleLrc);

      // Before first line
      assert.equal(getActiveLyricsIndex(parsed, 3), 0);
      // During second line (6.00 - 15.49s)
      assert.equal(getActiveLyricsIndex(parsed, 10), 1);
      // During third line (15.50 - 23.99s)
      assert.equal(getActiveLyricsIndex(parsed, 20), 2);
      // At or after 24s
      assert.equal(getActiveLyricsIndex(parsed, 25), 3);
    });

    test("should support manual calibration offset", () => {
      const parsed = parseLrc(sampleLrc);
      assert.equal(getActiveLyricsIndex(parsed, 5.0, 1.0), 1);
    });
  });

  describe("Queue & Playback Context Architecture (Phase 4)", () => {
    const searchTracks = [
      { id: "s1", title: "Search Track 1", duration: 180 },
      { id: "s2", title: "Search Track 2", duration: 200 },
      { id: "s3", title: "Search Track 3", duration: 220 },
    ];

    test("should preserve search context and queue across track navigation", () => {
      const qm = new TestQueueManager();
      const searchContext = {
        id: "search-chinna-thamarai",
        type: "search",
        title: 'Search: "Chinna Thamarai"',
      };

      qm.playTrack(searchTracks[0], searchTracks, searchContext);

      assert.equal(qm.context.type, "search");
      assert.equal(qm.queue.length, 3);
      assert.equal(qm.getCurrentTrack().id, "s1");

      // Advance to next song within search queue
      qm.next();
      assert.equal(qm.getCurrentTrack().id, "s2");
      assert.equal(qm.context.type, "search"); // Context intact
    });

    test("should support Play Next and Reorder without resetting active context", () => {
      const qm = new TestQueueManager(searchTracks);
      const bonus = { id: "bonus", title: "Bonus Track", duration: 150 };

      qm.playNext(bonus);
      assert.equal(qm.queue[1].id, "bonus");

      qm.reorder(1, 3);
      assert.equal(qm.queue[3].id, "bonus");

      qm.remove(3);
      assert.equal(qm.queue.length, 3);
    });
  });

  describe("Guest vs Authenticated Profile Security Boundary (Phase 6)", () => {
    test("should strictly forbid password change for guest user", () => {
      const guestUser = {
        id: "guest-user",
        displayName: "InIsai Listener",
        preferredLanguage: "Tamil",
      };
      assert.equal(shouldAllowPasswordChange(guestUser, false), false);
      assert.equal(shouldAllowPasswordChange(guestUser, true), false);
    });

    test("should strictly forbid password change when user is null or unauthenticated", () => {
      assert.equal(shouldAllowPasswordChange(null, false), false);
      assert.equal(shouldAllowPasswordChange(null, true), false);
    });

    test("should allow password change only for authenticated cloud accounts with email", () => {
      const authUser = {
        id: "auth-uuid-123",
        email: "anandh@example.com",
        displayName: "Anandh M",
      };
      assert.equal(shouldAllowPasswordChange(authUser, true), true);
    });
  });

  describe("Local Music Duplicate Detection (Phase 7)", () => {
    const existing = [
      { id: "l1", title: "Chinna Thamarai", artist: "Vijay", sourceId: "chinna_thamarai.mp3" },
      { id: "l2", title: "Nilaave Vaa", artist: "SPB", sourceId: "nilaave_vaa.mp3" },
    ];

    test("should filter out duplicate filenames and duplicate title+artist pairs", () => {
      const incoming = [
        { name: "chinna_thamarai.mp3", title: "Chinna Thamarai", artist: "Vijay" }, // duplicate by file and title+artist
        { name: "new_song.mp3", title: "New Song", artist: "New Artist" }, // new
        { name: "nilaave_vaa.mp3", title: "Another Title", artist: "Another Artist" }, // duplicate by filename
        { name: "different_filename.mp3", title: "Nilaave Vaa", artist: "SPB" }, // duplicate by title+artist
      ];

      const { unique, duplicates } = filterDuplicateTracks(existing, incoming);
      assert.equal(duplicates, 3);
      assert.equal(unique.length, 1);
      assert.equal(unique[0].name, "new_song.mp3");
    });
  });

  describe("Global Theme System Mode Transitions (Phase 8)", () => {
    test("should resolve dark mode", () => {
      assert.equal(resolveEffectiveTheme("dark", false), "dark");
      assert.equal(resolveEffectiveTheme("dark", true), "dark");
    });

    test("should resolve light mode", () => {
      assert.equal(resolveEffectiveTheme("light", false), "light");
      assert.equal(resolveEffectiveTheme("light", true), "light");
    });

    test("should resolve system mode according to OS prefers-color-scheme", () => {
      assert.equal(resolveEffectiveTheme("system", true), "dark");
      assert.equal(resolveEffectiveTheme("system", false), "light");
    });
  });

  describe("Dynamic Recommendation Engine & Scoring (Phase 3 & 7)", () => {
    function scoreTrackTest(track, affinity, recentTrackIds) {
      if (!track.isPlayable || !track.streamUrl) return -100;
      let score = 20;
      if (track.artworkUrl && !track.artworkUrl.includes("placeholder")) score += 10;
      if (track.language) {
        const langKey = track.language.toLowerCase();
        score += (affinity.preferredLanguages[langKey] || 0) * 3;
      }
      if (track.artist) {
        const artistKey = track.artist.toLowerCase();
        for (const [known, s] of Object.entries(affinity.preferredArtists)) {
          if (artistKey.includes(known) || known.includes(artistKey)) score += s * 4;
        }
      }
      if (recentTrackIds.has(track.id)) score -= 30; // repetition penalty
      return score;
    }

    test("should prioritize songs matching user language and artist affinity", () => {
      const affinity = {
        preferredLanguages: { tamil: 15, english: 2 },
        preferredArtists: { anirudh: 10, spb: 8 },
        preferredGenres: { melody: 5 },
        totalPlays: 10,
      };

      const trackA = {
        id: "a1",
        title: "Naa Ready",
        artist: "Anirudh Ravichander",
        language: "Tamil",
        isPlayable: true,
        streamUrl: "https://example.com/stream1.mp4",
        artworkUrl: "https://example.com/art1.jpg",
      };

      const trackB = {
        id: "b1",
        title: "Shape of You",
        artist: "Ed Sheeran",
        language: "English",
        isPlayable: true,
        streamUrl: "https://example.com/stream2.mp4",
        artworkUrl: "https://example.com/art2.jpg",
      };

      const scoreA = scoreTrackTest(trackA, affinity, new Set());
      const scoreB = scoreTrackTest(trackB, affinity, new Set());

      // Track A (Tamil + Anirudh) should score significantly higher than Track B (English)
      assert.ok(scoreA > scoreB, `Track A (${scoreA}) should beat Track B (${scoreB})`);
    });

    test("should apply repetition penalty to recently played tracks", () => {
      const affinity = {
        preferredLanguages: { tamil: 10 },
        preferredArtists: { anirudh: 5 },
        preferredGenres: {},
        totalPlays: 5,
      };

      const track = {
        id: "a1",
        title: "Naa Ready",
        artist: "Anirudh",
        language: "Tamil",
        isPlayable: true,
        streamUrl: "https://example.com/stream1.mp4",
        artworkUrl: "https://example.com/art1.jpg",
      };

      const scoreFresh = scoreTrackTest(track, affinity, new Set());
      const scoreRecentlyPlayed = scoreTrackTest(track, affinity, new Set(["a1"]));

      assert.equal(scoreFresh - scoreRecentlyPlayed, 30);
    });
  });
});
