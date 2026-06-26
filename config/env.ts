/**
 * Centralized environment access and validation.
 *
 * Two trust tiers:
 *  - `publicEnv` — `NEXT_PUBLIC_*` values, safe to ship to the browser bundle.
 *  - `serverEnv` — server-only secrets, read lazily so importing this module on
 *    the client never throws and never leaks. Use `requireServerEnv(...)` inside
 *    server code (Server Components, Actions, Route Handlers) to fail fast when a
 *    required secret is missing.
 *
 * NOTE: Supabase / OpenAI / Vapi keys are wired up in their respective phases
 * (auth, voice, AI). Their accessors are stubbed here so the contract is visible,
 * but they are intentionally optional during Phase 0 foundations.
 */

/** Values inlined into the client bundle. Never put a secret here. */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/**
 * Read a required server-only environment variable, throwing a clear error if it
 * is missing. Call this from server code only; it must never run in the browser.
 */
export function requireServerEnv(key: string): string {
  if (typeof window !== "undefined") {
    throw new Error(`requireServerEnv("${key}") was called in the browser.`);
  }
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Optional server-only environment variable (no throw). Useful for features that
 * gracefully degrade when a key is absent.
 */
export function optionalServerEnv(key: string): string | undefined {
  if (typeof window !== "undefined") return undefined;
  return process.env[key];
}
