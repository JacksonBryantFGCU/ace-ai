import { describe, expect, it, vi } from "vitest";
import { validateMachineLearningSolution } from "@/lib/scenarios/authoring/machine-learning-solution";
import type { AuthoredBundle } from "@/lib/scenarios/authoring/types";
import type { MachineLearningRuntimeResult } from "@/lib/scenarios/machine-learning-runtime";
import type { Scenario } from "@/lib/scenarios/schema";

/**
 * Unit coverage for the authoring-toolkit's ML solution validator — the fix
 * for the `solution/harness-not-runnable` placeholder. Uses a FAKE
 * `runPytest` (no real Python process) so these tests are fast/deterministic;
 * `server/scenarios/*.test.ts` covers the real end-to-end pytest path on the
 * actual authored scenarios.
 */

function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "ml-fixture",
    title: "ML Fixture",
    summary: "Internal machine-learning fixture used for authoring solution validation tests.",
    category: "machine-learning-python",
    skills: ["python"],
    jobRoles: ["ml"],
    difficulty: "easy",
    experienceMin: "entry",
    experienceMax: "junior",
    estimatedMinutes: 30,
    stack: { languages: ["python"], harness: "python" },
    workspace: {
      files: [
        { path: "main.py", role: "edit" },
        { path: "src/pipeline.py", role: "edit" },
      ],
      entry: "main.py",
    },
    rubric: [{ criterion: "Correctness", weight: 100, detail: "Works." }],
    source: "authored",
    status: "verified",
    visibility: "public",
    type: "machine-learning",
    version: 1,
    steps: [
      {
        id: "step-1",
        kind: "implement",
        prompt: "Step 1",
        verification: "automated-tests",
        verify: { harness: "python", tests: ["tests/step-1.test.py"] },
        weight: 34,
        checkpoint: { files: ["solution/step-1/main.py", "solution/step-1/src/pipeline.py"] },
      },
      {
        id: "step-2",
        kind: "implement",
        prompt: "Step 2",
        verification: "automated-tests",
        verify: { harness: "python", tests: ["tests/step-2.test.py"] },
        weight: 33,
        checkpoint: { files: ["solution/step-2/main.py", "solution/step-2/src/pipeline.py"] },
      },
      {
        id: "step-3",
        kind: "implement",
        prompt: "Step 3",
        verification: "automated-tests",
        verify: { harness: "python", tests: ["tests/step-3.test.py"] },
        weight: 33,
        checkpoint: { files: ["solution/step-3/main.py", "solution/step-3/src/pipeline.py"] },
      },
    ],
    ...overrides,
  } as Scenario;
}

function bundle(overrides: Partial<AuthoredBundle> = {}): AuthoredBundle {
  return {
    slug: "ml-fixture",
    category: "machine-learning-python",
    raw: "",
    frontmatter: {},
    scenario: scenario(),
    schemaError: null,
    sections: {},
    files: {
      "workspace/main.py": "print('starter')",
      "workspace/src/pipeline.py": "raise NotImplementedError()",
      "tests/step-1.test.py": "def test_one():\n    assert True\n",
      "tests/step-2.test.py": "def test_two():\n    assert True\n",
      "tests/step-3.test.py": "def test_three():\n    assert True\n",
      "solution/step-1/main.py": "print('step1 solution')",
      "solution/step-1/src/pipeline.py": "x = 1",
      "solution/step-2/main.py": "print('step2 solution')",
      "solution/step-2/src/pipeline.py": "x = 2",
      "solution/step-3/main.py": "print('step3 solution')",
      "solution/step-3/src/pipeline.py": "x = 3",
    },
    ...overrides,
  };
}

function okResult(overrides: Partial<MachineLearningRuntimeResult> = {}): MachineLearningRuntimeResult {
  return {
    ok: true,
    scenarioSlug: "ml-fixture",
    command: "pytest",
    exitCode: 0,
    stdout: "3 passed\n",
    stderr: "",
    durationMs: 10,
    timedOut: false,
    ...overrides,
  };
}

