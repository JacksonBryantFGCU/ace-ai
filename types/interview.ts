/**
 * Single source of truth for interview-domain types, replacing the old FE/BE
 * duplication. Shapes here are derived from the rebuild plan (docs/nextjs-rebuild-plan).
 *
 * TODO(port): reconcile exact field names/optionality against the original
 * `aiService` / Vapi types when porting server logic (Phase 3) and the voice
 * islands (Phase 4+). Treat these as the agreed contract until then.
 */

export type Difficulty = "easy" | "medium" | "hard";

export type ExperienceLevel = "junior" | "mid" | "senior" | "staff";

/** Evaluation strictness; higher = harsher scoring. */
export type Strictness = "lenient" | "balanced" | "strict";

export type QuestionType = "behavioral" | "technical";

export type ProgrammingLanguage = "javascript" | "typescript" | "python" | "java" | "cpp" | "bash";

/** The configuration captured at setup and resolved server-side for an interview. */
export interface VapiInterviewConfig {
  role: string;
  difficulty: Difficulty;
  experience: ExperienceLevel;
  strictness: Strictness;
  questionType: QuestionType;
  /** Interviewer persona id (see `lib/constants` roster). */
  interviewer: string;
  /** Coding language for technical interviews. */
  language?: ProgrammingLanguage;
  /** Optional topic filters; when empty, problems are AI-generated. */
  topics?: string[];
}

/** One turn in a voice interview transcript. */
export interface TranscriptEntry {
  role: "user" | "assistant" | "system";
  text: string;
  timestamp?: number;
}

/** Result of scoring a transcript with OpenAI. */
export interface VapiAnalysisResult {
  /** Overall score, 0–100. */
  score: number;
  /** Per-dimension scores (e.g. communication, technical depth). */
  breakdown: Record<string, number>;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  summary?: string;
}

/** A single test case for a coding problem. */
export interface TestCase {
  input: unknown[];
  expected: unknown;
}

/** A coding problem presented in the technical interview. */
export interface CodingProblem {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  topics: string[];
  functionName: string;
  starterCode?: Partial<Record<ProgrammingLanguage, string>>;
  testCases: TestCase[];
}
