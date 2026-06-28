"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared interview countdown. Ticks once per second while `active`, and fires
 * one-shot callbacks when the clock reaches the warning threshold (default 2:00)
 * and zero. Used by both the behavioral and technical voice islands so the
 * timer/warning behavior stays in one place.
 */
export function useInterviewTimer({
  totalSeconds,
  active,
  warnAtSeconds = 120,
  onWarning,
  onTimeUp,
}: {
  totalSeconds: number;
  active: boolean;
  warnAtSeconds?: number;
  onWarning?: () => void;
  onTimeUp?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const warnedRef = useRef(false);
  const endedRef = useRef(false);

  // Keep the latest callbacks without resubscribing the threshold effect.
  const onWarningRef = useRef(onWarning);
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onWarningRef.current = onWarning;
    onTimeUpRef.current = onTimeUp;
  });

  // Countdown.
  useEffect(() => {
    if (!active || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(t);
  }, [active, timeLeft]);

  // One-shot threshold callbacks.
  useEffect(() => {
    if (!active) return;
    if (timeLeft === warnAtSeconds && !warnedRef.current) {
      warnedRef.current = true;
      onWarningRef.current?.();
    }
    if (timeLeft === 0 && !endedRef.current) {
      endedRef.current = true;
      onTimeUpRef.current?.();
    }
  }, [active, timeLeft, warnAtSeconds]);

  const reset = useCallback(() => {
    warnedRef.current = false;
    endedRef.current = false;
    setTimeLeft(totalSeconds);
  }, [totalSeconds]);

  return { timeLeft, reset };
}

/** mm:ss formatter shared by the interview timers. */
export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
