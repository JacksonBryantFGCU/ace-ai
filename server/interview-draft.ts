import "server-only";

import { cookies } from "next/headers";
import { interviewConfigSchema } from "@/lib/validation/interview";
import type { VapiInterviewConfig } from "@/types/interview";

/**
 * The setup→interview config handoff: a short-lived httpOnly cookie holding the
 * validated interview config. Replaces the legacy `location.state` (which was
 * lost on refresh and invisible to the server). Read on the server when the
 * interview route renders.
 */

const DRAFT_COOKIE = "interview_draft";
const MAX_AGE_SECONDS = 60 * 30; // 30 minutes

export async function saveDraft(config: VapiInterviewConfig): Promise<void> {
  const store = await cookies();
  store.set(DRAFT_COOKIE, JSON.stringify(config), {
    httpOnly: true,
    sameSite: "lax",
    // Secure cookies aren't stored over http://localhost in dev.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Read + validate the draft. Returns null if absent or malformed/tampered. */
export async function readDraft(): Promise<VapiInterviewConfig | null> {
  const store = await cookies();
  const raw = store.get(DRAFT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = interviewConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  const store = await cookies();
  store.set(DRAFT_COOKIE, "", { path: "/", maxAge: 0 });
}
