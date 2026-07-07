import { describe, expect, it } from "vitest";
import { scenarioSchema, type Scenario } from "@/lib/scenarios/schema";
import { computeScenarioStats } from "@/lib/scenarios/authoring/stats";

// A schema-valid scenario with a mix of executable and discussion steps.
function scenario(): Scenario {
  return scenarioSchema.parse({
    id: "stats-sample",
    title: "Stats Sample",
    summary: "A sample scenario used purely by the statistics tests.",
    category: "frontend-react",
    skills: ["state"],
    jobRoles: ["frontend"],
    difficulty: "medium",
    experienceMin: "entry",
    experienceMax: "senior",
    estimatedMinutes: 40,
    stack: { languages: ["typescript"], harness: "component" },
    workspace: {
      files: [
        { path: "Widget.tsx", role: "edit" },
        { path: "helpers.ts", role: "readonly" },
      ],
      entry: "Widget.tsx",
    },
    rubric: [{ criterion: "Correctness", weight: 100, detail: "Works as specified." }],
    status: "review",
    version: 1,
    steps: [
      {
        id: "build",
        kind: "implement",
        prompt: "Build the widget.",
        verification: "automated-tests",
        verify: { harness: "component", functionName: "Widget", tests: ["tests/build.test.tsx"] },
        weight: 40,
        checkpoint: { files: ["solution/build/Widget.tsx"] },
        hints: ["Start with state.", "Render the label."],
      },
      {
        id: "fix-race",
        kind: "debug",
        prompt: "Fix the race.",
        verification: "automated-tests",
        verify: { harness: "component", functionName: "Widget", tests: ["tests/race.test.tsx"] },
        weight: 40,
        hints: ["Cancel stale requests."],
      },
      {
        id: "discuss",
        kind: "explain",
        prompt: "Explain the tradeoffs.",
        verification: "rubric",
        verify: { harness: "none" },
        rubric: [{ criterion: "Clarity", weight: 100, detail: "Explains clearly." }],
        weight: 20,
      },
    ],
  });
}

describe("computeScenarioStats", () => {
  it("summarizes steps, hints, checkpoints, files, and tests", () => {
    const stats = computeScenarioStats(scenario());
    expect(stats).toEqual({
      totalSteps: 3,
      verificationSteps: 2,
      discussionSteps: 1,
      hints: 3,
      checkpointSteps: 1,
      files: 2,
      tests: 2,
      estimatedMinutes: 40,
    });
  });

  it("counts each distinct test file once", () => {
    const s = scenario();
    // Two steps sharing one test file → one distinct test.
    s.steps[1]!.verify.tests = ["tests/build.test.tsx"];
    const stats = computeScenarioStats(s);
    expect(stats.tests).toBe(1);
  });
});
