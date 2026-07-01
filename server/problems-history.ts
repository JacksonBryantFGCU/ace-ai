import "server-only";

import { createAdminClient } from "@/server/db/admin";
import type { CodeSubmission } from "@/types/interview";

/**
 * Titles of coding problems a user has already been served, derived from their
 * past technical interviews' `submissions` (each carries `problemTitle`). Used to
 * avoid repeating problems — both when sampling the local bank and as an
 * "avoid these" list for AI generation.
 *
 * Read via the admin client scoped by `user_id` (like `getAnalytics` /
 * `canStartInterview`), since it may run outside request/RLS scope. Best-effort:
 * on any error it returns an empty set so interview setup never hard-fails.
 */
export async function getSeenProblemTitles(userId: string): Promise<Set<string>> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("interviews")
      .select("submissions")
      .eq("user_id", userId)
      .eq("question_type", "technical")
      .not("submissions", "is", null);

    if (error) {
      console.error("getSeenProblemTitles: query failed:", error.message);
      return new Set();
    }

    const titles = new Set<string>();
    for (const row of data ?? []) {
      const submissions = (row.submissions as CodeSubmission[] | null) ?? [];
      for (const s of submissions) {
        if (s.problemTitle) titles.add(s.problemTitle);
      }
    }
    return titles;
  } catch (err) {
    console.error("getSeenProblemTitles: unexpected error:", err);
    return new Set();
  }
}
