import "server-only";

import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/server/db/server-client";

/**
 * The authenticated user, revalidated against the Supabase Auth server, or null
 * if there is no valid session. Safe for trust/authorization decisions.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * The raw session from cookies, WITHOUT revalidating against the auth server.
 * Cheaper than `getUser()`; use it only when you need session presence or the
 * access token. For authorization decisions, prefer `getUser()`.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * The authenticated user, or a redirect to /login. Use in protected layouts,
 * pages, and actions.
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Redirects already-authenticated users away from anonymous-only pages (login,
 * signup, forgot/verify). Server-side defense-in-depth alongside the proxy's
 * optimistic redirect. Does nothing for anonymous users.
 */
export async function redirectIfAuthenticated(to = "/dashboard"): Promise<void> {
  const user = await getUser();
  if (user) {
    redirect(to);
  }
}
