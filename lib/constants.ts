/**
 * Shared, secret-free constants importable from both server and client code
 * (e.g. the Vapi voice island needs the interviewer roster inline).
 *
 * TODO(port): replace placeholder roster/topics with the real data when porting
 * setup + voice (Phases 2/4). Option unions live in `types/interview.ts`.
 */

import type {
  Difficulty,
  ExperienceLevel,
  ProgrammingLanguage,
  QuestionType,
  Strictness,
} from "@/types/interview";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

export const EXPERIENCE_LEVELS: readonly ExperienceLevel[] = ["junior", "mid", "senior", "staff"];

export const STRICTNESS_LEVELS: readonly Strictness[] = ["lenient", "balanced", "strict"];

export const QUESTION_TYPES: readonly QuestionType[] = ["behavioral", "technical"];

export const PROGRAMMING_LANGUAGES: readonly ProgrammingLanguage[] = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "bash",
];

/** Interviewer personas. Placeholder — port the real roster (name/voice/personality). */
export interface Interviewer {
  id: string;
  name: string;
  description: string;
}

export const INTERVIEWERS: readonly Interviewer[] = [];
