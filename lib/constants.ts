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

export const EXPERIENCE_LEVELS: readonly ExperienceLevel[] = ["intern", "entry", "junior", "senior"];

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

/** Display metadata for the role-selection step (ported from legacy RoleSelection). */
export interface RoleMeta {
  id: EngineerRole;
  label: string;
  description: string;
}

export const ROLE_META: readonly RoleMeta[] = [
  {
    id: "frontend",
    label: "Frontend Engineer",
    description: "Build beautiful, responsive user interfaces with React, Vue, or Angular",
  },
  {
    id: "backend",
    label: "Backend Engineer",
    description: "Design scalable server architectures and APIs with Node.js, Python, or Java",
  },
  {
    id: "fullstack",
    label: "Full-Stack Engineer",
    description: "Master both frontend and backend development across the entire stack",
  },
  {
    id: "ml",
    label: "Machine Learning Engineer",
    description: "Build intelligent systems with deep learning, NLP, and computer vision",
  },
  {
    id: "mobile",
    label: "Mobile Developer",
    description: "Create native iOS and Android apps or cross-platform solutions",
  },
  {
    id: "devops",
    label: "DevOps Engineer",
    description: "Streamline deployment pipelines, CI/CD, and cloud infrastructure",
  },
  {
    id: "security",
    label: "Cybersecurity Engineer",
    description: "Protect systems from threats with penetration testing and security protocols",
  },
  {
    id: "systems",
    label: "Systems Engineer",
    description: "Optimize low-level performance with C++, Rust, and distributed systems",
  },
];

/** Lookup map for role labels, keyed by role id. */
export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_META.map((r) => [r.id, r.label]),
);

/** Narrow an arbitrary string to a known role, or undefined if not in the allow-list. */
export function asRole(value: string | undefined): EngineerRole | undefined {
  return VALID_ROLES.find((r) => r === value);
}

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
