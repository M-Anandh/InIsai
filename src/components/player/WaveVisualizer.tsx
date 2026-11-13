"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
import { usePlayerStore } from "@/stores/player-store";

interface WaveVisualizerProps {
  className?: string;
  barCount?: number;
  glow?: boolean;
}

// 32-bit FNV-1a Hash to generate a deterministic track seed
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const WaveVisualizer: React.FC<WaveVisualizerProps> = ({
  className = "w-full max-w-lg h-16 mx-auto",
  barCount = 52,
  glow = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const engineId = usePlayerStore((s) => s.engineId);
  const engineCapabilities = usePlayerStore((s) => s.engineCapabilities);
  const supportsVisualizer = engineCapabilities?.visualizer ?? false;

  const trackSeed = useMemo(() => {
    if (!currentTrack) return 1337;
    return fnv1a(`${currentTrack.providerId || "yt"}:${currentTrack.id}`);
  }, [currentTrack]);

  // Derived track-specific ambient harmonic factors
  const harmonicProfile = useMemo(() => {
    const s1 = ((trackSeed & 0xff) / 255);
    const s2 = (((trackSeed >> 8) & 0xff) / 255);
    const s3 = (((trackSeed >> 16) & 0xff) / 255);
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

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animationId: number;
    let phase = 0;
    let prevBassEnergy = 0;
    let beatPulse = 1.0;
    const barValues = new Array(barCount).fill(0.08);
    const peakValues = new Array(barCount).fill(0.08);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      phase += isPlaying ? (prefersReducedMotion ? 0.01 : 0.045) : 0.008;

      const freqData = supportsVisualizer ? engineCoordinator.getVisualizerData() : null;
      const hasLiveAudio = Boolean(freqData && freqData.length > 0 && supportsVisualizer);

      // Measure low-end bass energy for dynamic beat pulse
      let bassEnergy = 0;
      if (hasLiveAudio && freqData) {
        for (let b = 0; b < 6 && b < freqData.length; b++) {
          bassEnergy += freqData[b] / 255;
        }
        bassEnergy /= 6;
      } else if (isPlaying) {
        // Track-seeded ambient rhythmic pulse based on playback time
        const timeNorm = currentTime || 0;
        bassEnergy = 0.35 + 0.25 * Math.sin(timeNorm * 2.8 * harmonicProfile.f1);
      }

      // Spectral flux / beat trigger
      if (bassEnergy - prevBassEnergy > 0.12) {
        beatPulse = 1.35;
      } else {
        beatPulse = Math.max(1.0, beatPulse - 0.03);
      }
      prevBassEnergy = bassEnergy;

      for (let i = 0; i < barCount; i++) {
        let target = 0.08;
        if (isPlaying) {
          if (hasLiveAudio && freqData) {
            // Logarithmic mapping: lower bins occupy more visual width to match human hearing
            const logRatio = Math.pow(i / barCount, 1.85);
            const freqIndex = Math.min(
              freqData.length - 1,
              Math.max(0, Math.floor(logRatio * (freqData.length * 0.85)))
            );
            target = (freqData[freqIndex] || 0) / 255;
          } else {
            // Per-track distinct, non-repeating seeded pseudo-wave
            const normI = i / barCount;
            const centerBell = Math.sin(normI * Math.PI);
            const progress = duration > 0 ? currentTime / duration : 0;
            const songEvolve = Math.sin(progress * Math.PI * 4 + harmonicProfile.phaseOffset);

            const h1 = Math.sin(phase * harmonicProfile.f1 + normI * Math.PI * 2.4);
            const h2 = Math.cos(phase * harmonicProfile.f2 + normI * Math.PI * 4.6 + songEvolve);
            const h3 = Math.sin(phase * harmonicProfile.f3 + normI * Math.PI * 7.2);

            target = Math.max(
              0.08,
              (0.32 + h1 * 0.24 + h2 * 0.16 + h3 * 0.08) * centerBell * beatPulse
            );
          }
        }

        // Fast attack, smooth decay
        const current = barValues[i];
        const attack = 0.28;
        const decay = 0.05;
        barValues[i] = target > current ? current + (target - current) * attack : current - (current - target) * decay;

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

      // --- Layer 1: Flowing Sine Wave Ribbons (Harmonics) ---
      if (!prefersReducedMotion) {
        const ribbonGradients = [
          { color: "rgba(255, 138, 61, 0.45)", width: 2.2, freq: harmonicProfile.f1, speed: 1.0, amp: 10 * beatPulse },
          { color: "rgba(255, 61, 119, 0.55)", width: 2.0, freq: harmonicProfile.f2, speed: 1.4, amp: 8 * beatPulse },
          { color: "rgba(122, 92, 255, 0.50)", width: 1.8, freq: harmonicProfile.f3, speed: 1.8, amp: 6 * beatPulse },
        ];

        for (const rib of ribbonGradients) {
          ctx.beginPath();
          ctx.lineWidth = rib.width;
          ctx.strokeStyle = rib.color;

          for (let x = 0; x <= totalWidth; x += 3) {
            const normX = x / totalWidth;
            const envelope = Math.sin(normX * Math.PI);
            const yOffset =
              Math.sin(normX * Math.PI * rib.freq * 2 + phase * rib.speed + harmonicProfile.phaseOffset) *
              (isPlaying ? rib.amp : 2) *
              envelope;
            const y = centerY + yOffset;

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // --- Layer 2: Center-Mirrored Vertical Equalizer Bars ---
      const barGradient = ctx.createLinearGradient(0, 0, totalWidth, 0);
      barGradient.addColorStop(0, "#FF8A3D"); // Turmeric warm
      barGradient.addColorStop(0.35, "#FF3D77"); // Rose magenta
      barGradient.addColorStop(0.7, "#7A5CFF"); // Brand indigo
      barGradient.addColorStop(1, "#20C7E8"); // Teal cyan

      ctx.fillStyle = barGradient;

      if (glow) {
        ctx.shadowColor = "rgba(255, 61, 119, 0.4)";
        ctx.shadowBlur = 8;
      }

      for (let i = 0; i < barCount; i++) {
        const x = i * step + (step - barWidth) / 2;
        const val = Math.max(0.06, barValues[i]);
        const halfHeight = (val * (displayHeight * 0.8)) / 2;
        const radius = barWidth / 2;

        const topY = centerY - halfHeight;
        const bottomY = centerY + halfHeight;
        const height = bottomY - topY;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, topY, barWidth, height, radius);
        } else {
          ctx.rect(x, topY, barWidth, height);
        }
        ctx.fill();

        if (peakValues[i] > 0.15 && isPlaying) {
          const peakY = centerY - (peakValues[i] * (displayHeight * 0.8)) / 2 - 2;
          ctx.beginPath();
          ctx.arc(x + radius, Math.max(2, peakY), radius * 0.75, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
          ctx.fill();
          ctx.fillStyle = barGradient;
        }
      }

      ctx.restore();

      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [barCount, isPlaying, supportsVisualizer, glow, harmonicProfile, duration, currentTime]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        aria-label="Audio Waveform Visualizer"
      />
    </div>
  );
};
