import { FREE_INTERVIEW_LIMIT } from "@/lib/billing/passes";

/**
 * Pure entitlement decision — no I/O, so it's trivially unit-testable. The
 * server wrapper (`server/entitlements.ts`) supplies the inputs from the DB.
 */

export type EntitlementReason = "active_pass" | "free_remaining" | "free_used";

export interface Entitlement {
  allowed: boolean;
  reason: EntitlementReason;
  /** Free interviews left (0 when on a pass or exhausted). */
  freeRemaining: number;
  /** Whether a time pass is currently active. */
  passActive: boolean;
}

export function decideEntitlement(input: {
  completedCount: number;
  accessExpiresAt: string | null | undefined;
  now?: number;
  freeLimit?: number;
}): Entitlement {
  const now = input.now ?? Date.now();
  const freeLimit = input.freeLimit ?? FREE_INTERVIEW_LIMIT;

  const expiryMs = input.accessExpiresAt ? new Date(input.accessExpiresAt).getTime() : 0;
  const passActive = Number.isFinite(expiryMs) && expiryMs > now;

  if (passActive) {
    return { allowed: true, reason: "active_pass", freeRemaining: 0, passActive: true };
  }

  const freeRemaining = Math.max(0, freeLimit - input.completedCount);
  if (freeRemaining > 0) {
    return { allowed: true, reason: "free_remaining", freeRemaining, passActive: false };
  }

  return { allowed: false, reason: "free_used", freeRemaining: 0, passActive: false };
}
