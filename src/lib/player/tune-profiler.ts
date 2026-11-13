import { Track, TuneProfile, TuneFrame, PlayerSettings } from "@/types";
import { get as idbGet, set as idbSet } from "idb-keyval";

export const IDB_TUNE_PROFILES_PREFIX = "inisai_tune_profile:";

export function getTrackTuneKey(track: Track): string {
  const provider = track.providerId || track.sourceType || "audio";
  const id = track.id || track.sourceId || track.youtubeVideoId || "unknown";
  return `${provider}:${id}`;
}

export function isCellularConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as any).connection;
  if (!conn) return false;
  return conn.type === "cellular" || /2g|3g|4g|slow-2g/i.test(conn.effectiveType || "");
}

/**
 * 32-bit FNV-1a hash for deterministic pseudo-profile generation
 */
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Generates a deterministic fallback/ambient profile from track metadata.
 * Ensures consistent, unique visual motion for YouTube or offline tracks.
 */
export function generateDeterministicProfile(track: Track): TuneProfile {
  const key = getTrackTuneKey(track);
  const seed = hashString(key + (track.title || "") + (track.artist || ""));
  const dur = Math.max(30, track.duration || 210);

  const b1 = (seed & 0xff) / 255;
  const b2 = ((seed >> 8) & 0xff) / 255;
  const b3 = ((seed >> 16) & 0xff) / 255;

  const bpm = 75 + Math.round(b1 * 80); // 75 - 155 BPM
  const energyMean = 0.2 + b2 * 0.55; // 0.2 - 0.75
  const bassShare = 0.25 + b3 * 0.35; // 0.25 - 0.60
  const centroidMean = 0.3 + ((seed >> 24) & 0xff) / 255 * 0.45;

  let recommendedStyle: TuneProfile["recommendedStyle"] = "bars";
  if (bassShare > 0.46) {
    recommendedStyle = "mountain";
  } else if (centroidMean > 0.60) {
    recommendedStyle = "particles";
  } else if (energyMean < 0.38 && bpm < 100) {
    recommendedStyle = "ribbons";
  } else if (energyMean > 0.55 && bpm > 120) {
    recommendedStyle = b1 > 0.5 ? "radial" : "bars";
  }

  // Generate ~100 peaks for the waveform scrubber
  const peaks: number[] = [];
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
    frames: [],
    computedAt: Date.now(),
  };
}

/**
 * Analyzes audio buffer to compute exact per-100ms frames and spectral metrics.
 */
