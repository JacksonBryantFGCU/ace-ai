import { describe, expect, it, vi } from "vitest";
import {
  verifyMlScenarioFinal,
  verifyMlScenarioStep,
  type MlAuthoredTestFile,
  type MlStepVerificationDependencies,
} from "@/lib/scenarios/machine-learning-step-verification";
import type { MachineLearningRuntimeResult } from "@/lib/scenarios/machine-learning-runtime";
import type { LoadedScenario } from "@/lib/scenarios/types";

function loaded(): LoadedScenario {
  return {
    slug: "ml-fixture",
    category: "machine-learning-python",
    scenario: {
      id: "ml-fixture",
      title: "ML Fixture",
      summary: "Internal machine-learning fixture used for verification tests.",
      category: "machine-learning-python",
      skills: ["python"],
      jobRoles: ["machine-learning"],
      difficulty: "medium",
      experienceMin: "entry",
      experienceMax: "senior",
      estimatedMinutes: 40,
      stack: { languages: ["python"], harness: "python" },
      workspace: {
        files: [{ path: "main.py", role: "edit" }, { path: "data/train.csv", role: "readonly" }],
        entry: "main.py",
      },
      rubric: [{ criterion: "Correctness", weight: 100, detail: "Works." }],
      status: "draft",
      version: 1,
      type: "machine-learning",
      runtime: "python",
      execution: { mode: "python-ml" },
      steps: [
        { id: "step-1", kind: "implement", prompt: "Step 1", verification: "automated-tests", verify: { harness: "python", tests: ["tests/step-1.test.py"] }, weight: 34 },
        { id: "step-2", kind: "implement", prompt: "Step 2", verification: "automated-tests", verify: { harness: "python", tests: ["tests/step-2.test.py"] }, weight: 33 },
        { id: "step-3", kind: "implement", prompt: "Step 3", verification: "automated-tests", verify: { harness: "python", tests: ["tests/step-3.test.py"] }, weight: 33 },
      ],
    },
    sections: {},
    files: [
      { path: "main.py", role: "edit", content: "print('starter')" },
      { path: "data/train.csv", role: "readonly", content: "a,b\n1,2\n" },
    ],
    entry: "main.py",
  } as LoadedScenario;
}

const allTests: MlAuthoredTestFile[] = [
  { path: "tests/step-1.test.py", content: "def test_step1():\n    assert True\n" },
  { path: "tests/step-2.test.py", content: "def test_step2():\n    assert True\n" },
  { path: "tests/step-3.test.py", content: "def test_step3():\n    assert True\n" },
];

function okRuntimeResult(overrides: Partial<MachineLearningRuntimeResult> = {}): MachineLearningRuntimeResult {
  return {
    ok: true,
    scenarioSlug: "ml-fixture",
    command: "pytest",
    exitCode: 0,
    stdout: "3 passed\n",
    stderr: "",
    durationMs: 12,
    timedOut: false,
    ...overrides,
  };
}

function deps(overrides: Partial<MlStepVerificationDependencies> = {}) {
  const calls: { testFiles: string[] }[] = [];
  const dependencies: MlStepVerificationDependencies = {
    runPytest: vi.fn(async (input) => {
      calls.push({ testFiles: input.testFiles });
      return okRuntimeResult();
    }),
    ...overrides,
  };
  return { dependencies, calls };
}

