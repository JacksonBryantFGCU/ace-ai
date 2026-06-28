import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";
import { executeBodySchema } from "@/lib/validation/problem";
import { isExecutable } from "@/lib/languages";

/**
 * POST /api/execute — server-side code execution endpoint.
 *
 * Phase 5 executes JavaScript/TypeScript/Python entirely in the browser, so this
 * is a **guarded stub**: it authenticates, rate-limits, and validates the body,
 * but always rejects because the only languages that would need it (Java/C++/
 * Bash) require a real sandbox (Judge0/Piston/etc.) that does not exist yet.
 * Running untrusted code on the host (the legacy `child_process` approach) is an
 * RCE risk and is intentionally not reintroduced.
 */
export async function POST(request: Request) {
  const user = await requireUser();

  if (!rateLimit(user.id, "ai").ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = executeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Browser-executable languages should never reach the server.
  if (isExecutable(parsed.data.language)) {
    return NextResponse.json(
      { error: `${parsed.data.language} runs in the browser; no server execution is needed.` },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error:
        "Server-side execution for this language is not available in this version. A sandbox runner is planned.",
    },
    { status: 501 },
  );
}
