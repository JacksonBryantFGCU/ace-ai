import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/config/env.public";

/**
 * Request-scoped Supabase server client, bound to Next.js cookies. Reads and
 * refreshes the session under RLS. Create one per request (it captures the
 * cookie store); never share it across requests.
 *
 * In a Server Component, cookies cannot be written mid-render, so `setAll` is
 * wrapped in try/catch — the proxy (`proxy.ts`) is what actually persists
 * refreshed cookies. In Server Actions and Route Handlers, `setAll` succeeds.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render — safe to ignore; the proxy
          // refreshes the session cookies on the response.
        }
      },
    },
  });
}
