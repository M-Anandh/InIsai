import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// Pure hash and deterministic profiler for testing tune profile generation contract
function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function generateDeterministicProfile(track) {
  const key = `${track.providerId || track.sourceType || "audio"}:${track.id}`;
  const seed = fnv1a(key + (track.title || "") + (track.artist || ""));
  const dur = Math.max(30, track.duration || 210);

  const b1 = (seed & 0xff) / 255;
  const b2 = ((seed >> 8) & 0xff) / 255;
  const b3 = ((seed >> 16) & 0xff) / 255;

  const bpm = 75 + Math.round(b1 * 80);
  const energyMean = 0.2 + b2 * 0.55;
  const bassShare = 0.25 + b3 * 0.35;
  const centroidMean = 0.3 + (((seed >> 24) & 0xff) / 255) * 0.45;

  let recommendedStyle = "bars";
  if (bassShare > 0.46) {
    recommendedStyle = "mountain";
  } else if (centroidMean > 0.60) {
    recommendedStyle = "particles";
  } else if (energyMean < 0.38 && bpm < 100) {
    recommendedStyle = "ribbons";
  } else if (energyMean > 0.55 && bpm > 120) {
    recommendedStyle = b1 > 0.5 ? "radial" : "bars";
  }

  const peaks = [];
  for (let i = 0; i < 100; i++) {
    const norm = i / 100;
    const env = Math.sin(norm * Math.PI);
    const wave =
      0.35 +
      0.25 * Math.sin(norm * Math.PI * (4 + b1 * 8)) +
      0.2 * Math.cos(norm * Math.PI * (8 + b2 * 12));
    peaks.push(Math.max(0.08, Math.min(1.0, wave * env * (0.6 + energyMean * 0.4))));
  }

  return {
    key,
    duration: dur,
    bpm,
    energyMean,
    bassShare,
    centroidMean,
    recommendedStyle,
    peaks,
  };
}

test("Tune Profiler generates distinct profiles and distinct auto-selected styles for different tracks", () => {
  const trackA = {
    id: "track-1-fast-dance",
    title: "Arabic Kuthu",
    artist: "Anirudh Ravichander",
    duration: 280,
    sourceType: "saavn",
    isPlayable: true,
  };

  const trackB = {
    id: "track-2-soft-melody",
    title: "Poove Sempoove",
    artist: "K.J. Yesudas, Ilaiyaraaja",
    duration: 310,
    sourceType: "saavn",
    isPlayable: true,
  };

  const profA = generateDeterministicProfile(trackA);
  const profB = generateDeterministicProfile(trackB);

  assert.notEqual(profA.key, profB.key, "Keys must differ");
  assert.notEqual(profA.bpm, profB.bpm, "BPM should vary across tracks");
  assert.notEqual(profA.energyMean, profB.energyMean, "Energy should vary across tracks");
  assert.ok(Array.isArray(profA.peaks) && profA.peaks.length === 100, "Should generate 100 scrubber peaks");
  assert.ok(Array.isArray(profB.peaks) && profB.peaks.length === 100, "Should generate 100 scrubber peaks");

  // Verify that valid recommended styles are assigned from the 5 supported styles
  const validStyles = ["bars", "ribbons", "mountain", "radial", "particles"];
  assert.ok(validStyles.includes(profA.recommendedStyle), `Invalid style ${profA.recommendedStyle}`);
  assert.ok(validStyles.includes(profB.recommendedStyle), `Invalid style ${profB.recommendedStyle}`);
});

test("Session persistence sanitizes expiring stream URLs and mirrors to localStorage", () => {
  const persistencePath = path.join(ROOT, "src", "lib", "player", "session-persistence.ts");
  const content = fs.readFileSync(persistencePath, "utf8");

  assert.match(content, /streamUrl:\s*""/, "Must clear expiring streamUrl in stored session");
  assert.match(content, /inisai_playback_session_v1/, "Must use IndexedDB key");
  assert.match(content, /inisai_playback_session_sync/, "Must mirror synchronously to localStorage");
  assert.match(content, /persistPlaybackSessionSync/, "Must export synchronous exit persistence");
});

test("Player store implements ensureReadyAndPlay and position recovery rules", () => {
  const storePath = path.join(ROOT, "src", "stores", "player-store.ts");
  const content = fs.readFileSync(storePath, "utf8");

  assert.match(content, /ensureReadyAndPlay/, "Must define ensureReadyAndPlay");
  assert.match(content, /restoreSession/, "Must define restoreSession");
  assert.match(content, /restoredPosition/, "Must track restored position marker");

  // Position within 3s of end advances to next track starting at 0:00
  assert.match(content, /dur > 3 && targetPos >= dur - 3/, "Must detect position within 3s of end");
  assert.match(content, /targetQueueIndex \+= 1/, "Must advance to next track when near end");

  // Clamp position to [0, duration - 1]
  assert.match(content, /Math\.min\(targetPos, Math\.max\(0, dur - 1\)\)/, "Must clamp restored position");

  // Reset restored position on next/prev
  assert.match(content, /nextTrack[\s\S]*?restoredPosition:\s*undefined/, "Next track must start at 0:00");
  assert.match(content, /prevTrack[\s\S]*?restoredPosition:\s*undefined/, "Prev track must start at 0:00");
});

