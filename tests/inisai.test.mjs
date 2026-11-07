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

// 2. Queue logic test
class TestQueueManager {
  constructor(initialTracks = []) {
    this.queue = [...initialTracks];
    this.currentIndex = 0;
    this.repeatMode = "off"; // 'off' | 'all' | 'one'
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
}

describe("InIsai (இனிசை) Unit Tests", () => {
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
      // With +1s calibration at time 5s, target time is 6s which activates line 1
      assert.equal(getActiveLyricsIndex(parsed, 5.0, 1.0), 1);
    });
  });

  describe("Queue & Playback Controller", () => {
    const tracks = [
      { id: "t1", title: "Track 1", duration: 180 },
      { id: "t2", title: "Track 2", duration: 200 },
      { id: "t3", title: "Track 3", duration: 220 },
    ];

    test("should navigate next and previous correctly", () => {
      const qm = new TestQueueManager(tracks);
      assert.equal(qm.getCurrentTrack().id, "t1");

      qm.next();
      assert.equal(qm.getCurrentTrack().id, "t2");

      qm.next();
      assert.equal(qm.getCurrentTrack().id, "t3");

      // End of queue when repeat is off
      const beyond = qm.next();
      assert.equal(beyond, null);

      // Previous returns t2
      qm.prev();
      assert.equal(qm.getCurrentTrack().id, "t2");
    });

    test("should repeat all when repeatMode is 'all'", () => {
      const qm = new TestQueueManager(tracks);
      qm.repeatMode = "all";
      qm.currentIndex = 2; // at last track
      qm.next();
      assert.equal(qm.getCurrentTrack().id, "t1"); // loops back to start
    });

    test("should repeat current track when repeatMode is 'one'", () => {
      const qm = new TestQueueManager(tracks);
      qm.repeatMode = "one";
      qm.next();
      assert.equal(qm.getCurrentTrack().id, "t1");
    });

    test("should support Play Next and Reorder", () => {
      const qm = new TestQueueManager(tracks);
      const bonus = { id: "bonus", title: "Bonus Track", duration: 150 };

      qm.playNext(bonus);
      assert.equal(qm.queue[1].id, "bonus");

      qm.reorder(1, 3);
      assert.equal(qm.queue[3].id, "bonus");

      qm.remove(3);
      assert.equal(qm.queue.length, 3);
    });
  });

  describe("Search & Recommendation Matcher", () => {
    const catalog = [
      { id: "1", title: "Malarndhum Malaraadha", artist: "TMS", language: "Tamil", genre: "Melody" },
      { id: "2", title: "Kanne Kalaimane", artist: "Yesudas", language: "Tamil", genre: "Melody" },
      { id: "3", title: "Veena Serenade", artist: "Carnatic Collective", language: "Instrumental", genre: "Classical" },
    ];

    test("should filter tracks accurately by title or artist keyword", () => {
      const query = "kalai";
      const matched = catalog.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.artist.toLowerCase().includes(query.toLowerCase())
      );
      assert.equal(matched.length, 1);
      assert.equal(matched[0].id, "2");
    });

    test("should filter tracks by language", () => {
      const tamilOnly = catalog.filter((t) => t.language === "Tamil");
      assert.equal(tamilOnly.length, 2);
    });
  });
});

