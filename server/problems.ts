import "server-only";

import { generateProblems } from "@/server/ai/generate-problems";
import { FALLBACK_PROBLEMS, pickRandomProblems } from "@/lib/data/technical-problems";
import type { CodingProblem, VapiInterviewConfig } from "@/types/interview";

/**
 * Resolve the 3 coding problems for a technical interview, server-side (called
 * from the route's Server Component). Mirrors the legacy decision: if the
 * candidate chose focus topics, draw from the local bank; otherwise generate via
 * AI. Always returns at least the fallback set.
 */
export async function resolveProblems(config: VapiInterviewConfig): Promise<CodingProblem[]> {
  const topics = config.topics ?? [];
  const codeTopics = topics.filter((t) => t !== "system-design");

  if (codeTopics.length > 0) {
    const picked = pickRandomProblems(config.difficulty, topics, 3);
    return picked.length > 0 ? picked : FALLBACK_PROBLEMS;
  }

  const language = config.language ?? "javascript";
  const problems = await generateProblems(config.role, config.difficulty, config.experience, language);
  return problems.length > 0 ? problems : FALLBACK_PROBLEMS;
}
