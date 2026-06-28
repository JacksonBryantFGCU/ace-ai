import { describe, expect, it } from "vitest";
import {
  buildScoreTrend,
  computeFeedbackThemes,
  computeRecentActivity,
  computeUserMetrics,
  countByType,
  groupInterviewsByRecency,
} from "@/lib/analytics";
import type { AnalyticsRow } from "@/types/analytics";
import type { InterviewListItem } from "@/types/db";
import type { VapiAnalysisResult } from "@/types/interview";

function result(partial: Partial<VapiAnalysisResult>): VapiAnalysisResult {
  return {
    score: 0,
    communication: 0,
    technicalAccuracy: 0,
    problemSolving: 0,
    strengths: [],
    improvements: [],
    nextSteps: [],
    questionBreakdown: [],
    ...partial,
  };
}

function row(partial: Partial<AnalyticsRow>): AnalyticsRow {
  return {
    created_at: "2026-06-01T12:00:00.000Z",
    success: null,
    duration_ms: null,
    question_type: "behavioral",
    role: "frontend",
    result: null,
    ...partial,
  };
}

describe("computeUserMetrics", () => {
  it("returns zeros for no rows", () => {
    expect(computeUserMetrics([])).toEqual({
      totalInterviews: 0,
      successRate: 0,
      errorRate: 0,
      averageDurationMs: 0,
      averageScore: 0,
    });
  });

  it("averages scores and durations, ignoring missing values", () => {
    const rows = [
      row({ duration_ms: 1000, result: result({ score: 80 }) }),
      row({ duration_ms: 3000, result: result({ score: 60 }) }),
      row({ duration_ms: null, result: null }), // contributes to total only
    ];
    const m = computeUserMetrics(rows);
    expect(m.totalInterviews).toBe(3);
    expect(m.averageScore).toBe(70); // (80 + 60) / 2
    expect(m.averageDurationMs).toBe(2000); // (1000 + 3000) / 2
  });

  it("computes success/error rate only over rated (non-null) rows", () => {
    const rows = [row({ success: true }), row({ success: false }), row({ success: null })];
    const m = computeUserMetrics(rows);
    expect(m.successRate).toBe(50); // 1 of 2 rated
    expect(m.errorRate).toBe(50);
  });
});

describe("computeRecentActivity", () => {
  it("zero-fills the window and counts rows in-window", () => {
    const now = new Date("2026-06-28T00:00:00.000Z");
    const rows = [
      row({ created_at: "2026-06-28T09:00:00.000Z" }),
      row({ created_at: "2026-06-28T18:00:00.000Z" }),
      row({ created_at: "2026-06-27T10:00:00.000Z" }),
      row({ created_at: "2026-01-01T10:00:00.000Z" }), // outside window → ignored
    ];
    const points = computeRecentActivity(rows, 30, now);
    expect(points).toHaveLength(30);
    expect(points.at(-1)).toEqual({ date: "2026-06-28", count: 2 });
    expect(points.at(-2)).toEqual({ date: "2026-06-27", count: 1 });
  });
});

describe("buildScoreTrend", () => {
  it("keeps only scored rows and sorts oldest first", () => {
    const rows = [
      row({ created_at: "2026-06-03T00:00:00.000Z", result: result({ score: 90 }) }),
      row({ created_at: "2026-06-01T00:00:00.000Z", result: result({ score: 70 }) }),
      row({ created_at: "2026-06-02T00:00:00.000Z", result: null }), // dropped
    ];
    expect(buildScoreTrend(rows)).toEqual([
      { date: "2026-06-01T00:00:00.000Z", score: 70 },
      { date: "2026-06-03T00:00:00.000Z", score: 90 },
    ]);
  });
});

describe("computeFeedbackThemes", () => {
  it("ranks by frequency then alphabetically and caps at the limit", () => {
    const rows = [
      row({ result: result({ strengths: ["Clear communication", "Good structure"] }) }),
      row({ result: result({ strengths: ["Clear communication"] }) }),
      row({ result: result({ strengths: ["Strong examples", "  "] }) }), // blank dropped
    ];
    expect(computeFeedbackThemes(rows, "strengths", 2)).toEqual([
      { label: "Clear communication", count: 2 },
      { label: "Good structure", count: 1 },
    ]);
  });
});

describe("countByType", () => {
  it("splits behavioral vs technical", () => {
    const rows = [
      row({ question_type: "technical" }),
      row({ question_type: "behavioral" }),
      row({ question_type: "behavioral" }),
    ];
    expect(countByType(rows)).toEqual({ behavioral: 2, technical: 1 });
  });
});

describe("groupInterviewsByRecency", () => {
  function item(date: string): InterviewListItem {
    return {
      id: date,
      created_at: date,
      date,
      role: "frontend",
      question_type: "behavioral",
      config: null,
      result: null,
    };
  }

  it("buckets by recency and drops empty groups", () => {
    const now = new Date("2026-06-28T12:00:00.000Z");
    const groups = groupInterviewsByRecency(
      [
        item("2026-06-28T08:00:00.000Z"), // today
        item("2026-06-25T08:00:00.000Z"), // this week
        item("2026-06-10T08:00:00.000Z"), // this month
        item("2026-01-01T08:00:00.000Z"), // older
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "This Week", "This Month", "Older"]);
    expect(groups.every((g) => g.items.length === 1)).toBe(true);
  });
});
