import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/server/db/admin";
import {
  buildScoreTrend,
  computeFeedbackThemes,
  computeRecentActivity,
  computeUserMetrics,
  countByType,
} from "@/lib/analytics";
import type { AnalyticsData, AnalyticsRow } from "@/types/analytics";

/**
 * Cached analytics aggregate for the dashboard + analytics surfaces.
 *
 * Read via the **admin client**, not the request-scoped RLS client: the work
 * runs inside `unstable_cache`, whose callback executes outside request scope
 * and cannot read cookies. We follow the existing `saveInterview` pattern —
 * the page authenticates with `requireUser()`, then passes the `userId` here,
 * and every query is explicitly scoped by `user_id`. The result is tagged
 * `dashboard:${userId}`, the tag `evaluateInterview` already revalidates, so a
 * new interview busts this cache.
 */

/** No transcript/config — analytics only needs scores, timings, and outcomes. */
const ANALYTICS_COLUMNS = "created_at, success, duration_ms, question_type, role, result";

/** Short TTL backstop; tag revalidation is the primary freshness mechanism. */
const ANALYTICS_TTL = 300;

async function fetchAnalyticsRows(userId: string): Promise<AnalyticsRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("interviews")
    .select(ANALYTICS_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchAnalyticsRows failed:", error.message);
    throw new Error("Failed to load analytics");
  }

  // The untyped Supabase client returns a loose row shape; cast at this boundary.
  return (data ?? []) as unknown as AnalyticsRow[];
}

/** Build the full analytics payload for a user (cached + tagged per user). */
export function getAnalytics(userId: string): Promise<AnalyticsData> {
  const run = unstable_cache(
    async (): Promise<AnalyticsData> => {
      const rows = await fetchAnalyticsRows(userId);
      return {
        metrics: computeUserMetrics(rows),
        recentActivity: computeRecentActivity(rows, 30),
        scoreTrend: buildScoreTrend(rows),
        strengths: computeFeedbackThemes(rows, "strengths", 5),
        improvements: computeFeedbackThemes(rows, "improvements", 5),
        byType: countByType(rows),
      };
    },
    ["analytics", userId],
    { revalidate: ANALYTICS_TTL, tags: [`dashboard:${userId}`] },
  );
  return run();
}
