/**
 * Analytics read models for the dashboard + analytics surfaces (Phase 6).
 * `AnalyticsRow` is the minimal column subset read from `public.interviews`;
 * the derived shapes are produced by the pure compute layer in `lib/analytics`.
 */

import type { QuestionType, VapiAnalysisResult } from "@/types/interview";

/** Minimal interview row the analytics aggregate reads (no transcript/config). */
export interface AnalyticsRow {
  created_at: string;
  success: boolean | null;
  duration_ms: number | null;
  question_type: QuestionType;
  role: string;
  result: VapiAnalysisResult | null;
}

/** Headline counters for the stat cards. */
export interface UserMetrics {
  totalInterviews: number;
  /** 0–100 percentage of rows with an explicit `success === true`. */
  successRate: number;
  /** 0–100 percentage; complement of `successRate` over rated rows. */
  errorRate: number;
  averageDurationMs: number;
  /** Mean overall score (0–100) across rows that have a numeric score. */
  averageScore: number;
}

/** One day in the 30-day activity window. */
export interface RecentActivityPoint {
  /** `YYYY-MM-DD` (UTC). */
  date: string;
  count: number;
}

/** One point on the score-over-time line, oldest first. */
export interface ScoreTrendPoint {
  /** ISO timestamp of the interview. */
  date: string;
  score: number;
}

/** A recurring strength/improvement theme with its frequency. */
export interface FeedbackTheme {
  label: string;
  count: number;
}

/** Interview counts split by question type. */
export interface TypeBreakdown {
  behavioral: number;
  technical: number;
}

/** The full aggregate both `/dashboard` and `/analytics` consume. */
export interface AnalyticsData {
  metrics: UserMetrics;
  recentActivity: RecentActivityPoint[];
  scoreTrend: ScoreTrendPoint[];
  strengths: FeedbackTheme[];
  improvements: FeedbackTheme[];
  byType: TypeBreakdown;
}