export function analyzeAudioBuffer(audioBuffer: AudioBuffer, trackKey: string): TuneProfile {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  const frameLength = Math.floor(sampleRate * 0.1); // 100ms per frame
  const totalFrames = Math.floor(channelData.length / frameLength);

  const frames: TuneFrame[] = [];
  let totalEnergy = 0;
  let totalBass = 0;
  let totalMid = 0;
  let totalTreble = 0;
  let prevRms = 0;

  // Analysis over downsampled blocks
  for (let f = 0; f < totalFrames; f++) {
    const start = f * frameLength;
    const end = Math.min(channelData.length, start + frameLength);

    let sumSquares = 0;
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    // Approximate band energies via downsampled difference filters
    let prevSample = 0;
    let lowPass = 0;

    for (let i = start; i < end; i++) {
      const sample = channelData[i];
      sumSquares += sample * sample;

      // Simple 1-pole lowpass for bass (~250Hz cutoff)
      lowPass += 0.05 * (sample - lowPass);
      bassSum += lowPass * lowPass;

      // Highpass for treble
      const diff = sample - prevSample;
      trebleSum += diff * diff;
      prevSample = sample;
    }

    const count = end - start;
    const rms = Math.sqrt(sumSquares / count);
    const bass = Math.sqrt(bassSum / count);
    const treble = Math.sqrt(trebleSum / count);
    const mid = Math.max(0, rms - (bass * 0.5 + treble * 0.5));
    const onset = Math.max(0, rms - prevRms);
    prevRms = rms;

    frames.push({
      rms: Math.min(1.0, rms * 2.5),
      bass: Math.min(1.0, bass * 3.0),
      mid: Math.min(1.0, mid * 2.8),
      treble: Math.min(1.0, treble * 3.5),
      onset: Math.min(1.0, onset * 4.0),
    });

    totalEnergy += rms;
    totalBass += bass;
    totalMid += mid;
    totalTreble += treble;
  }

  const energyMean = totalFrames > 0 ? totalEnergy / totalFrames : 0.3;
  const denom = totalBass + totalMid + totalTreble || 1;
  const bassShare = totalBass / denom;
  const centroidMean = (totalTreble * 1.5 + totalMid) / denom;

  // Estimate BPM from periodic peak onsets
  let bpm = 110;
  let onsetCount = 0;
  for (let f = 1; f < frames.length; f++) {
    if (frames[f].onset > 0.15 && frames[f].onset > frames[f - 1].onset) {
      onsetCount++;
    }
  }
  if (duration > 0) {
    const rawBpm = Math.round((onsetCount / duration) * 60);
    bpm = rawBpm >= 65 && rawBpm <= 180 ? rawBpm : rawBpm > 180 ? Math.round(rawBpm / 2) : 105;
  }

  // Scrubber peaks (downsampled to 100 points)
  const peaks: number[] = [];
  const step = Math.max(1, Math.floor(frames.length / 100));
  for (let i = 0; i < 100; i++) {
    const idx = Math.min(frames.length - 1, i * step);
    peaks.push(frames[idx] ? frames[idx].rms : 0.1);
  }

  // Determine style from acoustic profile
  let recommendedStyle: TuneProfile["recommendedStyle"] = "bars";
  if (bassShare > 0.44) {
    recommendedStyle = "mountain";
  } else if (centroidMean > 0.58) {
    recommendedStyle = "particles";
  } else if (energyMean < 0.28 && bpm < 98) {
    recommendedStyle = "ribbons";
  } else if (energyMean > 0.45 && bpm > 115) {
    recommendedStyle = bassShare > 0.35 ? "radial" : "bars";
  }

  return {
    key: trackKey,
    duration,
    bpm,
    energyMean,
    bassShare,
    centroidMean,
    recommendedStyle,
    peaks,
    frames,
    computedAt: Date.now(),
  };
}

const activeProfilePromises = new Map<string, Promise<TuneProfile>>();

/**
 * Retrieves cached tune profile from IndexedDB, or computes/fetches it if eligible.
 */
export async function getOrComputeTuneProfile(
  track: Track,
  settings?: PlayerSettings
): Promise<TuneProfile> {
  const key = getTrackTuneKey(track);

  // 1. In-flight promise reuse
  if (activeProfilePromises.has(key)) {
    return activeProfilePromises.get(key)!;
  }

  const p = (async () => {
    // 2. Check IndexedDB
    try {
      const cached = await idbGet<TuneProfile>(`${IDB_TUNE_PROFILES_PREFIX}${key}`);
      if (cached && Array.isArray(cached.peaks)) {
        return cached;
      }
    } catch {}

    // 3. If track has direct stream URL and network rules allow it:
    const canAnalyze =
      track.streamUrl &&
      track.sourceType !== "youtube" &&
      track.sourceType !== "ytmusic" &&
      (!isCellularConnection() || settings?.detailedWavesExtraData);

    if (canAnalyze && typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) {
      try {
        // Cap decoding at 10 min tracks
        if (!track.duration || track.duration <= 600) {
          const res = await fetch(track.streamUrl!, { mode: "cors" });
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtx();
            const audioBuffer = await ctx.decodeAudioData(arrayBuf);
            ctx.close().catch(() => {});

            const computed = analyzeAudioBuffer(audioBuffer, key);
            // Save to IndexedDB (without retaining raw bytes)
            idbSet(`${IDB_TUNE_PROFILES_PREFIX}${key}`, computed).catch(() => {});
            return computed;
          }
        }
      } catch (err) {
        // CORS or decode failure: gracefully fall through to seeded profile
      }
    }

    // 4. Fallback to deterministic ambient harmonic profile
    const ambient = generateDeterministicProfile(track);
    idbSet(`${IDB_TUNE_PROFILES_PREFIX}${key}`, ambient).catch(() => {});
    return ambient;
  })();

  activeProfilePromises.set(key, p);
  try {
    return await p;
  } finally {
    activeProfilePromises.delete(key);
  }
}
