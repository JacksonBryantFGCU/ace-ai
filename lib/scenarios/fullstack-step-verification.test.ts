import { describe, expect, it, vi } from "vitest";
import {
  selectStepScopedTestFiles,
  verifyFullstackScenarioStep,
  type FullstackStepVerificationDependencies,
} from "@/lib/scenarios/fullstack-step-verification";
import type { FullstackAuthoredTestFile } from "@/lib/scenarios/fullstack-test-runner";
import type { FullstackRuntimeHandle } from "@/lib/scenarios/fullstack-runtime";
import type { CheckpointFile, LoadedScenario, ServedWorkspaceFile } from "@/lib/scenarios/types";

function loaded(): LoadedScenario {
  return {
    slug: "customer-feedback-dashboard",
    category: "fullstack-react-node",
    scenario: {
      id: "customer-feedback-dashboard",
      title: "Customer Feedback Dashboard",
      summary: "Internal fullstack fixture used for verification tests.",
      category: "fullstack-react-node",
      skills: ["react", "express"],
      jobRoles: ["fullstack"],
      difficulty: "medium",
      experienceMin: "entry",
      experienceMax: "senior",
      estimatedMinutes: 40,
      stack: { languages: ["typescript"], harness: "component" },
      workspace: {
        files: [
          { path: "backend/src/app.ts", role: "edit" },
          { path: "frontend/src/App.tsx", role: "edit" },
        ],
        entry: "frontend/src/App.tsx",
      },
      rubric: [{ criterion: "Correctness", weight: 100, detail: "Works." }],
      status: "draft",
      version: 1,
      type: "fullstack",
      frontend: { framework: "react", bundler: "vite" },
      backend: { framework: "express", database: "sqlite" },
      execution: { mode: "fullstack" },
      steps: [
        { id: "step-1", kind: "implement", prompt: "Step 1", verification: "hybrid", verify: { harness: "none" }, weight: 34 },
        { id: "step-2", kind: "implement", prompt: "Step 2", verification: "hybrid", verify: { harness: "none" }, weight: 33 },
        { id: "step-3", kind: "implement", prompt: "Step 3", verification: "hybrid", verify: { harness: "none" }, weight: 33 },
      ],
    },
    sections: {},
    files: [
      { path: "backend/src/app.ts", role: "edit", content: "starter-backend" },
      { path: "frontend/src/App.tsx", role: "edit", content: "starter-frontend" },
    ],
    entry: "frontend/src/App.tsx",
  } as LoadedScenario;
}

const tests: FullstackAuthoredTestFile[] = [
  { path: "tests/backend/step-1.test.ts", content: "test('step1 backend', () => {})" },
  { path: "tests/backend/step-2.test.ts", content: "test('step2 backend', () => {})" },
  { path: "tests/backend/step-3.test.ts", content: "test('step3 backend', () => {})" },
  { path: "tests/frontend/step-1.test.tsx", content: "test('step1 frontend', () => {})" },
  { path: "tests/frontend/step-2.test.tsx", content: "test('step2 frontend', () => {})" },
  { path: "tests/integration/step-1.spec.ts", content: "test('step1 integration', () => {})" },
  { path: "tests/integration/step-2.spec.ts", content: "test('step2 integration', () => {})" },
  { path: "tests/integration/step-3.spec.ts", content: "test('step3 integration', () => {})" },
];

function runtime(stopped: string[]): FullstackRuntimeHandle {
  return {
    mode: "fullstack",
    backendUrl: "http://127.0.0.1:4310",
    frontendUrl: "http://127.0.0.1:5173",
    previewUrl: "http://127.0.0.1:5173",
    workspace: { root: "root", backend: "root/backend", frontend: "root/frontend" },
    logs: () => [],
    stop: vi.fn(async () => {
      stopped.push("stopped");
    }),
  };
}

const STEP_SOLUTIONS: Record<string, CheckpointFile[]> = {
  "step-1": [
    { path: "backend/src/app.ts", content: "step-1-backend" },
    { path: "frontend/src/App.tsx", content: "step-1-frontend" },
  ],
  "step-2": [
    { path: "backend/src/app.ts", content: "step-2-backend" },
    { path: "frontend/src/App.tsx", content: "step-2-frontend" },
  ],
  "step-3": [
    { path: "backend/src/app.ts", content: "step-3-backend" },
    { path: "frontend/src/App.tsx", content: "step-3-frontend" },
  ],
};

function filesForStep(stepId: string): CheckpointFile[] {
  return STEP_SOLUTIONS[stepId] ?? [];
}

function candidateFilesForStep(stepId: string): ServedWorkspaceFile[] {
  const files = new Map(loaded().files.map((file) => [file.path, { ...file }]));
  for (const checkpointFile of filesForStep(stepId)) {
    const existing = files.get(checkpointFile.path);
    if (existing) {
      existing.content = checkpointFile.content;
      files.set(checkpointFile.path, existing);
    }
  }
  return [...files.values()];
}

