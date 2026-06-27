import "server-only";

import { unstable_cache } from "next/cache";
import { getOpenAI } from "@/server/ai/client";
import { getOpenAIModel } from "@/config/env.server";
import { buildVapiAnalysisPrompt, formatTranscript } from "@/server/ai/prompts/evaluation";
import { CACHE_TTL, hashInput } from "@/server/cache";
import type { TranscriptEntry, VapiAnalysisResult, VapiInterviewConfig } from "@/types/interview";

/** Returned when the model call or JSON parse fails (ported fallback). */
const DEFAULT_ANALYSIS: VapiAnalysisResult = {
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
): Promise<VapiAnalysisResult> {
  const res = await getOpenAI().chat.completions.create({
    model: getOpenAIModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildVapiAnalysisPrompt(config) },
      { role: "user", content: formatTranscript(transcript) },
    ],
  });

  const raw = res.choices[0]?.message.content ?? "{}";

  try {
    const parsed = JSON.parse(raw) as Partial<VapiAnalysisResult>;
    return {
      score: parsed.score ?? DEFAULT_ANALYSIS.score,
      communication: parsed.communication ?? DEFAULT_ANALYSIS.communication,
      technicalAccuracy: parsed.technicalAccuracy ?? DEFAULT_ANALYSIS.technicalAccuracy,
      problemSolving: parsed.problemSolving ?? DEFAULT_ANALYSIS.problemSolving,
      strengths: parsed.strengths ?? DEFAULT_ANALYSIS.strengths,
      improvements: parsed.improvements ?? DEFAULT_ANALYSIS.improvements,
      nextSteps: parsed.nextSteps ?? DEFAULT_ANALYSIS.nextSteps,
      questionBreakdown: parsed.questionBreakdown ?? DEFAULT_ANALYSIS.questionBreakdown,
    };
  } catch {
    console.error("Failed to parse Vapi analysis response:", raw);
    return DEFAULT_ANALYSIS;
  }
}

/**
 * Score a transcript with OpenAI, cached 1h keyed on the transcript+config hash
 * (the pure computation only — no user data in the key, so the cache is shared
 * and identical transcripts return the same evaluation, mirroring the backend).
 */
export async function analyzeVapiTranscript(
  transcript: TranscriptEntry[],
  config: VapiInterviewConfig,
): Promise<VapiAnalysisResult> {
  const key = hashInput({ transcript, config });
  const run = unstable_cache(() => runVapiAnalysis(transcript, config), ["analysis", key], {
    revalidate: CACHE_TTL.analysis,
    tags: ["analysis"],
  });
  return run();
}