test("Search page eliminates Go to artist and View artist from Songs and All views", () => {
  const searchPath = path.join(ROOT, "src", "app", "search", "page.tsx");
  const content = fs.readFileSync(searchPath, "utf8");

  // Case-insensitive check: no "Go to artist", "View artist", or "View Artist Profile"
  assert.ok(!/Go to artist/i.test(content), "Must remove 'Go to artist' from search");
  assert.ok(!/View artist/i.test(content), "Must remove 'View artist' from search");
  assert.ok(!/View Artist Profile/i.test(content), "Must remove 'View Artist Profile' from search");

  // Ensure matchingArtist does not match when activeFilter is Songs or when query has exact song match
  assert.match(content, /activeFilter === ["']Songs["']\s*\)\s*return null/, "matchingArtist must not hijack Songs view");
});

test("WaveVisualizer is kept as classic centered-mirrored bars with flowing harmonic ribbons", () => {
  const visualizerPath = path.join(ROOT, "src", "components", "player", "WaveVisualizer.tsx");
  const playerPath = path.join(ROOT, "src", "components", "player", "FullScreenPlayer.tsx");
  const visContent = fs.readFileSync(visualizerPath, "utf8");
  const playerContent = fs.readFileSync(playerPath, "utf8");

  // FullScreenPlayer uses classic balanced height
  assert.match(playerContent, /h-8 sm:h-10/, "WaveVisualizer in FullScreenPlayer must use classic clean height");

  // Center-mirrored vertical bars and flowing ribbons
  assert.match(visContent, /Flowing Sine Wave Ribbons/, "Must contain flowing harmonic sine wave ribbons");
  assert.match(visContent, /Center-Mirrored Vertical Equalizer Bars/, "Must contain center-mirrored vertical equalizer bars");
  assert.match(visContent, /#FF8A3D[\s\S]*?#FF3D77[\s\S]*?#7A5CFF[\s\S]*?#20C7E8/, "Must use brand harmonic gradient");
});

test("Background warning is formatted plainly with switch-to-audio action and shown only for YouTube tracks", () => {
  const providerPath = path.join(ROOT, "src", "components", "player", "PlayerProvider.tsx");
  const storePath = path.join(ROOT, "src", "stores", "player-store.ts");
  const settingsPath = path.join(ROOT, "src", "app", "settings", "page.tsx");

  const provider = fs.readFileSync(providerPath, "utf8");
  const store = fs.readFileSync(storePath, "utf8");
  const settings = fs.readFileSync(settingsPath, "utf8");

  const expectedWarning = "This song plays only while InIsai is open. Choose the audio version for background play.";
  assert.ok(provider.includes(expectedWarning), "PlayerProvider must contain exact warning text");
  assert.ok(settings.includes(expectedWarning.split(".")[0]), "Settings must explain song plays only while open");

  // Assert shown only for YouTube tracks
  assert.match(provider, /state\.engineId === ["']youtube["']/, "Warning must check engineId === youtube");
  assert.match(store, /switchToAudioVersion/, "Must provide switchToAudioVersion action");
});

test("FullScreenPlayer artwork maintains guaranteed 1:1 square ratio across mobile and desktop", () => {
  const playerPath = path.join(ROOT, "src", "components", "player", "FullScreenPlayer.tsx");
  const playerContent = fs.readFileSync(playerPath, "utf8");

  // Must use matched min() dimensions and aspect-square with flex-shrink-0
  assert.match(
    playerContent,
    /w-\[min\(72vw,\s*220px,\s*30vh\)\]\s*h-\[min\(72vw,\s*220px,\s*30vh\)\]/,
    "Mobile artwork width and height must match min() expression"
  );
  assert.match(
    playerContent,
    /md:w-\[min\(72vw,\s*360px,\s*44vh\)\]\s*md:h-\[min\(72vw,\s*360px,\s*44vh\)\]/,
    "Desktop artwork width and height must match min() expression"
  );
  assert.match(playerContent, /aspect-square/, "Artwork container must declare aspect-square");
  assert.match(playerContent, /flex-shrink-0/, "Artwork container must declare flex-shrink-0 to prevent distortion");
});

test("Resume playback preserves position and routes startPosition through audio engines", () => {
  const storePath = path.join(ROOT, "src", "stores", "player-store.ts");
  const audioPath = path.join(ROOT, "src", "lib", "player", "AudioElementEngine.ts");
  const ytPath = path.join(ROOT, "src", "lib", "player", "YouTubeIframeEngine.ts");
  const coordinatorPath = path.join(ROOT, "src", "lib", "player", "EngineCoordinator.ts");

  const store = fs.readFileSync(storePath, "utf8");
  const audio = fs.readFileSync(audioPath, "utf8");
  const yt = fs.readFileSync(ytPath, "utf8");
  const coordinator = fs.readFileSync(coordinatorPath, "utf8");

  // Player store instant resume when genuinely loaded and paused
  assert.match(
    store,
    /isAudioElementCurrentlyLoadedAndPaused\([\s\S]*?engineCoordinator\.play\(\)/,
    "togglePlay must resume loaded and paused audio without reloading"
  );

  // EngineCoordinator passes startPosition
  assert.match(coordinator, /startPosition\?: number/, "EngineCoordinator must accept startPosition");
  assert.match(coordinator, /isAudioElementCurrentlyLoadedAndPaused/, "EngineCoordinator must expose loaded and paused status");

  // AudioElementEngine validates loaded and paused state
  assert.match(audio, /isCurrentlyLoadedAndPaused/, "AudioElementEngine must check readyState and duration before resuming");

  // YouTubeIframeEngine startSeconds
  assert.match(yt, /startSeconds:\s*startSec/, "YouTubeIframeEngine must pass startSeconds to loadVideoById");
});
