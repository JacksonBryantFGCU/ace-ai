import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/server/db/server-client";
import { safeNext } from "@/lib/auth-redirects";

/**
 * OAuth callback. Exchanges the `code` for a session (setting cookies via the
 * server client) and forwards to a validated `next` path. Public route handler.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
