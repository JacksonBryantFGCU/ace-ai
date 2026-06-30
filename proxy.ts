import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/config/env.public";
import { resolveAuthRedirect } from "@/lib/auth-redirects";

/**
 * Next.js 16 Proxy (formerly Middleware). Two clearly separated responsibilities:
 *
 *   1. Session refresh (mechanics) — read the session from cookies and write any
 *      refreshed cookies onto the response.
 *   2. Authorization (policy) — apply the pure `resolveAuthRedirect` rules to
 *      coarsely gate protected/auth-only routes.
 *
 * The redirect here is optimistic; real enforcement is `requireUser()` in the
 * protected layouts. No DB queries or ownership checks belong in the proxy.
 */
export async function proxy(request: NextRequest) {
  // --- 1. Session refresh ---------------------------------------------------
  let response = NextResponse.next({ request });

  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Mirror refreshed cookies onto both the request (for any downstream
        // read in this pass) and the response (sent back to the browser).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Triggers a token refresh when needed, invoking setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- 2. Authorization redirects -------------------------------------------
  const { pathname, searchParams, search } = request.nextUrl;
  const redirectTo = resolveAuthRedirect(pathname, Boolean(user), searchParams.get("next"), search);
  if (redirectTo) {
    const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url));
    // Carry over any cookies refreshed above so the session isn't dropped.
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
