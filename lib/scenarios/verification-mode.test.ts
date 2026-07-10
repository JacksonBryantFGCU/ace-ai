import { describe, expect, it } from "vitest";
import { getPreviewPanelKind, resolveVerificationMode } from "@/lib/scenarios/verification-mode";
import type { Scenario } from "@/lib/scenarios/schema";
import type { VerificationMode } from "@/lib/scenarios/verification";

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

  it("defaults machine-learning scenarios to python-step verification during the interview", () => {
    expect(
      resolveVerificationMode(
        baseScenario({
          type: "machine-learning",
          runtime: "python",
          execution: { mode: "python-ml" },
          workspace: {
            files: [{ path: "main.py", role: "edit" }],
            entry: "main.py",
          },
        }),
      ),
    ).toBe("python-step");
  });

  it("routes machine-learning final submission through python-final", () => {
    expect(
      resolveVerificationMode(
        baseScenario({
          type: "machine-learning",
          runtime: "python",
          execution: { mode: "python-ml" },
          workspace: {
            files: [{ path: "main.py", role: "edit" }],
            entry: "main.py",
          },
        }),
        "final",
      ),
    ).toBe("python-final");
  });
});

describe("getPreviewPanelKind", () => {
  it("routes machine-learning verification modes to the ML notebook preview panel", () => {
    expect(getPreviewPanelKind("python-step")).toBe("ml");
    expect(getPreviewPanelKind("python-final")).toBe("ml");
  });

  it("routes every other verification mode to the standard preview panel (backend/fullstack/frontend unaffected)", () => {
    const otherModes: VerificationMode[] = ["single-file", "scenario-step", "scenario-final"];
    for (const mode of otherModes) {
      expect(getPreviewPanelKind(mode)).toBe("standard");
    }
  });
});
