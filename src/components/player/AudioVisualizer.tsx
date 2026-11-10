"use client";

import React, { useEffect, useRef } from "react";
import { engineCoordinator } from "@/lib/player/EngineCoordinator";
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
    const peaks = new Array(barCount).fill(0);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phase += isPlaying && !prefersReducedMotion ? 0.05 : 0.01;

      if (!supportsVisualizer) {
        // Honest ambient motion ribbon for YouTube IFrame engine (cross-origin audio cannot be sampled)
        ctx.lineWidth = 2;
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, "rgba(255, 138, 61, 0.25)");
        grad.addColorStop(0.5, isPlaying ? "rgba(255, 61, 119, 0.75)" : "rgba(255, 61, 119, 0.3)");
        grad.addColorStop(1, "rgba(122, 92, 255, 0.35)");
        ctx.strokeStyle = grad;

        ctx.beginPath();
        for (let x = 0; x <= width; x += 4) {
          const amp = isPlaying ? 7 : 2.5;
          const y =
            height / 2 +
            Math.sin((x / width) * Math.PI * 3 + phase) * amp * Math.sin((x / width) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        if (!prefersReducedMotion) {
          animationId = requestAnimationFrame(render);
        }
        return;
      }

      // Direct Audio Engine FFT Bars
      const step = width / barCount;
      const barWidth = Math.max(3, step - 3);
      const rawData = engineCoordinator.getVisualizerData();
      let hasData = false;

      if (rawData && rawData.length > 0) {
        let sum = 0;
        for (let i = 0; i < Math.min(16, rawData.length); i++) sum += rawData[i];
        if (sum > 0) hasData = true;
      }

      for (let i = 0; i < barCount; i++) {
        let normalizedHeight = 0.1;

        if (isPlaying && hasData && rawData) {
          const dataIdx = Math.floor((i / barCount) * rawData.length);
          normalizedHeight = Math.max(0.12, (rawData[dataIdx] || 0) / 255);
        } else {
          normalizedHeight = (Math.sin(phase + i * 0.25) * 0.5 + 0.5) * 0.16 + 0.08;
        }

        const barH = Math.max(4, normalizedHeight * (height - 8));
        const x = i * step + 1.5;
        const y = height - barH;

        if (barH > peaks[i]) peaks[i] = barH;
        else peaks[i] = Math.max(0, peaks[i] - 0.6);

        const gradient = ctx.createLinearGradient(0, height, 0, y);
        if (isPlaying) {
          gradient.addColorStop(0, "rgba(122, 92, 255, 0.95)");
          gradient.addColorStop(0.6, "rgba(255, 61, 119, 0.95)");
          gradient.addColorStop(1, "rgba(255, 138, 61, 0.95)");
        } else {
          gradient.addColorStop(0, "rgba(122, 92, 255, 0.3)");
          gradient.addColorStop(1, "rgba(255, 138, 61, 0.2)");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, [3, 3, 1, 1]);
        ctx.fill();

        if (isPlaying && peaks[i] > 6) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(x + barWidth / 2, Math.max(2, height - peaks[i] - 2), 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, barCount, supportsVisualizer]);

  return (
    <div className="w-full flex items-center justify-center py-1">
      <canvas
        ref={canvasRef}
        width={320}
        height={56}
        className={className}
        aria-label={supportsVisualizer ? "Audio Spectrum Visualizer" : "Ambient Playback Ribbon"}
      />
    </div>
  );
};
