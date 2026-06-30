import "server-only";

import { unstable_cache } from "next/cache";
import { getOpenAI } from "@/server/ai/client";
import { getOpenAIModel } from "@/config/env.server";
import {
  buildVapiAnalysisPrompt,
  formatSubmissions,
  formatTranscript,
} from "@/server/ai/prompts/evaluation";
import { CACHE_TTL, hashInput } from "@/server/cache";
import type {
  CodeSubmission,
  TranscriptEntry,
  VapiAnalysisResult,
  VapiInterviewConfig,
} from "@/types/interview";

/**
 * Fallback for individual missing fields when the model returns valid JSON but
 * omits a key. A *full* parse failure is treated as an error (thrown), not a
 * silent 50 — the caller persists the attempt as errored instead of saving a
 * fabricated score.
 */
const FIELD_FALLBACK: VapiAnalysisResult = {
  score: 50,
  communication: 50,
  technicalAccuracy: 50,
  problemSolving: 50,
  strengths: ["Unable to fully evaluate"],
  improvements: ["Unable to fully evaluate"],
  nextSteps: ["Retry the interview for a complete evaluation"],
  questionBreakdown: [],
};

async function runVapiAnalysis(
  transcript: TranscriptEntry[],
  config: VapiInterviewConfig,
  submissions: CodeSubmission[],
): Promise<VapiAnalysisResult> {
  const userContent =
    formatTranscript(transcript) +
    (submissions.length > 0 ? formatSubmissions(submissions) : "");

  const res = await getOpenAI().chat.completions.create({
    model: getOpenAIModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildVapiAnalysisPrompt(config) },
      { role: "user", content: userContent },
    ],
  });

  const raw = res.choices[0]?.message.content ?? "{}";

  let parsed: Partial<VapiAnalysisResult>;
  try {
    parsed = JSON.parse(raw) as Partial<VapiAnalysisResult>;
  } catch {
    // Genuine failure — surface it so the attempt isn't saved as a fake score.
    console.error("Failed to parse Vapi analysis response:", raw);
    throw new Error("The evaluator returned an unreadable response.");
  }

  return {
    score: parsed.score ?? FIELD_FALLBACK.score,
    communication: parsed.communication ?? FIELD_FALLBACK.communication,
    technicalAccuracy: parsed.technicalAccuracy ?? FIELD_FALLBACK.technicalAccuracy,
    problemSolving: parsed.problemSolving ?? FIELD_FALLBACK.problemSolving,
    strengths: parsed.strengths ?? FIELD_FALLBACK.strengths,
    improvements: parsed.improvements ?? FIELD_FALLBACK.improvements,
    nextSteps: parsed.nextSteps ?? FIELD_FALLBACK.nextSteps,
    questionBreakdown: parsed.questionBreakdown ?? FIELD_FALLBACK.questionBreakdown,
  };
}

/**
 * Score a transcript (and, for technical interviews, the candidate's code
 * submissions) with OpenAI, cached 1h keyed on the transcript+config+submissions
 * hash (the pure computation only — no user id in the key, so the cache is shared
 * and identical inputs return the same evaluation). Throws on a hard failure
 * (model/parse error) so the caller can avoid persisting a fabricated result.
 */
export async function analyzeVapiTranscript(
  transcript: TranscriptEntry[],
  config: VapiInterviewConfig,
  submissions: CodeSubmission[] = [],
): Promise<VapiAnalysisResult> {
  const key = hashInput({ transcript, config, submissions });
  const run = unstable_cache(
    () => runVapiAnalysis(transcript, config, submissions),
    ["analysis", key],
    {
      revalidate: CACHE_TTL.analysis,
      tags: ["analysis"],
    },
  );
  return run();
}