function deps() {
  const stopped: string[] = [];
  const resets: string[] = [];
  const calls: string[] = [];
  const dependencies: FullstackStepVerificationDependencies = {
    startRuntime: vi.fn(async () => runtime(stopped)),
    resetRuntime: vi.fn(async () => {
      resets.push("reset");
    }),
    resolveCheckpointFiles: vi.fn(async (_slug, stepId) => filesForStep(stepId)),
    runTestFile: vi.fn(async ({ layer, testFile }) => {
      calls.push(testFile.path);
      return {
        layer,
        status: "passed" as const,
        durationMs: 5,
        command: `npm test -- ${testFile.path}`,
      };
    }),
  };
  return { dependencies, stopped, resets, calls };
}

describe("selectStepScopedTestFiles", () => {
  it("runs only step-1 tests for step 1", () => {
    expect(selectStepScopedTestFiles(tests, "backend", 0).map((file) => file.path)).toEqual([
      "tests/backend/step-1.test.ts",
    ]);
  });

  it("runs prior steps plus the current step for step 2", () => {
    expect(selectStepScopedTestFiles(tests, "integration", 1).map((file) => file.path)).toEqual([
      "tests/integration/step-1.spec.ts",
      "tests/integration/step-2.spec.ts",
    ]);
  });

  it("runs all discovered step tests for step 3", () => {
    expect(selectStepScopedTestFiles(tests, "backend", 2).map((file) => file.path)).toEqual([
      "tests/backend/step-1.test.ts",
      "tests/backend/step-2.test.ts",
      "tests/backend/step-3.test.ts",
    ]);
  });
});

describe("verifyFullstackScenarioStep", () => {
  it("fails when the workspace still matches the starter files instead of the checkpoint solution", async () => {
    const { dependencies } = deps();
    const result = await verifyFullstackScenarioStep(loaded(), tests, dependencies, { stepIndex: 0 });

    expect(result.passed).toBe(false);
    expect(result.groups?.find((group) => group.name === "workspace")).toMatchObject({
      ok: false,
      reason: expect.stringContaining("Workspace does not match the authored checkpoint solution"),
    });
  });

  it("skips missing frontend tests without failing the whole verification when the checkpoint matches", async () => {
    const { dependencies } = deps();
    const result = await verifyFullstackScenarioStep(
      loaded(),
      tests.filter((file) => !file.path.startsWith("tests/frontend/")),
      dependencies,
      { stepIndex: 0, files: candidateFilesForStep("step-1") },
    );

    expect(result.passed).toBe(true);
    expect(result.groups?.map((group) => [group.name, group.ok, group.skipped])).toEqual([
      ["workspace", true, undefined],
      ["backend", true, undefined],
      ["frontend", true, true],
      ["integration", true, undefined],
    ]);
  });

  it("fails when required integration step tests are missing", async () => {
    const { dependencies } = deps();
    const result = await verifyFullstackScenarioStep(
      loaded(),
      tests.filter((file) => !file.path.startsWith("tests/integration/")),
      dependencies,
      { stepIndex: 1, files: candidateFilesForStep("step-2") },
    );

    expect(result.passed).toBe(false);
    expect(result.groups?.find((group) => group.name === "integration")).toMatchObject({
      ok: false,
      reason: "No integration step tests found for step 2.",
    });
  });

  it("resets runtime state before frontend and integration files and stops processes after failures", async () => {
    const { dependencies, stopped, resets, calls } = deps();
    vi.mocked(dependencies.runTestFile).mockImplementation(async ({ layer, testFile }) => {
      calls.push(testFile.path);
      return {
        layer,
        status: testFile.path.endsWith("step-2.spec.ts") ? ("failed" as const) : ("passed" as const),
        durationMs: 5,
        command: `npm test -- ${testFile.path}`,
        stderr: testFile.path.endsWith("step-2.spec.ts") ? "integration failed" : "",
      };
    });

    const result = await verifyFullstackScenarioStep(loaded(), tests, dependencies, {
      stepIndex: 1,
      files: candidateFilesForStep("step-2"),
    });

    expect(result.passed).toBe(false);
    expect(calls).toEqual([
      "tests/backend/step-1.test.ts",
      "tests/backend/step-2.test.ts",
      "tests/frontend/step-1.test.tsx",
      "tests/frontend/step-2.test.tsx",
      "tests/integration/step-1.spec.ts",
      "tests/integration/step-2.spec.ts",
    ]);
    expect(dependencies.startRuntime).toHaveBeenCalledTimes(2);
    expect(vi.mocked(dependencies.startRuntime).mock.calls.map(([, options]) => options.targets)).toEqual([
      { backend: false, frontend: false },
      { backend: true, frontend: true },
    ]);
    expect(resets).toHaveLength(4);
    expect(stopped).toEqual(["stopped", "stopped"]);
  });
});
