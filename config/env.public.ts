/**
 * Public environment values (`NEXT_PUBLIC_*`). Safe to import from any runtime —
 * server or browser. Never add a secret here; anything in this module may be
 * inlined into the client bundle.
 *
 * This is the single source of truth for client-safe env: `config/site.ts` and
 * the Supabase client factories read from here instead of touching `process.env`
 * directly.
 */

export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;

/**
 * Returns the Supabase URL + anon key, throwing a clear error if either is
 * missing. Called by the browser/server client factories at construction time
 * (not at import) so `next build` doesn't require a populated env — failure
 * surfaces only when a client is actually created.
 */
export function getSupabasePublicConfig(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  const { supabaseUrl, supabaseAnonKey } = publicEnv;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase public env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return { supabaseUrl, supabaseAnonKey };
}
