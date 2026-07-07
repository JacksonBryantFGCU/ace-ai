import { describe, expect, it } from "vitest";
import { createEvaluationEngine, defaultEvaluationEngine } from "@/lib/scenarios/evaluation/engine";
import type { Scorer } from "@/lib/scenarios/evaluation/types";
import type { InterviewResult, InterviewResultStep } from "@/lib/scenarios/interview-result";

function step(partial: Partial<InterviewResultStep> & { id: string }): InterviewResultStep {
  return {
    id: partial.id,
    kind: partial.kind ?? "implement",
    weight: partial.weight ?? 0,
    verification: partial.verification ?? "automated-tests",
    autoScorable: partial.autoScorable ?? true,
    status: partial.status ?? "not_started",
    revealedHints: partial.revealedHints ?? 0,
    hintCount: partial.hintCount ?? 0,
    response: partial.response ?? "",
    rubric: partial.rubric ?? [],
    checkpoint: partial.checkpoint ?? { available: false, offered: false, accepted: false, priorStatus: null },
    verificationResult: partial.verificationResult ?? null,
  };
}

const RESULT: InterviewResult = {
  scenarioSlug: "demo",
  scenarioId: "demo",
  title: "Demo",
  scenarioRubric: [],
  phase: "completed",
  steps: [
    step({ id: "a", weight: 25, status: "passed", autoScorable: true }),
    step({ id: "b", weight: 30, status: "failed", autoScorable: true, revealedHints: 2, hintCount: 3 }),
    step({ id: "c", weight: 25, status: "checkpoint_applied", autoScorable: true, checkpoint: { available: true, offered: true, accepted: true, priorStatus: "failed" } }),
    step({ id: "d", weight: 20, kind: "explain", verification: "rubric", autoScorable: false }),
  ],
  log: [],
  conversation: [],
  workspace: [],
  timings: { startedAt: null, completedAt: null, durationMs: null },
  generatedAt: 0,
};

describe("evaluation engine", () => {
  it("scores overall from passed auto-scorable weight", async () => {
    const report = await defaultEvaluationEngine.evaluate(RESULT);
    // Auto-scorable weight = 25 + 30 + 25 = 80; passed = 25 → 31%.
    expect(report.overallScore).toBe(31);
    expect(report.scorers).toContain("automated-tests");
  });

  it("produces a per-step breakdown with correct credit + notes", async () => {
    const report = await defaultEvaluationEngine.evaluate(RESULT);
    const byId = Object.fromEntries(report.stepBreakdown.map((s) => [s.stepId, s]));
    expect(byId.a!.earned).toBe(25);
    expect(byId.b!.earned).toBe(0);
    expect(byId.c!.note).toMatch(/Checkpoint applied/);
    expect(byId.d!.autoScored).toBe(false);
  });

  it("flags rubric-only steps as pending", async () => {
    const report = await defaultEvaluationEngine.evaluate(RESULT);
    expect(report.pending.some((p) => p.includes('"d"'))).toBe(true);
  });

  it("surfaces hint and checkpoint usage as improvements", async () => {
    const report = await defaultEvaluationEngine.evaluate(RESULT);
    expect(report.improvements.join(" ")).toMatch(/hint/i);
    expect(report.improvements.join(" ")).toMatch(/checkpoint/i);
  });

  it("is extensible: a new weighted scorer changes overall with no engine change", async () => {
    const rubricScorer: Scorer = {
      id: "rubric",
      label: "Rubric",
      score: () => ({ dimensions: [{ id: "rubric", label: "Rubric", score: 100, max: 100, weight: 1 }] }),
    };
    const engine = createEvaluationEngine([...[], rubricScorer]);
    const report = await engine.evaluate(RESULT);
    // Only the rubric dimension carries weight here → overall 100.
    expect(report.overallScore).toBe(100);
    expect(report.scorers).toEqual(["rubric"]);
  });
});