describe("validateMachineLearningSolution", () => {
  it("returns no diagnostics when every checkpoint (and final) passes", async () => {
    const runPytest = vi.fn(async () => okResult());
    const diagnostics = await validateMachineLearningSolution(bundle(), { runPytest });
    expect(diagnostics).toEqual([]);
  });

  it("runs cumulative tests: step 3's checkpoint is checked against steps 1+2+3's tests", async () => {
    const calls: string[][] = [];
    const runPytest = vi.fn(async (input) => {
      calls.push(input.testFiles);
      return okResult();
    });
    await validateMachineLearningSolution(bundle(), { runPytest });

    // 3 step calls + 1 final call = 4 pytest invocations.
    expect(calls).toHaveLength(4);
    expect(calls[0]).toEqual(["tests/step-1.test.py"]);
    expect(calls[1]).toEqual(["tests/step-1.test.py", "tests/step-2.test.py"]);
    expect(calls[2]).toEqual(["tests/step-1.test.py", "tests/step-2.test.py", "tests/step-3.test.py"]);
    // Final validation also runs every step's test together.
    expect(calls[3]).toEqual(["tests/step-1.test.py", "tests/step-2.test.py", "tests/step-3.test.py"]);
  });

  it("respects includePreviousSteps: false — each step is checked in isolation", async () => {
    const calls: string[][] = [];
    const runPytest = vi.fn(async (input) => {
      calls.push(input.testFiles);
      return okResult();
    });
    const b = bundle({
      scenario: scenario({ verification: { engine: "python", mode: "python-step", includePreviousSteps: false } }),
    });
    await validateMachineLearningSolution(b, { runPytest });

    expect(calls[0]).toEqual(["tests/step-1.test.py"]);
    expect(calls[1]).toEqual(["tests/step-2.test.py"]);
    expect(calls[2]).toEqual(["tests/step-3.test.py"]);
  });

  it("a genuinely broken step checkpoint produces a `solution/tests-fail` error, not a silent pass", async () => {
    const runPytest = vi.fn(async (input) => {
      // Step 2's cumulative run fails; everything else passes.
      if (input.testFiles.includes("tests/step-2.test.py")) {
        return okResult({ ok: false, exitCode: 1, stdout: "", stderr: "assert False\nAssertionError" });
      }
      return okResult();
    });
    const diagnostics = await validateMachineLearningSolution(bundle(), { runPytest });

    const failures = diagnostics.filter((d) => d.code === "solution/tests-fail");
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.every((d) => d.level === "error")).toBe(true);
    expect(failures[0]!.location).toContain("step-2");
  });

  it("does not stop early: a step-1 failure still reports diagnostics for later steps", async () => {
    const runPytest = vi.fn(async (input) => {
      if (input.testFiles.includes("tests/step-1.test.py")) {
        return okResult({ ok: false, exitCode: 1, stderr: "1 failed" });
      }
      return okResult();
    });
    const diagnostics = await validateMachineLearningSolution(bundle(), { runPytest });
    // Every cumulative run (steps 2, 3, final) also includes step 1's test, so
    // a broken step-1 checkpoint fails every subsequent cumulative check too —
    // proving the validator surfaces every affected step, not just the first.
    const failures = diagnostics.filter((d) => d.code === "solution/tests-fail");
    expect(failures.length).toBe(4); // step-1, step-2, step-3, final
  });

  it("a later checkpoint is never used to verify an earlier step (no accidental future-solution leakage)", async () => {
    const seenFiles: Record<string, string>[] = [];
    const runPytest = vi.fn(async (input) => {
      seenFiles.push(input.workspaceFiles);
      return okResult();
    });
    await validateMachineLearningSolution(bundle(), { runPytest });

    // Step 1's run must use step-1's solution content, not step-2's/step-3's.
    expect(seenFiles[0]!["main.py"]).toBe("print('step1 solution')");
    expect(seenFiles[1]!["main.py"]).toBe("print('step2 solution')");
    expect(seenFiles[2]!["main.py"]).toBe("print('step3 solution')");
  });

  it("emits a warning (not an error) when a step has no checkpoint to validate", async () => {
    const runPytest = vi.fn(async () => okResult());
    const b = bundle({
      scenario: scenario({
        steps: [
          {
            id: "step-1",
            kind: "implement",
            prompt: "Step 1",
            verification: "automated-tests",
            verify: { harness: "python", tests: ["tests/step-1.test.py"] },
            weight: 100,
            // no checkpoint
          },
        ] as Scenario["steps"],
      }),
    });
    const diagnostics = await validateMachineLearningSolution(b, { runPytest });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]!.code).toBe("solution/no-reference-solution");
    expect(diagnostics[0]!.level).toBe("warning");
  });

  it("reports an actionable error when the runner itself throws (e.g. Python unavailable) — `verifyMlScenarioStep` turns this into a structured failure, never a silent pass", async () => {
    const runPytest = vi.fn(async () => {
      throw new Error("Python runtime is not available");
    });
    const diagnostics = await validateMachineLearningSolution(bundle(), { runPytest });
    const failures = diagnostics.filter((d) => d.code === "solution/tests-fail");
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.every((d) => d.level === "error")).toBe(true);
    expect(failures[0]!.message).toContain("Python runtime is not available");
  });

  it("returns no diagnostics for a non-ML scenario (this validator is a no-op outside its type)", async () => {
    const runPytest = vi.fn(async () => okResult());
    const b = bundle({ scenario: scenario({ type: "backend" }) as Scenario });
    const diagnostics = await validateMachineLearningSolution(b, { runPytest });
    expect(diagnostics).toEqual([]);
    expect(runPytest).not.toHaveBeenCalled();
  });

  it("returns no diagnostics when the bundle has no valid scenario at all", async () => {
    const runPytest = vi.fn(async () => okResult());
    const diagnostics = await validateMachineLearningSolution(bundle({ scenario: null }), { runPytest });
    expect(diagnostics).toEqual([]);
    expect(runPytest).not.toHaveBeenCalled();
  });
});
