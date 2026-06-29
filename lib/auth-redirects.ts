/**
 * Pure authorization-redirect policy. No I/O, no secrets — safe to import from
 * any runtime. This is the single place that decides, from a pathname + auth
 * state, where (if anywhere) to redirect. `proxy.ts` applies it; keeping it pure
 * separates authorization policy from the cookie/session-refresh mechanics.
 */

/** URL prefixes for the protected `(app)` and `(interview)` route groups. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/analytics",
  "/interviews",
  "/setup",
  "/profile",
  "/interview",
  "/technical-interview",
] as const;

/**
 * Auth pages that an already-authenticated user should be bounced away from.
 * Deliberately excludes `/reset-password` (needs a recovery session) and the
 * `/auth/*` route handlers.
 */
const ANON_ONLY_PATHS = ["/login", "/signup", "/forgot-password", "/verify-email"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAnonOnlyAuthPath(pathname: string): boolean {
  return ANON_ONLY_PATHS.some((p) => pathname === p);
}

/**
 * Returns a safe internal redirect path from an untrusted `next` value, falling
 * back when it is missing or could be an open redirect. Used everywhere a `next`
 * param is consumed so the rule lives in exactly one place. The default landing
 * is the home page (`/`).
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  // Must be an internal absolute path. Reject protocol-relative ("//"),
  // backslash tricks, and anything with a scheme.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.includes("://")) return fallback;
  return next;
}

/**
 * Coarse, optimistic redirect decision for the proxy. Returns a path to redirect
 * to, or null to continue. Real enforcement still happens in the protected
 * layouts via `requireUser()`.
 */
export function resolveAuthRedirect(
  pathname: string,
  isAuthed: boolean,
  nextParam?: string | null,
): string | null {
  if (isProtectedPath(pathname)) {
    if (!isAuthed) return `/login?next=${encodeURIComponent(pathname)}`;
    return null;
  }
  if (isAnonOnlyAuthPath(pathname) && isAuthed) {
    return safeNext(nextParam);
  }
  return null;
}
