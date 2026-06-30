/**
 * Supabase row types (single source of truth), aligned to the live schema
 * verified for Phase 2 (`docs/setup/supabase.md` §3). jsonb columns are typed to
 * their domain shapes.
 *
 * TODO(db): consider generating types from the Supabase schema once the data
 * model stabilises; until then these hand-written shapes are the contract.
 */

import type {
  CodeSubmission,
  QuestionType,
  VapiAnalysisResult,
  VapiInterviewConfig,
  TranscriptEntry,
} from "@/types/interview";

export interface ProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  /** Stripe customer id, set on first checkout. */
  stripe_customer_id: string | null;
  /** When the current time pass expires; null/past = no active pass. */
  access_expires_at: string | null;
  created_at: string;
}

/** Full `public.interviews` row as stored in Supabase. */
export interface InterviewRow {
  id: string;
  user_id: string;
  role: string;
  question_type: QuestionType;
  config: VapiInterviewConfig | null;
  result: VapiAnalysisResult | null;
  transcript: TranscriptEntry[] | null;
  /** Technical-interview code submissions; null for behavioral interviews. */
  submissions: CodeSubmission[] | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  question_count: number | null;
  success: boolean | null;
  error: string | null;
}

/** Columns selected for the history list (transcript omitted for payload size). */
export type InterviewListRow = Pick<
  InterviewRow,
  "id" | "created_at" | "role" | "question_type" | "config" | "result"
>;

/** Columns selected for a single replay (everything except the internal `user_id`). */
export type InterviewDetailRow = Omit<InterviewRow, "user_id">;

/**
 * Read models returned by `server/storage`. They preserve the legacy
 * `created_at → date` alias so UI code can read either.
 */
export type InterviewListItem = InterviewListRow & { date: string };
export type SavedInterview = InterviewDetailRow & { date: string };
