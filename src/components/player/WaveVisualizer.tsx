"use client";

import React, { useEffect, useRef } from "react";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
import { usePlayerStore } from "@/stores/player-store";

interface WaveVisualizerProps {
  className?: string;
  barCount?: number;
  glow?: boolean;
}

export const WaveVisualizer: React.FC<WaveVisualizerProps> = ({
  className = "w-full max-w-lg h-16 mx-auto",
  barCount = 52,
  glow = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const engineCapabilities = usePlayerStore((s) => s.engineCapabilities);
  const supportsVisualizer = engineCapabilities?.visualizer ?? false;

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
    const barValues = new Array(barCount).fill(0.1);
    const peakValues = new Array(barCount).fill(0.1);

    const render = () => {
      // High-DPI crisp canvas scaling
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

      // Extract frequency data from Web Audio if supported; otherwise generate harmonic beat-reactive data
      const freqData = supportsVisualizer ? engineCoordinator.getVisualizerData() : null;

      for (let i = 0; i < barCount; i++) {
        let target = 0.08;
        if (isPlaying) {
          if (freqData && freqData.length > 0) {
            const index = Math.floor((i / barCount) * (freqData.length * 0.7));
            target = (freqData[index] || 0) / 255;
          } else {
            // Simulated multi-sine beat & frequency wave
            const harmonic1 = Math.sin(phase * 1.5 + (i / barCount) * Math.PI * 2);
            const harmonic2 = Math.cos(phase * 2.3 + (i / barCount) * Math.PI * 4);
            const centerBell = Math.sin((i / barCount) * Math.PI);
            target = Math.max(0.1, (0.35 + harmonic1 * 0.25 + harmonic2 * 0.15) * centerBell);
          }
        }

        // Smooth physics interpolation (attack & decay)
        const current = barValues[i];
        barValues[i] = current + (target - current) * 0.22;

        if (barValues[i] > peakValues[i]) {
          peakValues[i] = barValues[i];
        } else {
          peakValues[i] = Math.max(0, peakValues[i] - 0.006);
        }
      }

      const centerY = displayHeight / 2;
      const totalWidth = displayWidth;
      const step = totalWidth / barCount;
      const barWidth = Math.max(2.5, step * 0.65);

      // --- Layer 1: Flowing Sine Wave Ribbons (Harmonics) ---
      if (!prefersReducedMotion) {
        const ribbonGradients = [
          { color: "rgba(255, 138, 61, 0.45)", width: 2.2, freq: 1.2, speed: 1.0, amp: 10 },
          { color: "rgba(255, 61, 119, 0.55)", width: 2.0, freq: 2.1, speed: 1.4, amp: 8 },
          { color: "rgba(122, 92, 255, 0.50)", width: 1.8, freq: 3.2, speed: 1.8, amp: 6 },
        ];

        for (const rib of ribbonGradients) {
          ctx.beginPath();
          ctx.lineWidth = rib.width;
          ctx.strokeStyle = rib.color;

          for (let x = 0; x <= totalWidth; x += 3) {
            const normX = x / totalWidth;
            const envelope = Math.sin(normX * Math.PI);
            const yOffset =
              Math.sin(normX * Math.PI * rib.freq * 2 + phase * rib.speed) *
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

        // Draw rounded capsule bar
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, topY, barWidth, height, radius);
        } else {
          ctx.rect(x, topY, barWidth, height);
        }
        ctx.fill();

        // Subtle peak dot
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
  }, [barCount, isPlaying, supportsVisualizer, glow]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        aria-label="Audio Waveform Visualizer"
      />
    </div>
  );
};
