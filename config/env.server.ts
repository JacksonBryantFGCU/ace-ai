import "server-only";

/**
 * Server-only environment access. The `server-only` import makes any attempt to
 * bundle this module into client code a build-time error — a stronger guarantee
 * than a runtime `typeof window` check.
 *
 * Secret accessors (e.g. the Supabase service-role key) are added here when they
 * are first consumed (Milestone 2). Today this module exposes only the generic
 * helpers, so the boundary exists without any speculative secrets inside it.
 */

/** Read a required server-only env var, throwing a clear error if it is missing. */
export function requireServerEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Read an optional server-only env var (no throw). */
export function optionalServerEnv(key: string): string | undefined {
  return process.env[key];
}

/** Supabase service-role key — bypasses RLS. Server-only; never expose to the client. */
export function getServiceRoleKey(): string {
  return requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
}

/** OpenAI API key. */
export function getOpenAIKey(): string {
  return requireServerEnv("OPENAI_API_KEY");
}

/** OpenAI model, defaulting to the model the original backend used. */
export function getOpenAIModel(): string {
  return optionalServerEnv("OPENAI_MODEL") ?? "gpt-4o-mini";
}
