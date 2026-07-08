import { describe, expect, it, vi } from "vitest";
import {
  runFullstackScenarioTests,
  type FullstackAuthoredTestFile,
  type FullstackLayerRunInput,
  type FullstackTestRunnerDependencies,
} from "@/lib/scenarios/fullstack-test-runner";
import type { FullstackRuntimeHandle } from "@/lib/scenarios/fullstack-runtime";
import type { LoadedScenario } from "@/lib/scenarios/types";

function loaded(overrides: Partial<LoadedScenario["scenario"]> = {}): LoadedScenario {
  return {
    slug: "internal-fullstack-fixture",
    category: "fullstack-react-node",
    scenario: {
      id: "internal-fullstack-fixture",
      title: "Internal Fullstack Fixture",
      summary: "Internal fixture used only by fullstack test runner tests.",
      category: "fullstack-react-node",
      skills: ["react", "api"],
      jobRoles: ["fullstack"],
      difficulty: "medium",
      experienceMin: "entry",
      experienceMax: "senior",
      estimatedMinutes: 30,
      stack: { languages: ["typescript"], harness: "component" },
      workspace: {
        files: [
          { path: "backend/app.ts", role: "edit" },
          { path: "frontend/src/App.tsx", role: "edit" },
        ],
        entry: "frontend/src/App.tsx",
      },
      rubric: [{ criterion: "Correctness", weight: 100, detail: "Works as specified." }],
      status: "draft",
      version: 1,
      type: "fullstack",
      frontend: { framework: "react", bundler: "vite" },
      backend: { framework: "express", database: "sqlite" },
      execution: { mode: "fullstack" },
      steps: [
        {
          id: "step-1",
          kind: "implement",
          prompt: "Build it.",
          verification: "automated-tests",
          verify: { harness: "component", functionName: "App", tests: ["tests/integration/flow.spec.ts"] },
          weight: 100,
        },
      ],
      ...overrides,
    },
    sections: {},
    files: [
      { path: "backend/app.ts", role: "edit", content: "export default {};" },
      { path: "frontend/src/App.tsx", role: "edit", content: "export function App() { return null; }" },
    ],
    entry: "frontend/src/App.tsx",
  } as LoadedScenario;
}

function runtime(stops: string[]): FullstackRuntimeHandle {
  return {
    mode: "fullstack",
    frontendUrl: "http://localhost:5173",
    backendUrl: "http://localhost:4310",
    previewUrl: "http://localhost:5173",
    workspace: { root: "root", backend: "root/backend", frontend: "root/frontend" },
    logs: () => [],
    stop: vi.fn(async () => {
      stops.push("runtime");
    }),
  };
}

const tests: FullstackAuthoredTestFile[] = [
  { path: "tests/backend/api.test.ts", content: "test('api', () => {})" },
  { path: "tests/frontend/ui.test.tsx", content: "test('ui', () => {})" },
  { path: "tests/integration/create-item.spec.ts", content: "test('flow', () => {})" },
  { path: "tests/integration/reload.spec.ts", content: "test('reload', () => {})" },
];

function deps() {
  const calls: FullstackLayerRunInput[] = [];
  const stops: string[] = [];
  const dependencies: FullstackTestRunnerDependencies = {
    startRuntime: vi.fn(async () => runtime(stops)),
    runLayer: vi.fn(async (input) => {
      calls.push(input);
      return { layer: input.layer, status: "passed" as const, durationMs: 5 };
    }),
  };
  return { dependencies, calls, stops };
}

describe("fullstack scenario test runner", () => {
  it("rejects backend-only scenarios", async () => {
    const { dependencies } = deps();
    await expect(
      runFullstackScenarioTests(loaded({ type: "backend", execution: { mode: "single" } }), tests, dependencies),
    ).rejects.toThrow(/not a fullstack runtime scenario/);
  });

  it("runs backend and frontend layers without starting integration runtime itself", async () => {
    const { dependencies, calls } = deps();
    const result = await runFullstackScenarioTests(loaded(), tests, dependencies, { layers: ["backend", "frontend"] });

    expect(result.status).toBe("passed");
    expect(calls.map((call) => call.layer)).toEqual(["backend", "frontend"]);
    expect(calls[0]?.testFiles.map((file) => file.path)).toEqual(["tests/backend/api.test.ts"]);
    expect(calls[1]?.testFiles.map((file) => file.path)).toEqual(["tests/frontend/ui.test.tsx"]);
    expect(dependencies.startRuntime).not.toHaveBeenCalled();
  });

  it("starts a fresh fullstack runtime for each integration test file and stops it", async () => {
    const { dependencies, calls, stops } = deps();

    const result = await runFullstackScenarioTests(loaded(), tests, dependencies, { layers: ["integration"] });

    expect(result.status).toBe("passed");
    expect(dependencies.startRuntime).toHaveBeenCalledTimes(2);
    expect(calls.map((call) => call.testFiles[0]?.path)).toEqual([
      "tests/integration/create-item.spec.ts",
      "tests/integration/reload.spec.ts",
    ]);
    expect(calls.every((call) => call.runtime?.previewUrl === "http://localhost:5173")).toBe(true);
    expect(stops).toEqual(["runtime", "runtime"]);
  });

  it("skips absent frontend tests but fails absent required backend/integration tests", async () => {
    const { dependencies } = deps();
    const result = await runFullstackScenarioTests(
      loaded(),
      [{ path: "tests/backend/api.test.ts", content: "" }],
      dependencies,
    );

    expect(result.status).toBe("failed");
    expect(result.layers.map((layer) => [layer.layer, layer.status])).toEqual([
      ["backend", "passed"],
      ["frontend", "skipped"],
      ["integration", "failed"],
    ]);
  });
});
