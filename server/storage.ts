import "server-only";

import { cache } from "react";
import { createClient } from "@/server/db/server-client";
import type {
  InterviewDetailRow,
  InterviewListItem,
  InterviewListRow,
  SavedInterview,
} from "@/types/db";

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

/** All of a user's interviews, newest first. */
export const getInterviews = cache(async (userId: string): Promise<InterviewListItem[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .select(LIST_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getInterviews failed:", error.message);
    throw new Error("Failed to load interviews");
  }

  // The untyped Supabase client returns a loose row shape; cast at this boundary.
  const rows = (data ?? []) as unknown as InterviewListRow[];
  return rows.map(toListItem);
});

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
