"use server";

import { unstable_cache } from "next/cache";
import { checkpointSource } from "@/server/scenarios/checkpoint-source";
import { verifyFinalOnServer, verifyStepOnServer } from "@/server/scenarios/verification-service";
import {
  getMlDataPreview,
  listMlDataFiles,
} from "@/server/scenarios/machine-learning-data-preview";
import { previewMlScript } from "@/server/scenarios/machine-learning-preview";
import { loadScenario } from "@/server/scenarios/load";
import { requireUser } from "@/server/auth";
import { getOpenAI } from "@/server/ai/client";
import { getOpenAIModel } from "@/config/env.server";
import { CACHE_TTL, hashInput } from "@/server/cache";
import {
  buildScenarioGradingPrompt,
  formatCandidateWork,
} from "@/server/ai/prompts/scenario-evaluation";
import type { AiReviewInput, AiReviewResult } from "@/lib/scenarios/evaluation/ai-review";
import type { MlDataPreview } from "@/lib/scenarios/machine-learning-data-preview";
import type { MlScriptPreviewResult } from "@/lib/scenarios/machine-learning-preview";
import type { CheckpointFile } from "@/lib/scenarios/types";
import type {
  SnapshotFile,
  VerificationResult,
  VerificationStepRef,
} from "@/lib/scenarios/verification";

/**
 * Run a step's verification on the server and return ONLY the result. Execution
 * happens entirely server-side (authored tests are read + run behind the
 * `TestSource`/`VerificationEngine` abstractions), so authored tests never reach
 * the browser. Works identically in development and production. Authenticated.
 */
export async function runStepVerification(input: {
  scenarioSlug: string;
  step: VerificationStepRef;
  files: SnapshotFile[];
}): Promise<VerificationResult> {
  await requireUser();
  return verifyStepOnServer({
    scenarioSlug: input.scenarioSlug,
    step: input.step,
    files: input.files,
  });
}

/**
 * Run FINAL validation on the server (Phase 4 UI over the Phase 3
 * `verifyMlScenarioFinal`/`verifyMlFinal` verifier). Only `machine-learning`
 * scenarios currently have a real final verifier — see `verifyFinalOnServer`.
 * Authenticated, mirrors `runStepVerification`'s shape.
 */
export async function runFinalVerification(input: {
  scenarioSlug: string;
  files: SnapshotFile[];
}): Promise<VerificationResult> {
  await requireUser();
  return verifyFinalOnServer({
    scenarioSlug: input.scenarioSlug,
    files: input.files,
  });
}

/**
 * List the candidate-visible `workspace/data/*.csv` files for an ML scenario's
 * Data Preview panel. Authenticated; resolves through the same candidate-facing
 * `LoadedScenario.files` allowlist as every other panel (never touches `tests/`
 * or `solution/`).
 */
export async function listMlScenarioDataFiles(scenarioSlug: string): Promise<string[]> {
  await requireUser();
  return listMlDataFiles(scenarioSlug);
}

/**
 * Fetch a bounded preview (columns + first 5 rows) of one `workspace/data/*.csv`
 * file for the ML Data Preview panel. Authenticated.
 */
export async function fetchMlDataPreview(scenarioSlug: string, fileName: string): Promise<MlDataPreview> {
  await requireUser();
  return getMlDataPreview(scenarioSlug, fileName);
}

/**
 * Run the ML "Output Preview" — `python main.py` against the candidate's
 * current workspace (Data Preview's sibling: notebook-style script output, NOT
 * verification). Never runs pytest, never touches step pass/fail or gating.
 * Authenticated.
 */
export async function runMlPreview(input: {
  scenarioSlug: string;
  files: SnapshotFile[];
}): Promise<MlScriptPreviewResult> {
  await requireUser();
  return previewMlScript({
    scenarioSlug: input.scenarioSlug,
    files: input.files,
  });
}

/**
 * Resolve a step's authored checkpoint into workspace-relative files, for the
 * client to copy into the runtime session. Goes through the `checkpointSource`
 * abstraction, so the UI is decoupled from where checkpoints come from. Checkpoint
 * content is candidate-facing by design (the "give me the solution to move on"
 * recovery). Authenticated; works identically in development and production.
 */
export async function fetchCheckpoint(
  scenarioSlug: string,
  stepId: string,
): Promise<CheckpointFile[]> {
  await requireUser();
  return checkpointSource.resolve(scenarioSlug, stepId);
}

/** Per-field fallback when the model returns valid JSON but omits a key. */
const REVIEW_FALLBACK: AiReviewResult = {
  score: 0,
  communication: 0,
  strengths: [],
  improvements: [],
  nextSteps: [],
};

async function runScenarioGrade(input: AiReviewInput): Promise<AiReviewResult> {
  // Re-load the scenario WITH author-only grading data server-side — the browser
  // never receives the rubric, so grading must resolve it here.
  const loaded = await loadScenario(input.scenarioSlug, { includeAuthorOnly: true });

  const res = await getOpenAI().chat.completions.create({
    model: getOpenAIModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildScenarioGradingPrompt(loaded.scenario) },
      { role: "user", content: formatCandidateWork(input) },
    ],
  });

  const raw = res.choices[0]?.message.content ?? "{}";
  let parsed: Partial<AiReviewResult>;
  try {
    parsed = JSON.parse(raw) as Partial<AiReviewResult>;
  } catch {
    console.error("Failed to parse scenario grading response:", raw);
    throw new Error("The evaluator returned an unreadable response.");
  }

  return {
    score: parsed.score ?? REVIEW_FALLBACK.score,
    communication: parsed.communication ?? REVIEW_FALLBACK.communication,
    strengths: parsed.strengths ?? REVIEW_FALLBACK.strengths,
    improvements: parsed.improvements ?? REVIEW_FALLBACK.improvements,
    nextSteps: parsed.nextSteps ?? REVIEW_FALLBACK.nextSteps,
  };
}

/**
 * AI-grade a completed interview's responses, reasoning, and discussion answers
 * against the authored rubric. Automated correctness is scored separately; this
 * covers everything the deterministic scorers can't. Authenticated, and cached 1h
 * keyed on the input hash so an identical attempt doesn't re-bill the model.
 */
export async function gradeScenarioResponses(input: AiReviewInput): Promise<AiReviewResult> {
  await requireUser();
  const run = unstable_cache(() => runScenarioGrade(input), ["scenario-grade", hashInput(input)], {
    revalidate: CACHE_TTL.analysis,
    tags: ["scenario-grade"],
  });
  return run();
}
