"use client";

import React, { useEffect, useRef } from "react";
import { audioEngine } from "@/lib/audio-engine";
import { usePlayerStore } from "@/stores/player-store";

interface AudioVisualizerProps {
  className?: string;
  barColor?: string;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  className = "w-full h-12",
  barColor = "#8b5cf6",
  barCount = 32,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const data = audioEngine.getVisualizerData();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!data || !isPlaying) {
        // Draw static subtle resting bars
        const step = canvas.width / barCount;
        ctx.fillStyle = "rgba(139, 92, 246, 0.2)";
        for (let i = 0; i < barCount; i++) {
          const barHeight = 4 + Math.sin(i * 0.3) * 2;
          ctx.fillRect(
            i * step + 2,
            canvas.height - barHeight,
            Math.max(2, step - 3),
            barHeight
          );
        }
      } else {
        const step = canvas.width / barCount;
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, barColor);
        grad.addColorStop(1, "#06b6d4");
        ctx.fillStyle = grad;

        for (let i = 0; i < barCount; i++) {
          const dataIdx = Math.floor((i / barCount) * data.length);
          const rawVal = data[dataIdx] || 0;
          const percent = rawVal / 255;
          const barHeight = Math.max(3, percent * (canvas.height - 4));

          // Draw rounded bar
          const x = i * step + 2;
          const y = canvas.height - barHeight;
          const w = Math.max(2, step - 3);

          ctx.beginPath();
          ctx.roundRect(x, y, w, barHeight, [2, 2, 0, 0]);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, barColor, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={48}
      className={className}
      aria-label="Real-time Audio Visualizer"
    />
  );
};
