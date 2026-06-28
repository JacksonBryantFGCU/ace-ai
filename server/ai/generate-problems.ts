import "server-only";

import { unstable_cache } from "next/cache";
import { getOpenAI } from "@/server/ai/client";
import { getOpenAIModel } from "@/config/env.server";
import { CACHE_TTL, hashInput } from "@/server/cache";
import { generatedProblemsSchema } from "@/lib/validation/problem";
import { FALLBACK_PROBLEMS } from "@/lib/data/technical-problems";
import { LANGUAGES } from "@/lib/languages";
import { titleCase } from "@/lib/format";
import type {
  CodingProblem,
  Difficulty,
  ExperienceLevel,
  ProgrammingLanguage,
} from "@/types/interview";

function buildPrompt(
  role: string,
  difficulty: Difficulty,
  level: ExperienceLevel,
  languageLabel: string,
): string {
  return `You are a technical interviewer. Generate exactly 3 coding problems for a ${level}-level ${titleCase(
    role,
  )} candidate at ${difficulty} difficulty. The candidate will solve them in ${languageLabel}.

Respond with a single JSON object: { "problems": [ ... ] }. Each problem must have EXACTLY these fields:
- "id": short kebab-case slug
- "title": short title
- "description": a clear problem statement (plain text, no markdown)
- "difficulty": "${difficulty}"
- "topics": array of topic strings
- "functionName": a single camelCase function name. It MUST be identical across all languages so it can be called the same way.
- "starterCode": object with keys "javascript", "typescript", "python", each a starter function stub that defines a function named exactly functionName (camelCase, even in Python).
- "testCases": array of 3 objects, each { "input": [...args], "expected": <return value> }. "input" is the argument list spread into the function; "expected" is the exact return value. Use only JSON-serializable values.
- "constraints": optional array of short strings

Rules:
- Test cases must be correct and deterministic. The reference solution called as functionName(...input) must return exactly "expected".
- Keep inputs small. Do not use functions, classes, or non-JSON values in input/expected.
- Vary the problems; make them solvable within a few minutes each.`;
}

async function run(
  role: string,
  difficulty: Difficulty,
  level: ExperienceLevel,
  language: ProgrammingLanguage,
): Promise<CodingProblem[]> {
  const languageLabel = LANGUAGES[language]?.label ?? language;
  try {
    const res = await getOpenAI().chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: buildPrompt(role, difficulty, level, languageLabel) }],
    });
    const raw = res.choices[0]?.message.content ?? "{}";
    const parsed = generatedProblemsSchema.parse(JSON.parse(raw));
    return parsed.problems.slice(0, 3) as unknown as CodingProblem[];
  } catch (error) {
    console.error("generateProblems failed; using fallback bank:", error);
    return FALLBACK_PROBLEMS;
  }
}

/**
 * Generate 3 role/difficulty-aware coding problems via OpenAI, validated against
 * the canonical schema and cached 24h (keyed on the inputs — no user data, so
 * the cache is shared). Falls back to the local bank on any failure. Mirrors the
 * `analyzeVapiTranscript` pattern (Phase 3).
 */
export async function generateProblems(
  role: string,
  difficulty: Difficulty,
  level: ExperienceLevel,
  language: ProgrammingLanguage,
): Promise<CodingProblem[]> {
  const key = hashInput({ role, difficulty, level, language });
  const cached = unstable_cache(() => run(role, difficulty, level, language), ["problems", key], {
    revalidate: CACHE_TTL.questions,
    tags: ["problems"],
  });
  try {
    return await cached();
  } catch {
    return FALLBACK_PROBLEMS;
  }
}
