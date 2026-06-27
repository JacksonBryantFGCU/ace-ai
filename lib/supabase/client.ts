import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/config/env.public";

/**
 * Browser Supabase client (anon key). For client-side auth UI (sign-in/up,
 * OAuth) added in later milestones. Reads the cookies set by the server so the
 * session stays in sync across server and client. Never used for privileged or
 * data access — that stays server-side.
 */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
