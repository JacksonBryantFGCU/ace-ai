import type { User } from "@supabase/supabase-js";

/**
 * Human display name for a Supabase auth user: OAuth/profile name if present,
 * otherwise the email local-part. Used by the navbar avatar across surfaces.
 */
export function userDisplayName(user: User): string {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  return meta?.full_name ?? meta?.name ?? user.email?.split("@")[0] ?? "User";
}
