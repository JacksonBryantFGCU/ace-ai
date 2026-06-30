/**
 * Time-pass catalog and the free-tier limit — the single source of truth for the
 * billing model, shared by the marketing pricing page, the entitlement gate, the
 * checkout action, and the webhook. Pure data + helpers (no secrets, no I/O):
 * Stripe Price IDs live server-side in `config/env.server.ts`, keyed by `id`.
 */

export type PassId = "day" | "week";

export interface Pass {
  id: PassId;
  /** Display name, e.g. "Week Pass". */
  label: string;
  /** Access granted, in days. */
  durationDays: number;
  /** Display price (keep in sync with the Stripe Price). */
  priceLabel: string;
  /** Short description for the pricing card. */
  blurb: string;
  /** Visually emphasized on the pricing page. */
  highlighted?: boolean;
}

/**
 * Completed interviews included free, per account, lifetime. Set to match the
 * marketing copy ("2 free interviews — one behavioral and one technical").
 */
export const FREE_INTERVIEW_LIMIT = 2;

export const PASSES: readonly Pass[] = [
  {
    id: "day",
    label: "Day Pass",
    durationDays: 1,
    priceLabel: "$5",
    blurb: "24 hours of unlimited interviews — perfect for a final cram.",
  },
  {
    id: "week",
    label: "Week Pass",
    durationDays: 7,
    priceLabel: "$15",
    blurb: "7 days of unlimited practice for the week before your onsite.",
    highlighted: true,
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Narrow an arbitrary string to a known pass id, or undefined. */
export function asPassId(value: string | undefined): PassId | undefined {
  return PASSES.find((p) => p.id === value)?.id;
}

export function getPass(id: PassId): Pass {
  return PASSES.find((p) => p.id === id)!;
}

/**
 * New access expiry after purchasing `pass`, given the current expiry. Passes
 * stack: time is added from `max(now, currentExpiry)` so an active pass isn't
 * truncated. Returns an ISO timestamp.
 */
export function computeAccessExpiry(
  pass: Pass,
  currentExpiry: string | null | undefined,
  now: number = Date.now(),
): string {
  const currentMs = currentExpiry ? new Date(currentExpiry).getTime() : 0;
  const base = Number.isFinite(currentMs) ? Math.max(now, currentMs) : now;
  return new Date(base + pass.durationDays * DAY_MS).toISOString();
}
