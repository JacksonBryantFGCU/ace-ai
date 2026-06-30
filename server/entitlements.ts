import "server-only";

import { createAdminClient } from "@/server/db/admin";
import { getProfile } from "@/server/profile";
import { decideEntitlement, type Entitlement } from "@/lib/billing/entitlement";

/**
 * Whether the user may start a new interview, and why. The single source of
 * truth for the free/pass gate; enforced server-side in `saveSetupDraft` and
 * also read by the UI to reflect remaining-free / upgrade state.
 *
 * Reads the completed-interview count (admin client, scoped by `user_id`, like
 * `getAnalytics`) and the profile's pass expiry, then defers to the pure
 * `decideEntitlement`.
 */
export async function canStartInterview(userId: string): Promise<Entitlement> {
  const admin = createAdminClient();
  const [{ count, error }, profile] = await Promise.all([
    admin.from("interviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
    getProfile(userId),
  ]);

  if (error) {
    console.error("canStartInterview: failed to count interviews:", error.message);
    throw new Error("Failed to check interview entitlement");
  }

  return decideEntitlement({
    completedCount: count ?? 0,
    accessExpiresAt: profile?.access_expires_at ?? null,
  });
}
