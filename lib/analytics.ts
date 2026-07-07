/**
 * Pure analytics compute — no `server-only`, no DB, no React. Ported from the
 * legacy `analyticsService` (compute half) and extended with the score trend,
 * feedback themes, type breakdown, and history grouping the Phase 6 surfaces need.
 *
 * Kept free of IO so it is unit-testable in the `node` Vitest env. The cached
 * fetch that feeds these functions lives in `server/analytics.ts`.
 */

import type { InterviewListItem } from "@/types/db";
import type {
  AnalyticsRow,
  FeedbackTheme,
  RecentActivityPoint,
  ScoreTrendPoint,
  TypeBreakdown,
  UserMetrics,
} from "@/types/analytics";

function toIsoDate(ts: string | Date): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toISOString().slice(0, 10);
}

/**
 * Minimum overall score (0–100) that counts as a "pass." Matches the green
 * threshold `scoreTone` already uses elsewhere, so "passing" here is the same
 * bar already shown as a good score throughout the app.
 */
export const PASSING_SCORE = 80;

/** Headline counters. A row "passes" if it scored >= `PASSING_SCORE`; an explicit `success: false` (a failed/errored run) never counts as a pass regardless of score. */
export function computeUserMetrics(rows: AnalyticsRow[]): UserMetrics {
  const total = rows.length;
  if (total === 0) {
    return { totalInterviews: 0, successRate: 0, errorRate: 0, averageDurationMs: 0, averageScore: 0 };
  }

  let passCount = 0;
  let ratedCount = 0; // rows with a determinable pass/fail outcome
  let durationSum = 0;
  let durationCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const row of rows) {
    const score = row.result?.score;
    // No score and not an explicit failure → unknown outcome, excluded from the rate.
    if (row.success === false) {
      ratedCount += 1;
    } else if (typeof score === "number") {
      ratedCount += 1;
      if (score >= PASSING_SCORE) passCount += 1;
    }
    if (typeof row.duration_ms === "number") {
      durationSum += row.duration_ms;
      durationCount += 1;
    }
    if (typeof score === "number") {
      scoreSum += score;
      scoreCount += 1;
    }
  }

  const successRate = ratedCount > 0 ? Math.round((passCount / ratedCount) * 10000) / 100 : 0;
  return {
    totalInterviews: total,
    successRate,
    errorRate: ratedCount > 0 ? Math.round((100 - successRate) * 100) / 100 : 0,
    averageDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    averageScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
  };
}

/**
 * Count buckets for each of the last `days` days, zero-filled so a chart has a
 * continuous x-axis even on days with no activity. Ported from the legacy bank.
 */
export function computeRecentActivity(
  rows: AnalyticsRow[],
  days: number,
  now: Date = new Date(),
): RecentActivityPoint[] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(toIsoDate(d), 0);
  }

  for (const row of rows) {
    const key = toIsoDate(row.created_at);
    if (buckets.has(key)) {
      buckets.set(key, buckets.get(key)! + 1);
    }
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

/** Score-over-time points (oldest first) for rows that have a numeric score. */
export function buildScoreTrend(rows: AnalyticsRow[]): ScoreTrendPoint[] {
  return rows
    .filter((r) => typeof r.result?.score === "number")
    .map((r) => ({ date: r.created_at, score: r.result!.score }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Most frequent strengths/improvements across all evaluations, descending by
 * count then alphabetically (stable), capped at `limit`.
 */
export function computeFeedbackThemes(
  rows: AnalyticsRow[],
  key: "strengths" | "improvements",
  limit = 5,
): FeedbackTheme[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const raw of row.result?.[key] ?? []) {
      const label = raw.trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/** Interview counts split by question type. */
export function countByType(rows: AnalyticsRow[]): TypeBreakdown {
  const breakdown: TypeBreakdown = { behavioral: 0, technical: 0 };
  for (const row of rows) {
    if (row.question_type === "technical") breakdown.technical += 1;
    else breakdown.behavioral += 1;
  }
  return breakdown;
}

const MS_PER_DAY = 86_400_000;

/** A recency bucket of history items, in display order. */
export interface RecencyGroup {
  label: string;
  items: InterviewListItem[];
}

/**
 * Bucket already-sorted (newest-first) history items into Today / This Week /
 * This Month / Older. Empty groups are dropped. `now` is injectable for tests.
 */
export function groupInterviewsByRecency(
  items: InterviewListItem[],
  now: Date = new Date(),
): RecencyGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const today: InterviewListItem[] = [];
  const week: InterviewListItem[] = [];
  const month: InterviewListItem[] = [];
  const older: InterviewListItem[] = [];

  for (const item of items) {
    const t = new Date(item.date).getTime();
    const ageFromTodayStart = startOfToday - t;
    if (t >= startOfToday) today.push(item);
    else if (ageFromTodayStart < 7 * MS_PER_DAY) week.push(item);
    else if (ageFromTodayStart < 30 * MS_PER_DAY) month.push(item);
    else older.push(item);
  }

  return [
    { label: "Today", items: today },
    { label: "This Week", items: week },
    { label: "This Month", items: month },
    { label: "Older", items: older },
  ].filter((g) => g.items.length > 0);
}
