import type { Scenario, ScenarioStep } from "@/lib/scenarios/schema";

/**
 * Scenario statistics — a pure, scenario-agnostic summary of a scenario's shape.
 * Drives the Authoring Studio's Statistics panel and the Dashboard's at-a-glance
 * counts. Computed from the authored definition (plus the optional on-disk file
 * map for a real test-file count), never from runtime state, so it is stable and
 * unit-testable with plain data.
 */

export interface ScenarioStats {
  /** Every step in the scenario. */
  totalSteps: number;
  /** Steps that run an executable harness (implement/debug/refactor). */
  verificationSteps: number;
  /** Discussion-only steps (kind `explain`, rubric-graded, no harness). */
  discussionSteps: number;
  /** Total progressive hints authored across all steps. */
  hints: number;
  /** Steps that offer a recovery checkpoint. */
  checkpointSteps: number;
  /** Workspace files the candidate starts with. */
  files: number;
  /** Distinct test files declared across all verification steps. */
  tests: number;
  /** Authored estimate, in minutes. */
  estimatedMinutes: number;
}

const isDiscussion = (step: ScenarioStep) => step.kind === "explain";

/** Distinct test files declared across every step's `verify.tests`. */
function countTests(steps: readonly ScenarioStep[]): number {
  const tests = new Set<string>();
  for (const step of steps) {
    for (const test of step.verify.tests ?? []) tests.add(test);
  }
  return tests.size;
}

/**
 * Summarize a scenario. `files` is the optional scenario-relative file map (from
 * the authored bundle); when present the workspace count is cross-checked against
 * the declared manifest, but the manifest is authoritative for `files`.
 */
export function computeScenarioStats(scenario: Scenario): ScenarioStats {
  const steps = scenario.steps;
  return {
    totalSteps: steps.length,
    verificationSteps: steps.filter((s) => !isDiscussion(s)).length,
    discussionSteps: steps.filter(isDiscussion).length,
    hints: steps.reduce((total, s) => total + (s.hints?.length ?? 0), 0),
    checkpointSteps: steps.filter((s) => s.checkpoint).length,
    files: scenario.workspace.files.length,
    tests: countTests(steps),
    estimatedMinutes: scenario.estimatedMinutes,
  };
}
