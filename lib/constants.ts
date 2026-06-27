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

export const EXPERIENCE_LEVELS: readonly ExperienceLevel[] = ["junior", "mid", "senior"];

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

/** Engineering roles allowed for setup config and profile role (ported allow-list). */
export const VALID_ROLES = [
  "frontend",
  "backend",
  "fullstack",
  "ml",
  "mobile",
  "devops",
  "security",
  "systems",
] as const;

export type EngineerRole = (typeof VALID_ROLES)[number];

/**
 * Voice provider config for an interviewer (ported verbatim from the legacy
 * `useVapiInterview` roster). Voice ids are not secrets.
 */
export type InterviewerVoice =
  | { provider: "11labs"; voiceId: string }
  | { provider: "vapi"; voiceId: string };

export interface Interviewer {
  /** Stable lowercase id stored in the interview config. */
  id: string;
  name: string;
  voice: InterviewerVoice;
  /** Prepended to the system prompt — shapes the assistant's persona. */
  personality: string;
  /** Tailwind gradient for the avatar (presentational). */
  gradient: string;
}

/** Interviewer roster — ported from the legacy frontend. */
export const INTERVIEWERS: readonly Interviewer[] = [
  {
    id: "cassidy",
    name: "Cassidy",
    voice: { provider: "11labs", voiceId: "21m00Tcm4TlvDq8ikWAM" },
    personality: `Your name is Cassidy. You are warm and encouraging, but sharp — you do not let weak or vague answers slide. You build rapport quickly and make candidates feel comfortable, then challenge them to go deeper once they are at ease. Your tone is conversational and supportive, but your follow-up questions are pointed.`,
    gradient: "from-purple-400 to-pink-400",
  },
  {
    id: "alex",
    name: "Alex",
    voice: { provider: "vapi", voiceId: "Rohan" },
    personality: `Your name is Alex. You are direct, precise, and highly technical. You value structured thinking and concise answers. You have no patience for hand-waving. If an answer is incomplete, you say so plainly and ask again. Your tone is professional and neutral — not cold, but strictly focused.`,
    gradient: "from-blue-400 to-cyan-400",
  },
  {
    id: "jordan",
    name: "Jordan",
    voice: { provider: "11labs", voiceId: "EXAVITQu4vr4xnSDxMaL" },
    personality: `Your name is Jordan. You are calm, methodical, and curious. You probe the candidate's reasoning rather than testing memorized facts. You ask things like "walk me through how you got there" and "what would you change if the requirements shifted?" You care about thought process above all.`,
    gradient: "from-green-400 to-emerald-400",
  },
];

export const DEFAULT_INTERVIEWER_ID = "cassidy";

/** Resolve an interviewer by id, falling back to the default. */
export function getInterviewer(id: string | undefined): Interviewer {
  return INTERVIEWERS.find((i) => i.id === id?.toLowerCase()) ?? INTERVIEWERS[0]!;
}
