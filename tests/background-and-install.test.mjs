import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

test("Service Worker bypasses Range requests and audio/video destinations", () => {
  const swPath = path.join(ROOT, "public", "sw.js");
  const swContent = fs.readFileSync(swPath, "utf8");

  assert.match(swContent, /headers\.has\(["']range["']\)/i, "SW must bypass HTTP Range requests");
  assert.match(swContent, /destination === ["']audio["']/, "SW must bypass audio destination");
  assert.match(swContent, /destination === ["']video["']/, "SW must bypass video destination");
});

test("Manifest includes 192 and 512 any + maskable icons", () => {
  const manifestPath = path.join(ROOT, "public", "manifest.webmanifest");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.ok(Array.isArray(manifest.icons));

  const has = (sizes, purpose) =>
    manifest.icons.some(
      (i) => i.sizes === sizes && (i.purpose || "").split(/\s+/).includes(purpose)
    );
  assert.ok(has("192x192", "any"), "Missing 192x192 any icon");
  assert.ok(has("192x192", "maskable"), "Missing 192x192 maskable icon");
  assert.ok(has("512x512", "any"), "Missing 512x512 any icon");
  assert.ok(has("512x512", "maskable"), "Missing 512x512 maskable icon");
});

test("AudioElementEngine mounts single persistent DOM element and skips WebAudio on mobile/iOS", () => {
  const enginePath = path.join(ROOT, "src", "lib", "player", "AudioElementEngine.ts");
  const content = fs.readFileSync(enginePath, "utf8");

  assert.match(content, /PERSISTENT_AUDIO_ELEMENT_ID = ["']inisai-persistent-audio["']/);
  assert.match(content, /isMobileOrIOS\(\)/, "Must detect mobile/iOS");
  assert.match(
    content,
    /if \(isMobileOrIOS\(\) \|\| !isLocalOrCorsSafe\)/,
    "Must bypass createMediaElementSource on mobile/iOS"
  );
  assert.match(content, /playImmediateOnEnded/, "Must support synchronous ended src swap + play()");
});

test("EngineCoordinator populates 96/128/256/512 MediaMetadata artwork", () => {
  const coordPath = path.join(ROOT, "src", "lib", "player", "EngineCoordinator.ts");
  const content = fs.readFileSync(coordPath, "utf8");

  for (const size of ["96x96", "128x128", "256x256", "512x512"]) {
    assert.ok(content.includes(size), `Missing MediaMetadata artwork size ${size}`);
  }
  assert.match(content, /setPositionState/);
  assert.match(content, /setActionHandler/);
});

test("WaveVisualizer & FullScreenPlayer omit unwanted labels and restrict overflow menu items", () => {
  const wavePath = path.join(ROOT, "src", "components", "player", "WaveVisualizer.tsx");
  const playerPath = path.join(ROOT, "src", "components", "player", "FullScreenPlayer.tsx");
  const wave = fs.readFileSync(wavePath, "utf8");
  const player = fs.readFileSync(playerPath, "utf8");

  assert.ok(!/Live Audio Wave/i.test(wave), "WaveVisualizer must not render Live Audio Wave label");
  assert.ok(!/Ambient Wave/i.test(wave), "WaveVisualizer must not render Ambient Wave label");

  assert.ok(!player.includes("Manage Audio Sources"), "Overflow menu must not include Manage Audio Sources");
  assert.ok(!player.includes("Go to Artist"), "Overflow menu must not include Go to Artist");
  assert.ok(!player.includes("Go to Album"), "Overflow menu must not include Go to Album");
  assert.ok(!/InIsai Audio/.test(player), "Source chip must be hidden");
  assert.ok(player.includes("Movie songs"), "Overflow menu must include Movie songs");
});

test("Player store tracks userPaused and pre-resolves next stream ~20s before end", () => {
  const storePath = path.join(ROOT, "src", "stores", "player-store.ts");
  const content = fs.readFileSync(storePath, "utf8");

  assert.match(content, /userPaused:\s*boolean/);
  assert.match(content, /preResolveNextTrackIfNeeded/);
  assert.match(content, /duration - currentTime > 22/);
  assert.match(content, /handleTrackEndedFastAdvance/);
  assert.match(content, /preferAudioFallback:\s*true/);
});

test("Matcher enforces adaptive duration tolerance curve for confident background audio matching", () => {
  const matcherPath = path.join(ROOT, "src", "lib", "audio", "matcher.ts");
  const content = fs.readFileSync(matcherPath, "utf8");

  assert.match(content, /Math\.abs\(targetDuration - candDuration\)/);
  assert.match(content, /durDiff <= 5/);
});

test("SWUpdateNotifier skips auto-reload on initial SW claim (hadController guard)", () => {
  const notifierPath = path.join(ROOT, "src", "components", "pwa", "SWUpdateNotifier.tsx");
  const content = fs.readFileSync(notifierPath, "utf8");

  assert.match(content, /const hadController = Boolean\(navigator\.serviceWorker\.controller\)/);
  assert.match(content, /if \(hadController && !refreshing\)/);
});