describe("verifyMlScenarioStep", () => {
  it("step 1 selects only tests/step-1.test.py", async () => {
    const { dependencies, calls } = deps();
    await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 0 });
    expect(calls[0]!.testFiles).toEqual(["tests/step-1.test.py"]);
  });

  it("step 2 selects step 1 and step 2 tests", async () => {
    const { dependencies, calls } = deps();
    await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 1 });
    expect(calls[0]!.testFiles).toEqual(["tests/step-1.test.py", "tests/step-2.test.py"]);
  });

  it("step 3 selects steps 1, 2, and 3 tests", async () => {
    const { dependencies, calls } = deps();
    await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 2 });
    expect(calls[0]!.testFiles).toEqual(["tests/step-1.test.py", "tests/step-2.test.py", "tests/step-3.test.py"]);
  });

  it("includePreviousSteps: false selects only the current step test", async () => {
    const { dependencies, calls } = deps();
    await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 2, includePreviousSteps: false });
    expect(calls[0]!.testFiles).toEqual(["tests/step-3.test.py"]);
  });

  it("defaults includePreviousSteps to true", async () => {
    const { dependencies, calls } = deps();
    await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 1 });
    expect(calls[0]!.testFiles.length).toBe(2);
  });

  it("fails clearly when a selected test file is missing", async () => {
    const { dependencies, calls } = deps();
    const partialTests = allTests.filter((t) => t.path !== "tests/step-2.test.py");
    const result = await verifyMlScenarioStep(loaded(), partialTests, dependencies, { stepIndex: 2 });
    expect(result.passed).toBe(false);
    expect(result.status).toBe("failed");
    const pythonGroup = result.groups?.find((g) => g.name === "python");
    expect(pythonGroup?.reason).toBe("Missing ML step test: tests/step-2.test.py");
    expect(calls.length).toBe(0); // never reaches the runtime
  });

  it("returns ok: true (passed) when pytest passes", async () => {
    const { dependencies } = deps();
    const result = await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 0 });
    expect(result.status).toBe("passed");
    expect(result.passed).toBe(true);
  });

  it("returns ok: false (failed) when pytest fails", async () => {
    const { dependencies } = deps({
      runPytest: vi.fn(async () => okRuntimeResult({ ok: false, exitCode: 1, stdout: "", stderr: "1 failed" })),
    });
    const result = await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 0 });
    expect(result.status).toBe("failed");
    expect(result.passed).toBe(false);
    expect(result.groups?.find((g) => g.name === "python")?.output).toContain("1 failed");
  });

  it("returns ok: false when pytest times out", async () => {
    const { dependencies } = deps({
      runPytest: vi.fn(async () => okRuntimeResult({ ok: false, exitCode: null, timedOut: true })),
    });
    const result = await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 0 });
    expect(result.status).toBe("failed");
    expect(result.groups?.find((g) => g.name === "python")?.reason).toBe("Python checks timed out.");
  });

  it("returns a structured failure when the python runtime is unavailable", async () => {
    const { dependencies } = deps({
      runPytest: vi.fn(async () => {
        throw new Error("Python runtime not found on PATH.");
      }),
    });
    const result = await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 0 });
    expect(result.status).toBe("failed");
    expect(result.groups?.find((g) => g.name === "python")?.reason).toBe("Python runtime not found on PATH.");
  });

  it("groups the python output and omits a metrics group (no metrics convention exists yet)", async () => {
    const { dependencies } = deps();
    const result = await verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 0 });
    expect(result.groups?.map((g) => g.name)).toEqual(["python"]);
    expect(result.groups?.find((g) => g.name === "metrics")).toBeUndefined();
  });

  it("does not require functionName on any step", async () => {
    const scenario = loaded();
    for (const step of scenario.scenario.steps) {
      expect(step.verify.functionName).toBeUndefined();
    }
  });

  it("rejects an invalid step index", async () => {
    const { dependencies } = deps();
    await expect(
      verifyMlScenarioStep(loaded(), allTests, dependencies, { stepIndex: 99 }),
    ).rejects.toThrow(/invalid step index/);
  });

  it("throws for a non-machine-learning scenario", async () => {
    const { dependencies } = deps();
    const nonMl = loaded();
    nonMl.scenario = { ...nonMl.scenario, type: "backend" } as LoadedScenario["scenario"];
    await expect(verifyMlScenarioStep(nonMl, allTests, dependencies, { stepIndex: 0 })).rejects.toThrow(
      /not a machine-learning scenario/,
    );
  });
});

describe("verifyMlScenarioFinal", () => {
  it("selects all step tests", async () => {
    const { dependencies, calls } = deps();
    await verifyMlScenarioFinal(loaded(), allTests, dependencies);
    expect(calls[0]!.testFiles).toEqual(["tests/step-1.test.py", "tests/step-2.test.py", "tests/step-3.test.py"]);
  });

  it("passes when pytest passes across all step tests", async () => {
    const { dependencies } = deps();
    const result = await verifyMlScenarioFinal(loaded(), allTests, dependencies);
    expect(result.status).toBe("passed");
    expect(result.mode).toBe("python-final");
  });

  it("fails clearly when no step tests are authored", async () => {
    const { dependencies, calls } = deps();
    const result = await verifyMlScenarioFinal(loaded(), [], dependencies);
    expect(result.status).toBe("failed");
    expect(result.groups?.find((g) => g.name === "python")?.reason).toBe(
      "No ML step tests found for final validation.",
    );
    expect(calls.length).toBe(0);
  });
});

