import "server-only";

import { cache } from "react";
import { createClient } from "@/server/db/server-client";
import { createAdminClient } from "@/server/db/admin";
import type {
  InterviewDetailRow,
  InterviewListItem,
  InterviewListRow,
  SavedInterview,
} from "@/types/db";
import type {
  QuestionType,
  TranscriptEntry,
  VapiAnalysisResult,
  VapiInterviewConfig,
} from "@/types/interview";

/** Optional history filters (Phase 6). Omitted/empty fields are no-ops. */
export interface InterviewFilters {
  questionType?: QuestionType;
  role?: string;
}

/**
 * Server-side interview read layer. All access goes through the request-scoped
 * Supabase server client, which reads under the user's session and RLS — no
 * service-role client, no caching (Phase 2 keeps reads dynamic; tag-based
 * caching arrives with its invalidators in a later phase).
 *
 * Queries are also explicitly scoped by `user_id` as defence-in-depth on top of
 * RLS. Functions are wrapped in React `cache()` for per-request memoization
 * (e.g. `generateMetadata` + the page share one query) — this is request
 * memoization, not the Next data cache.
 */

/** List view omits `transcript` to keep the payload small (see docs/13 §4). */
const LIST_COLUMNS = "id, created_at, role, question_type, config, result";

/** Detail view selects everything except the internal `user_id`. */
const DETAIL_COLUMNS =
  "id, created_at, role, question_type, config, result, transcript, started_at, completed_at, duration_ms, question_count, success, error";

function toListItem(row: InterviewListRow): InterviewListItem {
  return { ...row, date: row.created_at };
}

function toSavedInterview(row: InterviewDetailRow): SavedInterview {
  return { ...row, date: row.created_at };
}

/** Metrics columns written alongside an interview (ported from `storageService`). */
export interface InterviewMetrics {
  startedAt?: number | string;
  completedAt?: number | string;
  durationMs?: number;
  questionCount?: number;
  success?: boolean;
  error?: string;
}

/** Strip paths/long stacks so the dashboard never surfaces raw internals. */
function sanitizeError(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message.split("\n")[0]!.slice(0, 300);
}

/**
 * Persist a completed interview. Uses the **admin client** (bypasses RLS), so
 * the caller must have authenticated the user first and pass their `userId`.
 */
export async function saveInterview(
  userId: string,
  config: VapiInterviewConfig,
  result: VapiAnalysisResult,
  transcript: TranscriptEntry[] = [],
  metrics: InterviewMetrics = {},
): Promise<{ id: string }> {
  const row: Record<string, unknown> = {
    user_id: userId,
    role: config.role,
    question_type: config.questionType,
    config,
    result,
    transcript,
  };

  if (metrics.startedAt !== undefined) row.started_at = new Date(metrics.startedAt).toISOString();
  if (metrics.completedAt !== undefined) {
    row.completed_at = new Date(metrics.completedAt).toISOString();
  }
  if (typeof metrics.durationMs === "number") row.duration_ms = metrics.durationMs;
  if (typeof metrics.questionCount === "number") row.question_count = metrics.questionCount;
  if (typeof metrics.success === "boolean") row.success = metrics.success;
  const safeError = sanitizeError(metrics.error);
  if (safeError) row.error = safeError;

  const admin = createAdminClient();
  const { data, error } = await admin.from("interviews").insert(row).select("id").single();

  if (error || !data) {
    console.error("saveInterview failed:", error?.message);
    throw new Error("Failed to save interview");
  }

  return { id: (data as { id: string }).id };
}

/**
 * All of a user's interviews, newest first. Optional `filters` narrow by
 * question type and/or role in-query; omitted means "all" (unchanged behaviour).
 */
export const getInterviews = cache(
  async (userId: string, filters: InterviewFilters = {}): Promise<InterviewListItem[]> => {
    const supabase = await createClient();
    let query = supabase.from("interviews").select(LIST_COLUMNS).eq("user_id", userId);

    if (filters.questionType) query = query.eq("question_type", filters.questionType);
    if (filters.role) query = query.eq("role", filters.role);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("getInterviews failed:", error.message);
      throw new Error("Failed to load interviews");
    }

    // The untyped Supabase client returns a loose row shape; cast at this boundary.
    const rows = (data ?? []) as unknown as InterviewListRow[];
    return rows.map(toListItem);
  },
);

/**
 * A single owner-scoped interview, or `null` when it doesn't exist or isn't the
 * user's (PGRST116 = no rows). Callers turn `null` into `notFound()`.
 */
export const getInterviewById = cache(
  async (userId: string, id: string): Promise<SavedInterview | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("interviews")
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      // Expected miss: no row (bad/foreign id) → null → notFound() in the page.
      if (error.code === "PGRST116") return null;
      console.error("getInterviewById failed:", error.message);
      throw new Error("Failed to load interview");
    }

    return toSavedInterview(data as unknown as InterviewDetailRow);
  },
);
