import { describe, expect, it } from "vitest";
import { resolveVerificationMode } from "@/lib/scenarios/verification-mode";
import type { Scenario } from "@/lib/scenarios/schema";

function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "scenario-under-test",
    title: "Scenario Under Test",
    summary: "Scenario used to validate verification mode routing behavior.",
    category: "test-category",
    skills: ["typescript"],
    jobRoles: ["backend"],
    difficulty: "medium",
    experienceMin: "entry",
    experienceMax: "senior",
    estimatedMinutes: 30,
    stack: { languages: ["typescript"], harness: "node-vm" },
    workspace: {
      files: [{ path: "app.ts", role: "edit" }],
      entry: "app.ts",
    },
    rubric: [{ criterion: "Correctness", weight: 100, detail: "Works." }],
    status: "draft",
    version: 1,
    steps: [
      {
        id: "step-1",
        kind: "implement",
        prompt: "Build it.",
        verification: "automated-tests",
        verify: { harness: "node-vm", functionName: "app", tests: ["tests/step-1.test.ts"] },
        weight: 100,
      },
    ],
    ...overrides,
  };
}

describe("resolveVerificationMode", () => {
  it("keeps backend scenarios on the existing single-file verification path", () => {
    expect(resolveVerificationMode(baseScenario({ type: "backend" }))).toBe("single-file");
  });

  it("defaults fullstack scenarios to step-level verification during the interview", () => {
    expect(
      resolveVerificationMode(
        baseScenario({
          type: "fullstack",
          frontend: { framework: "react", bundler: "vite" },
          backend: { framework: "express", database: "sqlite" },
          execution: { mode: "fullstack" },
          workspace: {
            files: [
              { path: "backend/src/app.ts", role: "edit" },
              { path: "frontend/src/App.tsx", role: "edit" },
            ],
            entry: "frontend/src/App.tsx",
          },
        }),
      ),
    ).toBe("scenario-step");
  });

  it("routes fullstack final submission through the final validation path", () => {
    expect(
      resolveVerificationMode(
        baseScenario({
          type: "fullstack",
          frontend: { framework: "react", bundler: "vite" },
          backend: { framework: "express", database: "sqlite" },
          execution: { mode: "fullstack" },
          workspace: {
            files: [
              { path: "backend/src/app.ts", role: "edit" },
              { path: "frontend/src/App.tsx", role: "edit" },
            ],
            entry: "frontend/src/App.tsx",
          },
        }),
        "final",
      ),
    ).toBe("scenario-final");
  });
});
