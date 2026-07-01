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

/** Over-common problems the model reaches for by default; excluded for variety. */
const CLICHE_TITLES = [
  "Two Sum",
  "FizzBuzz",
  "Reverse a String",
  "Reverse String",
  "Valid Parentheses",
  "Palindrome",
];

function buildPrompt(
  role: string,
  difficulty: Difficulty,
  level: ExperienceLevel,
  languageLabel: string,
  avoidTitles: string[],
): string {
  const avoid = Array.from(new Set([...CLICHE_TITLES, ...avoidTitles]));
  const avoidClause =
    avoid.length > 0
      ? `\n\nDo NOT generate any of these problems (by title or as a near-duplicate):\n${avoid.map((t) => `- ${t}`).join("\n")}`
      : "";

  return `You are a technical interviewer. Generate exactly 3 coding problems for a ${level}-level ${titleCase(
    role,
  )} candidate at ${difficulty} difficulty. The candidate will solve them in ${languageLabel}. Make them fresh and varied — prefer less common problems over textbook classics.${avoidClause}

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
- "hints": array of 2-3 short progressive hints, ordered from a gentle nudge to a near-spoiler approach. Do NOT include full code.
- "referenceSolution": a correct JavaScript implementation of functionName. Before responding, mentally run it against every test case and fix the test case or the solution until functionName(...input) === expected for all of them.

Rules:
- Test cases must be correct and deterministic. The reference solution called as functionName(...input) must return exactly "expected".
- Keep inputs small. Do not use functions, classes, or non-JSON values in input/expected.
- Vary the problems; make them solvable within a few minutes each.`;
}

/**
 * Structural gate for a generated problem (no code execution — that's the
 * offline pipeline's job). Rejects problems whose starter stubs don't define the
 * declared function, which is the most common way a generated problem is unusable.
 */
function isStructurallyValid(problem: CodingProblem): boolean {
  if (!problem.functionName || problem.testCases.length === 0) return false;
  const stubs = Object.values(problem.starterCode ?? {});
  if (stubs.length === 0) return false;
  return stubs.every((stub) => stub.includes(problem.functionName));
}

/** Drop the (unexecuted, spoiler) reference solution before handing problems to the client. */
function stripReferenceSolution(problem: CodingProblem): CodingProblem {
  const copy = { ...problem } as CodingProblem & { referenceSolution?: string };
  delete copy.referenceSolution;
  return copy;
}

/** Per-call variety inputs — kept out of the cache key except for `seed`. */
export interface GenerateOptions {
  /** Problem titles to avoid (the user's already-seen set). */
  avoidTitles?: string[];
  /** Rotates the cache entry so repeat calls at the same settings vary. */
  seed?: number;
}

async function run(
  role: string,
  difficulty: Difficulty,
  level: ExperienceLevel,
  language: ProgrammingLanguage,
  avoidTitles: string[],
): Promise<CodingProblem[]> {
  const languageLabel = LANGUAGES[language]?.label ?? language;
  try {
    const res = await getOpenAI().chat.completions.create({
      model: getOpenAIModel(),
      // A little heat for variety; still low enough to keep problems coherent.
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildPrompt(role, difficulty, level, languageLabel, avoidTitles) },
      ],
    });
    const raw = res.choices[0]?.message.content ?? "{}";
    const parsed = generatedProblemsSchema.parse(JSON.parse(raw));

    // Structural validation + strip the reference solution. If too many were
    // dropped, top up from the fallback bank so the interview always has 3.
    const valid = (parsed.problems as unknown as CodingProblem[])
      .filter(isStructurallyValid)
      .map(stripReferenceSolution);

    if (valid.length >= 3) return valid.slice(0, 3);

    const filler = FALLBACK_PROBLEMS.filter(
      (p) => !valid.some((v) => v.title === p.title),
    );
    return [...valid, ...filler].slice(0, 3);
  } catch (error) {
    console.error("generateProblems failed; using fallback bank:", error);
    return FALLBACK_PROBLEMS;
  }
}

/**
 * Generate 3 role/difficulty-aware coding problems via OpenAI, validated against
 * the canonical schema (+ a structural gate) and cached 24h. The cache key
 * includes `seed` so a user's repeat interviews at the same settings get a fresh
 * set rather than the identical cached one; `avoidTitles` further steers the
 * model away from problems they've already seen. Falls back to the local bank on
 * any failure. Mirrors the `analyzeVapiTranscript` pattern (Phase 3).
 */
export async function generateProblems(
  role: string,
  difficulty: Difficulty,
  level: ExperienceLevel,
  language: ProgrammingLanguage,
  opts: GenerateOptions = {},
): Promise<CodingProblem[]> {
  const avoidTitles = opts.avoidTitles ?? [];
  const seed = opts.seed ?? 0;
  const key = hashInput({ role, difficulty, level, language, seed });
  const cached = unstable_cache(
    () => run(role, difficulty, level, language, avoidTitles),
    ["problems", key],
    { revalidate: CACHE_TTL.questions, tags: ["problems"] },
  );
  try {
    return await cached();
  } catch {
    return FALLBACK_PROBLEMS;
  }
}
