import { describe, expect, it, vi } from "vitest";
import {
  FullstackRuntimeStartupError,
  isFullstackRuntimeScenario,
  startFullstackRuntime,
  type FullstackProcessSpec,
  type FullstackRuntimeDependencies,
  type FullstackRuntimeProcess,
} from "@/lib/scenarios/fullstack-runtime";
import type { LoadedScenario } from "@/lib/scenarios/types";

function loadedScenario(overrides: Partial<LoadedScenario["scenario"]> = {}): LoadedScenario {
  return {
    slug: "internal-fullstack-fixture",
    category: "fullstack-react-node",
    scenario: {
      id: "internal-fullstack-fixture",
      title: "Internal Fullstack Fixture",
      summary: "Internal fixture used only by runtime orchestration tests.",
      category: "fullstack-react-node",
      skills: ["react", "api"],
      jobRoles: ["fullstack"],
      tags: [],
      difficulty: "medium",
      experienceMin: "entry",
      experienceMax: "senior",
      estimatedMinutes: 30,
      stack: { languages: ["typescript"], harness: "component" },
      workspace: {
        files: [
          { path: "backend/package.json", role: "readonly" },
          { path: "backend/app.ts", role: "edit" },
          { path: "frontend/package.json", role: "readonly" },
          { path: "frontend/src/App.tsx", role: "edit" },
        ],
        entry: "frontend/src/App.tsx",
      },
      rubric: [{ criterion: "Correctness", weight: 100, detail: "Works as specified." }],
      status: "draft",
      visibility: "internal",
      version: 1,
      type: "fullstack",
      frontend: { framework: "react", bundler: "vite" },
      backend: { framework: "express", database: "sqlite" },
      execution: { mode: "fullstack" },
      steps: [
        {
          id: "step-1",
          kind: "implement",
          prompt: "Wire the app.",
          verification: "automated-tests",
          verify: { harness: "component", functionName: "App", tests: ["tests/frontend/step-1.test.tsx"] },
          weight: 100,
        },
      ],
      ...overrides,
    },
    sections: {},
    files: [
      { path: "backend/package.json", role: "readonly", content: "{}" },
      { path: "backend/app.ts", role: "edit", content: "export default {};" },
      { path: "frontend/package.json", role: "readonly", content: "{}" },
      { path: "frontend/src/App.tsx", role: "edit", content: "export function App() { return null; }" },
    ],
    entry: "frontend/src/App.tsx",
  } as LoadedScenario;
}

function processMock(label: string, stopped: string[]): FullstackRuntimeProcess {
  return {
    stop: vi.fn(async () => {
      stopped.push(label);
    }),
  };
}

function deps(overrides: Partial<FullstackRuntimeDependencies> = {}) {
  const specs: FullstackProcessSpec[] = [];
  const stopped: string[] = [];
  const dependencies: FullstackRuntimeDependencies = {
    allocatePorts: vi.fn(async () => ({ backendPort: 4310, frontendPort: 5173 })),
    prepareWorkspace: vi.fn(async () => ({
      root: "runtime/root",
      backend: "runtime/root/backend",
      frontend: "runtime/root/frontend",
    })),
    startProcess: vi.fn(async (spec) => {
      specs.push(spec);
      return processMock(spec.name, stopped);
    }),
    waitForHttp: vi.fn(async () => {}),
    cleanupWorkspace: vi.fn(async () => {}),
    ...overrides,
  };
  return { dependencies, specs, stopped };
}

describe("fullstack runtime orchestration", () => {
  it("detects only explicit fullstack runtime scenarios", () => {
    expect(isFullstackRuntimeScenario(loadedScenario())).toBe(true);
    expect(isFullstackRuntimeScenario(loadedScenario({ type: "backend", execution: { mode: "single" } }))).toBe(false);
  });

  it("starts backend first, injects VITE_API_BASE_URL, and exposes frontend as preview URL", async () => {
    const { dependencies, specs } = deps();

    const runtime = await startFullstackRuntime(loadedScenario(), dependencies);

    expect(specs.map((spec) => spec.name)).toEqual(["backend", "frontend"]);
    expect(specs[0]).toMatchObject({
      cwd: "runtime/root/backend",
      command: "npm",
      args: ["run", "dev"],
      env: { PORT: "4310", NODE_ENV: "development" },
    });
    expect(specs[1]).toMatchObject({
      cwd: "runtime/root/frontend",
      command: "npm",
      args: ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
      env: { VITE_API_BASE_URL: "http://localhost:4310" },
    });
    expect(runtime).toMatchObject({
      mode: "fullstack",
      frontendUrl: "http://localhost:5173",
      backendUrl: "http://localhost:4310",
      previewUrl: "http://localhost:5173",
    });
    expect(dependencies.waitForHttp).toHaveBeenNthCalledWith(1, "http://localhost:4310/health", "backend");
    expect(dependencies.waitForHttp).toHaveBeenNthCalledWith(2, "http://localhost:5173", "frontend");
  });

  it("uses test-mode processes for verification runs so reset endpoints stay available", async () => {
    const { dependencies, specs } = deps();

    await startFullstackRuntime(loadedScenario(), dependencies, { purpose: "verification" });

    expect(specs[0]?.env.NODE_ENV).toBe("test");
    expect(specs[1]?.env.NODE_ENV).toBe("test");
  });

  it("stop cleans up frontend, backend, and prepared workspace", async () => {
    const { dependencies, stopped } = deps();

    const runtime = await startFullstackRuntime(loadedScenario(), dependencies);
    await runtime.stop();

    expect(stopped).toEqual(["frontend", "backend"]);
    expect(dependencies.cleanupWorkspace).toHaveBeenCalledWith({
      root: "runtime/root",
      backend: "runtime/root/backend",
      frontend: "runtime/root/frontend",
    });
  });

  it("failed backend startup cleans up the prepared workspace", async () => {
    const { dependencies } = deps({
      startProcess: vi.fn(async () => {
        throw new Error("backend failed");
      }),
    });

    await expect(startFullstackRuntime(loadedScenario(), dependencies)).rejects.toMatchObject({
      stage: "backend",
      message: "backend failed",
    } satisfies Partial<FullstackRuntimeStartupError>);
    expect(dependencies.cleanupWorkspace).toHaveBeenCalledOnce();
  });

  it("failed frontend startup stops backend and cleans up workspace", async () => {
    const stopped: string[] = [];
    const { dependencies } = deps({
      startProcess: vi.fn(async (spec) => {
        if (spec.name === "frontend") throw new Error("frontend failed");
        return processMock("backend", stopped);
      }),
    });

    await expect(startFullstackRuntime(loadedScenario(), dependencies)).rejects.toMatchObject({
      stage: "frontend",
      message: "frontend failed",
    } satisfies Partial<FullstackRuntimeStartupError>);
    expect(stopped).toEqual(["backend"]);
    expect(dependencies.cleanupWorkspace).toHaveBeenCalledOnce();
  });
});
