import { useRef, useState, useCallback } from "react";

interface HoldToSeekOptions {
  onTap: () => void;
  onSeekRelative: (deltaSeconds: number) => void;
}

export function useHoldToSeek({ onTap, onSeekRelative }: HoldToSeekOptions) {
  const [isHolding, setIsHolding] = useState(false);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const didSeekRef = useRef<boolean>(false);

  const start = useCallback(
    (direction: 1 | -1) => {
      holdStartRef.current = Date.now();
      didSeekRef.current = false;
      setAccumulatedSeconds(0);

      // Start seeking after 350ms of continuous press
      timeoutRef.current = setTimeout(() => {
        didSeekRef.current = true;
        setIsHolding(true);

        const initialStep = direction * 5;
        setAccumulatedSeconds(initialStep);
        onSeekRelative(initialStep);

        intervalRef.current = setInterval(() => {
          const holdElapsed = Date.now() - holdStartRef.current;
          // Accelerate to 15s steps after 2000ms
          const stepSize = holdElapsed > 2000 ? 15 : 5;
          const delta = direction * stepSize;
          setAccumulatedSeconds((prev) => prev + delta);
          onSeekRelative(delta);
        }, 250);
      }, 350);
    },
    [onSeekRelative]
  );

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const elapsed = Date.now() - holdStartRef.current;
    if (elapsed < 350 && !didSeekRef.current) {
      onTap();
    }

    setTimeout(() => {
      setIsHolding(false);
      setAccumulatedSeconds(0);
    }, 200);
  }, [onTap]);

  return {
    start,
    stop,
    isHolding,
    accumulatedSeconds,
  };
}
