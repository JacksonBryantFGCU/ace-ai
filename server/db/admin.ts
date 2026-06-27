import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/config/env.public";
import { getServiceRoleKey } from "@/config/env.server";

/**
 * Service-role Supabase client. **Bypasses RLS** — use only on the server, only
 * after the caller has been authenticated (`requireUser()`), and always scope
 * writes/reads by `user.id`. Never import this into client code.
 *
 * Instantiated once per server module (lazy singleton); it is stateless and
 * does not persist sessions.
 */
let client: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (client) return client;
  const { supabaseUrl } = getSupabasePublicConfig();
  client = createClient(supabaseUrl, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
