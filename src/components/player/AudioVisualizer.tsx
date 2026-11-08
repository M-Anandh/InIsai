"use client";

import React, { useEffect, useRef } from "react";
import { audioEngine } from "@/lib/audio-engine";
import { usePlayerStore } from "@/stores/player-store";

interface AudioVisualizerProps {
  className?: string;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  className = "w-full h-12",
  barCount = 36,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;
    const peaks = new Array(barCount).fill(0);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const step = width / barCount;
      const barWidth = Math.max(3, step - 3);

      // Check real audio engine data first
      const rawData = audioEngine.getVisualizerData();
      let hasRealData = false;
      if (rawData && rawData.length > 0) {
        let sum = 0;
        for (let i = 0; i < Math.min(16, rawData.length); i++) sum += rawData[i];
        if (sum > 10) hasRealData = true;
      }

      phase += isPlaying ? 0.08 : 0.015;

      for (let i = 0; i < barCount; i++) {
        let normalizedHeight = 0;

        if (isPlaying) {
          if (hasRealData && rawData) {
            const dataIdx = Math.floor((i / barCount) * rawData.length);
            normalizedHeight = (rawData[dataIdx] || 0) / 255;
          } else {
            // High-fidelity musical spectrum simulation
            // Bass emphasis on left (lower frequencies), mids in center, treble on right
            const freqRatio = i / barCount;
            const bassWave = Math.sin(phase * 1.8 + i * 0.35) * 0.45 + 0.55;
            const midWave = Math.cos(phase * 2.4 - i * 0.4) * 0.35 + 0.45;
            const trebleWave = Math.sin(phase * 3.2 + i * 0.6) * 0.25 + 0.3;

            if (freqRatio < 0.35) {
              // Bass region
              normalizedHeight = bassWave * 0.85 + Math.sin(phase * 4 + i) * 0.15;
            } else if (freqRatio < 0.75) {
              // Mids / Vocals
              normalizedHeight = midWave * 0.75 + Math.cos(phase * 3 + i * 0.5) * 0.2;
            } else {
              // Highs / Treble
              normalizedHeight = trebleWave * 0.6 + Math.sin(phase * 5 + i * 0.8) * 0.2;
            }

            // Natural audio dynamic dip / breathing
            const breathing = Math.sin(phase * 0.5) * 0.15 + 0.85;
            normalizedHeight = Math.min(1, Math.max(0.12, normalizedHeight * breathing));
          }
        } else {
          // Tranquil resting waveform when paused
          normalizedHeight = (Math.sin(phase + i * 0.25) * 0.5 + 0.5) * 0.18 + 0.08;
        }

        const barH = Math.max(4, normalizedHeight * (height - 8));
        const x = i * step + 1.5;
        const y = height - barH;

        // Peak dot tracking with gravity
        if (barH > peaks[i]) {
          peaks[i] = barH;
        } else {
          peaks[i] = Math.max(0, peaks[i] - 0.6);
        }

        // Gradient bar
        const gradient = ctx.createLinearGradient(0, height, 0, y);
        if (isPlaying) {
          gradient.addColorStop(0, "rgba(149, 101, 255, 0.95)"); // Electric Violet
          gradient.addColorStop(0.6, "rgba(32, 199, 232, 0.95)"); // Cyan
          gradient.addColorStop(1, "rgba(16, 185, 129, 0.95)");  // Emerald
        } else {
          gradient.addColorStop(0, "rgba(149, 101, 255, 0.3)");
          gradient.addColorStop(1, "rgba(32, 199, 232, 0.2)");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, [3, 3, 1, 1]);
        ctx.fill();

        // Glowing peak cap on active playing
        if (isPlaying && peaks[i] > 6) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(x + barWidth / 2, Math.max(2, height - peaks[i] - 2), 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, barCount, currentTime]);

  return (
    <div className="w-full flex items-center justify-center py-1">
      <canvas
        ref={canvasRef}
        width={320}
        height={56}
        className={className}
        aria-label="Real-time Audio Visualizer"
      />
    </div>
  );
};
