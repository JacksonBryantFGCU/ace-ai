"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A session timer with two modes:
 *
 * - **Informational (default):** pass `estimatedMinutes` (or nothing). Counts
 *   elapsed time up and shows the estimate remaining. It NEVER ends anything — a
 *   pacing aid only.
 * - **Strict limit:** pass `limitMinutes` with an `onExpire` callback. Counts the
 *   remaining time *down* from the limit and fires `onExpire` exactly once when it
 *   hits zero — used to hard-cap a real interview. `limitMinutes` takes precedence
 *   over `estimatedMinutes`.
 */
export function Timer({
  estimatedMinutes,
  limitMinutes,
  onExpire,
  startedAt,
  className,
}: {
  estimatedMinutes?: number;
  /** Hard cap in minutes. When set, the timer counts down and calls `onExpire` at 0. */
  limitMinutes?: number;
  onExpire?: () => void;
  startedAt?: number;
  className?: string;
}) {
  const [start] = useState(() => startedAt ?? Date.now());
  // Seed `now` to `start` so first paint shows 0:00 identically on server and
  // client (no hydration mismatch); the interval takes over after mount.
  const [now, setNow] = useState(() => start);
  const expiredRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMs = Math.max(0, now - start);

  // ── Strict countdown mode ──────────────────────────────────────────────────
  const limitMs = limitMinutes != null ? limitMinutes * 60_000 : null;
  const remainingMs = limitMs != null ? Math.max(0, limitMs - elapsedMs) : null;

  // Fire `onExpire` once when the countdown reaches zero (in an effect, never
  // during render, so the parent state update is safe).
  useEffect(() => {
    if (limitMs == null || expiredRef.current) return;
    if (elapsedMs >= limitMs) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [elapsedMs, limitMs, onExpire]);

  if (limitMs != null && remainingMs != null) {
    const expired = remainingMs <= 0;
    const lowTime = remainingMs <= 120_000; // final 2 minutes
    return (
      <span
        role="timer"
        aria-label={
          expired
            ? "Time is up"
            : `${formatClock(remainingMs)} remaining of the ${limitMinutes} minute limit`
        }
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs tabular-nums",
          expired || lowTime
            ? "border-red-400/40 bg-red-500/10 text-red-200"
            : "border-white/15 bg-white/5 text-gray-200",
          className,
        )}
      >
        <Clock className="size-3.5" aria-hidden="true" />
        {expired ? (
          <span>Time&apos;s up</span>
        ) : (
          <>
            <span className="font-medium">{formatClock(remainingMs)}</span>
            <span className="text-gray-500">/ {formatClock(limitMs)}</span>
          </>
        )}
      </span>
    );
  }

  // ── Informational count-up mode (unchanged) ────────────────────────────────
  const estimateMs = estimatedMinutes != null ? estimatedMinutes * 60_000 : null;
  const overEstimate = estimateMs != null && elapsedMs >= estimateMs;
  const estRemainingMs = estimateMs != null ? Math.max(0, estimateMs - elapsedMs) : null;

  const label =
    estRemainingMs != null
      ? overEstimate
        ? `${formatClock(elapsedMs)} elapsed, over the ${estimatedMinutes} minute estimate`
        : `${formatClock(elapsedMs)} elapsed, about ${formatClock(estRemainingMs)} of the estimate left`
      : `${formatClock(elapsedMs)} elapsed`;

  return (
    <span
      role="timer"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs tabular-nums",
        overEstimate
          ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
          : "border-white/15 bg-white/5 text-gray-300",
        className,
      )}
    >
      <Clock className="size-3.5" aria-hidden="true" />
      <span>{formatClock(elapsedMs)}</span>
      {estRemainingMs != null ? (
        <span className={overEstimate ? "text-amber-300/80" : "text-gray-500"}>
          {overEstimate ? "over estimate" : `~${formatClock(estRemainingMs)} left`}
        </span>
      ) : null}
    </span>
  );
}

/** ms → `M:SS` (or `H:MM:SS` past an hour). */
function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
