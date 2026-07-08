"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";
import { canStartInterview } from "@/server/entitlements";
import { analyzeVapiTranscript } from "@/server/ai/evaluate";
import { saveInterview } from "@/server/storage";
import { clearDraft, readDraft, saveDraft } from "@/server/interview-draft";
import { loadScenario } from "@/server/scenarios/load";
import { evaluateInputSchema, firstIssue, interviewConfigSchema } from "@/lib/validation/interview";
import { routeForSetupDraft } from "@/lib/interview-routing";
import { scenarioToCandidate } from "@/lib/scenarios/selection/adapters";
import { interviewTrackMatchForScenario } from "@/lib/scenarios/selection/roles";
import { isPublicScenario } from "@/lib/scenarios/visibility";
import type {
  CodeSubmission,
  TranscriptEntry,
  VapiAnalysisResult,
  VapiInterviewConfig,
} from "@/types/interview";

export type SaveSetupDraftResult = { ok: false; error: string; reason?: "upgrade" };

/**
 * Persist the setup config as an httpOnly draft cookie, then redirect to the
 * matching interview route. Replaces the legacy `location.state` handoff.
 * On success it redirects (no return); on invalid input or an exhausted free
 * allowance it returns an error.
 *
 * The free/pass entitlement gate is enforced here — the single server choke point
 * that commits a config and starts an interview. Never trusted to the client.
 */
export async function saveSetupDraft(
  config: VapiInterviewConfig,
): Promise<SaveSetupDraftResult | void> {
  const user = await requireUser();

  const parsed = interviewConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }

  const entitlement = await canStartInterview(user.id, user.email);
  if (!entitlement.allowed) {
    return {
      ok: false,
      reason: "upgrade",
      error: "You've used your free interviews. Get a pass for unlimited practice.",
    };
  }

  await saveDraft(parsed.data);

  // redirect() throws — keep it outside any try/catch.
  redirect(routeForSetupDraft(parsed.data));
}

export type ChooseTechnicalScenarioResult = { ok: false; error: string };

export async function chooseTechnicalScenario(scenarioSlug: string): Promise<ChooseTechnicalScenarioResult | void> {
  const user = await requireUser();
  const draft = await readDraft();
  if (!draft || draft.questionType !== "technical") {
    return { ok: false, error: "Start a technical setup before choosing a scenario." };
  }

  const entitlement = await canStartInterview(user.id, user.email);
  if (!entitlement.allowed) {
    return {
      ok: false,
      error: "You've used your free interviews. Get a pass for unlimited practice.",
    };
  }

  let loaded;
  try {
    loaded = await loadScenario(scenarioSlug, { includeAuthorOnly: false });
  } catch {
    return { ok: false, error: "That scenario is no longer available." };
  }

  if (!isPublicScenario(loaded.scenario)) {
    return { ok: false, error: "That scenario is no longer available." };
  }

  const candidate = scenarioToCandidate(loaded.scenario, loaded.slug);
  if (!interviewTrackMatchForScenario(candidate, draft.role).allowed) {
    return { ok: false, error: "That scenario is not available for the selected role." };
  }

  await saveDraft({ ...draft, difficulty: loaded.scenario.difficulty, scenarioSlug: loaded.slug });
  redirect("/technical-interview");
}

export type SaveScenarioResult = { ok: true; id: string } | { ok: false; error: string };

/** Client-supplied, pre-computed scenario record (mapped by `lib/scenarios/interview-record`). */
export interface SaveScenarioInput {
  config: VapiInterviewConfig;
  result: VapiAnalysisResult;
  transcript: TranscriptEntry[];
  submissions: CodeSubmission[];
  metrics: { startedAt?: number; completedAt?: number; durationMs?: number; questionCount?: number };
}

/**
 * Persist a completed Scenario Runtime interview so it appears in Past Interviews,
 * the dashboard, and analytics. Unlike `evaluateInterview` the score is already
 * computed by the client evaluation engine (automated checks + AI review), so this
 * only authenticates, validates the config, saves, and revalidates read caches.
 */
export async function saveScenarioInterview(input: SaveScenarioInput): Promise<SaveScenarioResult> {
  const user = await requireUser();

  const parsedConfig = interviewConfigSchema.safeParse(input.config);
  if (!parsedConfig.success) {
    return { ok: false, error: firstIssue(parsedConfig.error) };
  }

  try {
    const { id } = await saveInterview(user.id, parsedConfig.data, input.result, input.transcript, {
      startedAt: input.metrics.startedAt,
      completedAt: input.metrics.completedAt,
      durationMs: input.metrics.durationMs,
      questionCount: input.metrics.questionCount,
      success: true,
      submissions: input.submissions.length > 0 ? input.submissions : undefined,
    });

    // Consume the setup draft so refreshing the interview route can't replay it.
    await clearDraft();

    revalidateTag(`interviews:${user.id}`, "max");
    revalidateTag(`dashboard:${user.id}`, "max");

    return { ok: true, id };
  } catch (error) {
    console.error("saveScenarioInterview failed:", error);
    return { ok: false, error: "Failed to save interview" };
  }
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
  submissions: CodeSubmission[] = [],
): Promise<EvaluateInterviewResult> {
  const user = await requireUser();

  if (!rateLimit(user.id, "ai").ok) {
    return { ok: false, error: "Too many requests. Please wait a moment and try again." };
  }

  // The model only scores interviewer/candidate turns; drop any system turns.
  const conversation = transcript.filter((entry) => entry.role !== "system");

  const parsed = evaluateInputSchema.safeParse({ transcript: conversation, config, submissions });
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }

  const validSubmissions = parsed.data.submissions ?? [];

  try {
    const result = await analyzeVapiTranscript(
      parsed.data.transcript,
      parsed.data.config,
      validSubmissions,
    );

    const { id } = await saveInterview(user.id, config, result, conversation, {
      ...metrics,
      success: true,
      questionCount: result.questionBreakdown.length || undefined,
      submissions: validSubmissions.length > 0 ? validSubmissions : undefined,
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
