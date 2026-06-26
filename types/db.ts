/**
 * Supabase row types (single source of truth).
 *
 * TODO(db): generate/replace with real types from the Supabase schema during the
 * database/auth phase. Stubs below mirror the `profiles` and `interviews` tables
 * described in the rebuild plan (docs/nextjs-rebuild-plan/13-database.md).
 */

import type { QuestionType, VapiAnalysisResult, TranscriptEntry } from "@/types/interview";

export interface ProfileRow {
  id: string;
  email: string | null;
  role: string | null;
  created_at: string;
}

export interface InterviewRow {
  id: string;
  user_id: string;
  role: string;
  question_type: QuestionType;
  result: VapiAnalysisResult;
  transcript: TranscriptEntry[];
  created_at: string;
  /** Convenience mapping of `created_at` → `date`, per current convention. */
  date?: string;
}
