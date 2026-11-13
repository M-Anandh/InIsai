"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
import { usePlayerStore } from "@/stores/player-store";
import {
  getOrComputeTuneProfile,
  generateDeterministicProfile,
  hashString,
} from "@/lib/player/tune-profiler";
import { TuneProfile } from "@/types";

interface PaletteColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  glow?: string;
}

interface WaveVisualizerProps {
  className?: string;
  barCount?: number;
  palette?: PaletteColors;
}

export const WaveVisualizer: React.FC<WaveVisualizerProps> = ({
  className = "w-full h-36 sm:h-44 md:h-52 mx-auto",
  barCount = 48,
  palette,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const engineId = usePlayerStore((s) => s.engineId);
  const engineCapabilities = usePlayerStore((s) => s.engineCapabilities);
  const settings = usePlayerStore((s) => s.settings);
  const supportsVisualizer = engineCapabilities?.visualizer ?? false;

  const [profile, setProfile] = useState<TuneProfile | null>(null);

  // Load or compute tune profile whenever currentTrack changes
  useEffect(() => {
    if (!currentTrack) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    getOrComputeTuneProfile(currentTrack, settings).then((prof) => {
      if (!cancelled) setProfile(prof);
    });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.streamUrl, settings?.detailedWavesExtraData]);

  const activeStyle = useMemo(() => {
    if (settings?.waveStyle && settings.waveStyle !== "auto") {
      return settings.waveStyle;
    }
    return profile?.recommendedStyle || "bars";
  }, [settings?.waveStyle, profile?.recommendedStyle]);

  const intensityMultiplier = useMemo(() => {
    const intensity = settings?.waveIntensity || "medium";
    if (intensity === "low") return 0.75;
    if (intensity === "high") return 1.45;
    return 1.0;
  }, [settings?.waveIntensity]);

  const trackSeed = useMemo(() => {
    if (!currentTrack) return 1337;
    return hashString(`${currentTrack.providerId || "audio"}:${currentTrack.id}`);
  }, [currentTrack]);

  const harmonicProfile = useMemo(() => {
    const s1 = (trackSeed & 0xff) / 255;
    const s2 = ((trackSeed >> 8) & 0xff) / 255;
    const s3 = ((trackSeed >> 16) & 0xff) / 255;
    return {
      f1: 1.1 + s1 * 1.4,
      f2: 2.2 + s2 * 1.8,
      f3: 3.5 + s3 * 2.0,
      phaseOffset: s1 * Math.PI * 2,
    };
  }, [trackSeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;
    let prevBassEnergy = 0;
    let beatPulse = 1.0;
    let adaptiveGain = 1.0;
    const barValues = new Array(barCount).fill(0.08);
    const peakValues = new Array(barCount).fill(0.08);

    // Particle pool for "particles" style
    const particles = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.003,
      vy: -(Math.random() * 0.006 + 0.002),
      size: Math.random() * 2.5 + 1.2,
      alpha: Math.random() * 0.7 + 0.3,
    }));

    let lastFrameTime = performance.now();

    const render = (now: number) => {
      // Pause animation if page is hidden
      if (document.hidden) {
        animationId = requestAnimationFrame(render);
        return;
      }

      // Cap framerate on mobile / battery
      const elapsed = now - lastFrameTime;
      const targetFps = window.innerWidth < 768 ? 33 : 16;
      if (elapsed < targetFps) {
        animationId = requestAnimationFrame(render);
        return;
      }
      lastFrameTime = now;

      // DevicePixelRatio capped at 2 for mobile battery & memory efficiency
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const prefersReducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Advance phase strictly when playing
      if (isPlaying) {
        phase += prefersReducedMotion ? 0.01 : 0.045;
      }

      // 1. Data Source Tiering: Live Analyser vs Tune Profile vs Ambient Seed
      const freqData = supportsVisualizer ? engineCoordinator.getVisualizerData() : null;
      const hasLiveAudio = Boolean(freqData && freqData.length > 0 && supportsVisualizer);

      // Measure current energy & bass
      let bassEnergy = 0;
      let midEnergy = 0;
      let trebleEnergy = 0;

      if (hasLiveAudio && freqData) {
        for (let b = 0; b < 6 && b < freqData.length; b++) {
          bassEnergy += freqData[b] / 255;
        }
        bassEnergy /= 6;
        for (let b = 6; b < 24 && b < freqData.length; b++) {
          midEnergy += freqData[b] / 255;
        }
        midEnergy /= 18;
        for (let b = 24; b < freqData.length; b++) {
          trebleEnergy += freqData[b] / 255;
        }
        trebleEnergy /= Math.max(1, freqData.length - 24);
      } else if (profile && profile.frames && profile.frames.length > 0) {
        // Interpolate profile frame by currentTime
        const frameIdx = Math.max(
          0,
          Math.min(profile.frames.length - 1, Math.floor((currentTime || 0) * 10))
        );
        const f = profile.frames[frameIdx];
        if (f) {
          bassEnergy = f.bass;
          midEnergy = f.mid;
          trebleEnergy = f.treble;
        }
      } else if (isPlaying) {
        // Ambient track-seeded harmonic energy
        const timeNorm = currentTime || 0;
        bassEnergy = 0.35 + 0.25 * Math.sin(timeNorm * 2.8 * harmonicProfile.f1);
        midEnergy = 0.3 + 0.2 * Math.cos(timeNorm * 3.5 * harmonicProfile.f2);
        trebleEnergy = 0.25 + 0.2 * Math.sin(timeNorm * 4.2 * harmonicProfile.f3);
      }

      // Adaptive gain normalization (percentile target ~0.8, slow release)
      const currentPeak = Math.max(0.1, bassEnergy, midEnergy, trebleEnergy);
      if (currentPeak > 0.05) {
        const targetGain = Math.min(2.2, Math.max(0.6, 0.75 / currentPeak));
        adaptiveGain = adaptiveGain * 0.98 + targetGain * 0.02;
      }

      // Beat / bass pulse detection
      if (isPlaying && bassEnergy - prevBassEnergy > 0.11) {
        beatPulse = 1.38;
      } else {
        beatPulse = Math.max(1.0, beatPulse - 0.025);
      }
      prevBassEnergy = bassEnergy;

      // Extract palette colors (bass -> dominant, mids -> vibrant, highs -> light accent)
      const colorBass = palette?.secondary || "#FF8A3D";
      const colorMid = palette?.accent || "#FF3D77";
      const colorHigh = palette?.glow ? "#7A5CFF" : "#20C7E8";

      // Compute raw bar targets
      for (let i = 0; i < barCount; i++) {
        let target = 0.06;
        if (isPlaying) {
          if (hasLiveAudio && freqData) {
            const logRatio = Math.pow(i / barCount, 1.75);
            const freqIndex = Math.min(
              freqData.length - 1,
              Math.max(0, Math.floor(logRatio * (freqData.length * 0.85)))
            );
            target = (freqData[freqIndex] || 0) / 255;
          } else if (profile && profile.frames && profile.frames.length > 0) {
            const frameIdx = Math.max(
              0,
              Math.min(profile.frames.length - 1, Math.floor((currentTime || 0) * 10))
            );
            const f = profile.frames[frameIdx];
            const normI = i / barCount;
            const bandVal = normI < 0.33 ? f.bass : normI < 0.66 ? f.mid : f.treble;
            const harmonic = Math.sin(phase * 2.0 + normI * Math.PI * 3.5);
            target = Math.max(0.06, (bandVal * 0.75 + (harmonic * 0.2 + 0.2)) * beatPulse);
          } else {
            const normI = i / barCount;
            const centerBell = Math.sin(normI * Math.PI);
            const progress = duration > 0 ? currentTime / duration : 0;
            const songEvolve = Math.sin(progress * Math.PI * 4 + harmonicProfile.phaseOffset);
            const h1 = Math.sin(phase * harmonicProfile.f1 + normI * Math.PI * 2.4);
            const h2 = Math.cos(phase * harmonicProfile.f2 + normI * Math.PI * 4.6 + songEvolve);
            const h3 = Math.sin(phase * harmonicProfile.f3 + normI * Math.PI * 7.2);
            target = Math.max(
              0.06,
              (0.32 + h1 * 0.24 + h2 * 0.16 + h3 * 0.08) * centerBell * beatPulse
            );
          }
        }

        // Apply power curve (~0.7) and adaptive gain + intensity multiplier
        const scaled = Math.pow(Math.max(0.02, target), 0.72) * adaptiveGain * intensityMultiplier;

        // Fast attack, smooth decay
        const cur = barValues[i];
        const attack = 0.32;
        const decay = 0.045;
        barValues[i] = scaled > cur ? cur + (scaled - cur) * attack : cur - (cur - scaled) * decay;

        if (barValues[i] > peakValues[i]) {
          peakValues[i] = barValues[i];
        } else {
          peakValues[i] = Math.max(0, peakValues[i] - 0.005);
        }
      }

      const centerY = displayHeight / 2;
      const totalWidth = displayWidth;
      const step = totalWidth / barCount;
      const barWidth = Math.max(2.5, step * 0.65);

      // --- STYLE 1: BARS+ (Tall mirrored bars with peak caps) ---
      if (activeStyle === "bars") {
        const gradient = ctx.createLinearGradient(0, 0, totalWidth, 0);
        gradient.addColorStop(0, colorBass);
        gradient.addColorStop(0.5, colorMid);
        gradient.addColorStop(1, colorHigh);
        ctx.fillStyle = gradient;

        for (let i = 0; i < barCount; i++) {
          const x = i * step + (step - barWidth) / 2;
          const val = Math.max(0.05, barValues[i]);
          const halfHeight = Math.min(centerY - 4, (val * (displayHeight * 0.92)) / 2);
          const radius = barWidth / 2;
          const topY = centerY - halfHeight;
          const height = halfHeight * 2;

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, topY, barWidth, height, radius);
          } else {
            ctx.rect(x, topY, barWidth, height);
          }
          ctx.fill();

          // Peak-hold dot
          if (peakValues[i] > 0.12 && isPlaying) {
            const peakHalf = Math.min(centerY - 4, (peakValues[i] * (displayHeight * 0.92)) / 2);
            ctx.beginPath();
            ctx.arc(x + radius, Math.max(3, centerY - peakHalf - 3), radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            ctx.fill();
            ctx.fillStyle = gradient;
          }
        }
      }

      // --- STYLE 2: RIBBONS (Layered flowing sine / spline ribbons) ---
      else if (activeStyle === "ribbons") {
        const ribbonLayers = [
          { color: colorBass, alpha: 0.55, width: 2.8, freq: harmonicProfile.f1, speed: 0.9, amp: 26 },
          { color: colorMid, alpha: 0.65, width: 2.4, freq: harmonicProfile.f2, speed: 1.3, amp: 20 },
          { color: colorHigh, alpha: 0.55, width: 2.0, freq: harmonicProfile.f3, speed: 1.7, amp: 16 },
        ];

        for (const rib of ribbonLayers) {
          ctx.beginPath();
          ctx.lineWidth = rib.width;
          ctx.strokeStyle = rib.color;
          ctx.globalAlpha = rib.alpha;

          for (let x = 0; x <= totalWidth; x += 4) {
            const normX = x / totalWidth;
            const envelope = Math.sin(normX * Math.PI);
            const wave =
              Math.sin(normX * Math.PI * rib.freq * 2.2 + phase * rib.speed + harmonicProfile.phaseOffset) *
              (isPlaying ? rib.amp * beatPulse * intensityMultiplier : 4) *
              envelope;
            const y = centerY + wave;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      // --- STYLE 3: MOUNTAIN (Filled spectrum area with dual gradient) ---
      else if (activeStyle === "mountain") {
        const topPoints: Array<{ x: number; y: number }> = [];
        const botPoints: Array<{ x: number; y: number }> = [];

        for (let i = 0; i < barCount; i++) {
          const x = i * step + step / 2;
          const val = Math.max(0.06, barValues[i]);
          const halfH = Math.min(centerY - 4, (val * (displayHeight * 0.88)) / 2);
          topPoints.push({ x, y: centerY - halfH });
          botPoints.push({ x, y: centerY + halfH });
        }

        const mountainGrad = ctx.createLinearGradient(0, 0, 0, displayHeight);
        mountainGrad.addColorStop(0, colorBass);
        mountainGrad.addColorStop(0.5, colorMid);
        mountainGrad.addColorStop(1, colorHigh);

        ctx.fillStyle = mountainGrad;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (const p of topPoints) ctx.lineTo(p.x, p.y);
        ctx.lineTo(totalWidth, centerY);
        for (let i = botPoints.length - 1; i >= 0; i--) ctx.lineTo(botPoints[i].x, botPoints[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // --- STYLE 4: RADIAL PULSE (Concentric energy rings & arcs) ---
      else if (activeStyle === "radial") {
        const maxR = Math.min(displayWidth, displayHeight) * 0.44;
        const ringCount = 5;
        ctx.lineWidth = 2.5;

        for (let r = 0; r < ringCount; r++) {
          const radius = (maxR / ringCount) * (r + 1) * (0.85 + (beatPulse - 1) * 0.35);
          ctx.beginPath();
          ctx.arc(totalWidth / 2, centerY, Math.max(6, radius), 0, Math.PI * 2);
          ctx.strokeStyle = r % 2 === 0 ? colorMid : colorBass;
          ctx.globalAlpha = 0.35 + (r / ringCount) * 0.4;
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      }

      // --- STYLE 5: PARTICLES (Floating sparkles reacting to treble) ---
      else if (activeStyle === "particles") {
        ctx.fillStyle = colorHigh;
        const trebleBoost = Math.max(1, trebleEnergy * 3.0 * intensityMultiplier);

        for (const p of particles) {
          if (isPlaying) {
            p.y += p.vy * trebleBoost;
            p.x += p.vx;
            if (p.y < 0) p.y = 1;
            if (p.x < 0) p.x = 1;
            if (p.x > 1) p.x = 0;
          }

          const px = p.x * totalWidth;
          const py = p.y * displayHeight;
          ctx.beginPath();
          ctx.arc(px, py, p.size * (isPlaying ? beatPulse : 1), 0, Math.PI * 2);
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    barCount,
    isPlaying,
    supportsVisualizer,
    currentTime,
    duration,
    activeStyle,
    intensityMultiplier,
    profile,
    harmonicProfile,
    palette,
  ]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center ${className}`}
      data-testid="wave-visualizer-container"
      data-wave-style={activeStyle}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        aria-label={`Audio Waveform Visualizer (${activeStyle})`}
      />
    </div>
  );
};
