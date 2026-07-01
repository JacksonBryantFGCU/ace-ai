import "server-only";

import { createAdminClient } from "@/server/db/admin";
import { getProfile } from "@/server/profile";
import { getDevUnlimitedEmails } from "@/config/env.server";
import { decideEntitlement, type Entitlement } from "@/lib/billing/entitlement";

/** Unlimited access for a testing allowlist email — no free/pass gate. */
const DEV_OVERRIDE: Entitlement = {
  allowed: true,
  reason: "dev_override",
  freeRemaining: 0,
  passActive: false,
};

/**
 * Whether the user may start a new interview, and why. The single source of
 * truth for the free/pass gate; enforced server-side in `saveSetupDraft` and
 * also read by the UI to reflect remaining-free / upgrade state.
 *
 * Reads the completed-interview count (admin client, scoped by `user_id`, like
 * `getAnalytics`) and the profile's pass expiry, then defers to the pure
 * `decideEntitlement`.
 */
export async function canStartInterview(userId: string, email?: string | null): Promise<Entitlement> {
  // Testing allowlist (billing on hold): unlimited access, gate untouched for
  // everyone else. Opt-in via DEV_UNLIMITED_EMAILS; unset in production. Checked
  // first (and against the authenticated email, which callers always have) so it
  // works even before any DB reads and regardless of whether profiles.email is set.
  const allowlist = getDevUnlimitedEmails();
  if (email && allowlist.includes(email.toLowerCase())) {
    return DEV_OVERRIDE;
  }

  const admin = createAdminClient();
  const [{ count, error }, profile] = await Promise.all([
    admin.from("interviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
    getProfile(userId),
  ]);

  if (error) {
    console.error("canStartInterview: failed to count interviews:", error.message);
    throw new Error("Failed to check interview entitlement");
  }

  // Fall back to the profile email too, in case a caller didn't pass one.
  const profileEmail = profile?.email?.toLowerCase();
  if (profileEmail && allowlist.includes(profileEmail)) {
    return DEV_OVERRIDE;
  }

  return decideEntitlement({
    completedCount: count ?? 0,
    accessExpiresAt: profile?.access_expires_at ?? null,
  });
}