describe("verifyMlScenarioFinal — metrics.json validation (execution.artifacts.metrics)", () => {
  function loadedWithMetricsConfig(
    metrics: NonNullable<NonNullable<LoadedScenario["scenario"]["execution"]>["artifacts"]>["metrics"],
  ): LoadedScenario {
    const base = loaded();
    return { ...base, scenario: { ...base.scenario, execution: { mode: "python-ml", artifacts: { metrics } } } };
  }

  it("adds no metrics group at all when execution.artifacts.metrics is not configured (existing scenarios unaffected)", async () => {
    const { dependencies } = deps();
    const result = await verifyMlScenarioFinal(loaded(), allTests, dependencies);
    expect(result.groups?.some((g) => g.name === "metrics")).toBe(false);
  });

  it("adds no metrics group, and never calls runMainAndReadArtifact, when required is false/omitted", async () => {
    const runMainAndReadArtifact = vi.fn();
    const { dependencies } = deps({ runMainAndReadArtifact });
    const result = await verifyMlScenarioFinal(
      loadedWithMetricsConfig({ requiredPaths: ["/accuracy"] }),
      allTests,
      dependencies,
    );
    expect(result.groups?.some((g) => g.name === "metrics")).toBe(false);
    expect(runMainAndReadArtifact).not.toHaveBeenCalled();
  });

  it("passes the metrics group when metrics.json is valid and satisfies requiredKeys/expectedTypes", async () => {
    const runMainAndReadArtifact = vi.fn(async () => ({
      ranOk: true,
      content: JSON.stringify({ accuracy: 0.9, model: "LogisticRegression" }),
    }));
    const { dependencies } = deps({ runMainAndReadArtifact });
    const result = await verifyMlScenarioFinal(
      loadedWithMetricsConfig({ required: true, requiredPaths: ["/accuracy"], expectedTypes: { "/accuracy": "number" } }),
      allTests,
      dependencies,
    );
    expect(result.status).toBe("passed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.ok).toBe(true);
  });

  it("FAILS final verification when required metrics.json is missing", async () => {
    const runMainAndReadArtifact = vi.fn(async () => ({ ranOk: true, content: null }));
    const { dependencies } = deps({ runMainAndReadArtifact });
    const result = await verifyMlScenarioFinal(loadedWithMetricsConfig({ required: true }), allTests, dependencies);
    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.ok).toBe(false);
    expect(metricsGroup?.reason).toContain("was not found");
  });

  it("FAILS final verification when required metrics.json is malformed JSON", async () => {
    const runMainAndReadArtifact = vi.fn(async () => ({ ranOk: true, content: "{not valid json" }));
    const { dependencies } = deps({ runMainAndReadArtifact });
    const result = await verifyMlScenarioFinal(loadedWithMetricsConfig({ required: true }), allTests, dependencies);
    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.ok).toBe(false);
    expect(metricsGroup?.reason).toContain("not valid JSON");
  });

  it("FAILS final verification when a required metric key is missing", async () => {
    const runMainAndReadArtifact = vi.fn(async () => ({ ranOk: true, content: JSON.stringify({ accuracy: 0.9 }) }));
    const { dependencies } = deps({ runMainAndReadArtifact });
    const result = await verifyMlScenarioFinal(
      loadedWithMetricsConfig({ required: true, requiredPaths: ["/accuracy", "/f1"] }),
      allTests,
      dependencies,
    );
    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.reason).toContain('missing required path "/f1"');
  });

  it("FAILS final verification when a required metric has the wrong type", async () => {
    const runMainAndReadArtifact = vi.fn(async () => ({
      ranOk: true,
      content: JSON.stringify({ accuracy: "high" }),
    }));
    const { dependencies } = deps({ runMainAndReadArtifact });
    const result = await verifyMlScenarioFinal(
      loadedWithMetricsConfig({ required: true, expectedTypes: { "/accuracy": "number" } }),
      allTests,
      dependencies,
    );
    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.reason).toContain('expected type "number"');
  });

  it("FAILS final verification when main.py itself did not run successfully", async () => {
    const runMainAndReadArtifact = vi.fn(async () => ({ ranOk: false, content: null }));
    const { dependencies } = deps({ runMainAndReadArtifact });
    const result = await verifyMlScenarioFinal(loadedWithMetricsConfig({ required: true }), allTests, dependencies);
    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.reason).toContain("main.py did not run successfully");
  });

  it("metrics validation is independent of the pytest result — pytest can pass while metrics still fails verification overall", async () => {
    const runMainAndReadArtifact = vi.fn(async () => ({ ranOk: true, content: "{not valid json" }));
    const { dependencies } = deps({ runMainAndReadArtifact }); // runPytest defaults to passing
    const result = await verifyMlScenarioFinal(loadedWithMetricsConfig({ required: true }), allTests, dependencies);
    expect(result.groups?.find((g) => g.name === "python")?.ok).toBe(true);
    expect(result.groups?.find((g) => g.name === "metrics")?.ok).toBe(false);
    expect(result.status).toBe("failed"); // overall result still fails
  });

  it("does not add a metrics group at STEP verification (only final) even when configured", async () => {
    const runMainAndReadArtifact = vi.fn();
    const { dependencies } = deps({ runMainAndReadArtifact });
    const result = await verifyMlScenarioStep(loadedWithMetricsConfig({ required: true }), allTests, dependencies, {
      stepIndex: 0,
    });
    expect(result.groups?.some((g) => g.name === "metrics")).toBe(false);
    expect(runMainAndReadArtifact).not.toHaveBeenCalled();
  });
});
