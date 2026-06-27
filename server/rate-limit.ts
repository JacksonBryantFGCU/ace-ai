import "server-only";

/**
 * Minimal fixed-window rate limiter, in-memory. Ported in spirit from the
 * Express `express-rate-limit` tiers (the `ai` bucket was 10/min).
 *
 * NOTE: in-memory means **single-instance only** — it does not coordinate
 * across multiple server instances or serverless invocations. When the deploy
 * target is decided (open question A2), back this with Redis. Treated as a
 * must-not-drop security property either way.
 */

type Bucket = { count: number; resetAt: number };

const LIMITS = {
  ai: { windowMs: 60_000, max: 10 },
} as const;

const store = new Map<string, Bucket>();

export function rateLimit(key: string, bucket: keyof typeof LIMITS): { ok: boolean } {
  const { windowMs, max } = LIMITS[bucket];
  const id = `${bucket}:${key}`;
  const now = Date.now();
  const entry = store.get(id);

  if (!entry || entry.resetAt <= now) {
    store.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= max) return { ok: false };
  entry.count += 1;
  return { ok: true };
}

/** Test-only: clear all buckets. */
export function _resetRateLimitForTests(): void {
  store.clear();
}
