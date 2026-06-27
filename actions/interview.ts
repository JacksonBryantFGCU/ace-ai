"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";
import { analyzeVapiTranscript } from "@/server/ai/evaluate";
import { saveInterview } from "@/server/storage";
import { clearDraft, saveDraft } from "@/server/interview-draft";
import { evaluateInputSchema, firstIssue, interviewConfigSchema } from "@/lib/validation/interview";
import type { TranscriptEntry, VapiAnalysisResult, VapiInterviewConfig } from "@/types/interview";

export type SaveSetupDraftResult = { ok: false; error: string };

/**
 * Persist the setup config as an httpOnly draft cookie, then redirect to the
 * matching interview route. Replaces the legacy `location.state` handoff.
 * On success it redirects (no return); on invalid input it returns an error.
 */
export async function saveSetupDraft(
  config: VapiInterviewConfig,
): Promise<SaveSetupDraftResult | void> {
  await requireUser();

  const parsed = interviewConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }

  await saveDraft(parsed.data);

  // redirect() throws — keep it outside any try/catch.
  redirect(parsed.data.questionType === "technical" ? "/technical-interview" : "/interview/voice");
}

export type EvaluateInterviewResult =
  | { ok: true; id: string; result: VapiAnalysisResult }
  | { ok: false; error: string };

/** Optional client-supplied call metrics (timings/counts). */
export interface EvaluateMetrics {
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

/**
 * Evaluate a finished interview transcript and persist it. Called by the voice
 * interview client islands (P4/P5) at the end of a call. Authenticates, rate
 * limits, validates, scores via OpenAI (cached), saves via the admin client,
 * and revalidates the user's read caches.
 */
export async function evaluateInterview(
  transcript: TranscriptEntry[],
  config: VapiInterviewConfig,
  metrics: EvaluateMetrics = {},
): Promise<EvaluateInterviewResult> {
  const user = await requireUser();

  if (!rateLimit(user.id, "ai").ok) {
    return { ok: false, error: "Too many requests. Please wait a moment and try again." };
  }

  // The model only scores interviewer/candidate turns; drop any system turns.
  const conversation = transcript.filter((entry) => entry.role !== "system");

  const parsed = evaluateInputSchema.safeParse({ transcript: conversation, config });
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }

  try {
    const result = await analyzeVapiTranscript(parsed.data.transcript, parsed.data.config);

    const { id } = await saveInterview(user.id, config, result, conversation, {
      ...metrics,
      success: true,
      questionCount: result.questionBreakdown.length || undefined,
    });

    // The interview is complete — consume its setup draft so a refresh of the
    // interview route doesn't replay the same config.
    await clearDraft();

    revalidateTag(`interviews:${user.id}`, "max");
    revalidateTag(`dashboard:${user.id}`, "max");

    return { ok: true, id, result };
  } catch (error) {
    console.error("evaluateInterview failed:", error);
    return { ok: false, error: "Failed to evaluate interview" };
  }
}
