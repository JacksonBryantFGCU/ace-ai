import "server-only";

import { createHash } from "node:crypto";

/**
 * Stable cache key from arbitrary input — the rebuild equivalent of the legacy
 * `generateCacheKey` (sha256 of the JSON form). Used to key `unstable_cache`
 * deterministically on AI inputs (transcript + config) so identical inputs hit
 * the cache regardless of object identity.
 */
export function hashInput(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/** TTLs ported from the backend cache service. */
export const CACHE_TTL = {
  /** Transcript analysis — 1 hour. */
  analysis: 3600,
  /** Question generation — 24 hours. */
  questions: 86400,
} as const;
