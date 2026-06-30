import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/server/db/admin";
import type { ProfileRow } from "@/types/db";

/**
 * Cached read of a user's profile row. Read via the **admin client** (scoped by
 * `id`) for the same reason as `getAnalytics`: the work runs inside
 * `unstable_cache`, outside request scope, so it can't use the cookie-bound RLS
 * client. Tagged `profile:${userId}` — `updateRole` already revalidates that tag,
 * so an edit busts this cache.
 */
const PROFILE_COLUMNS =
  "id, email, name, role, stripe_customer_id, access_expires_at, created_at";

export function getProfile(userId: string): Promise<ProfileRow | null> {
  const run = unstable_cache(
    async (): Promise<ProfileRow | null> => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("getProfile failed:", error.message);
        throw new Error("Failed to load profile");
      }

      return (data as ProfileRow | null) ?? null;
    },
    ["profile", userId],
    { tags: [`profile:${userId}`] },
  );
  return run();
}
