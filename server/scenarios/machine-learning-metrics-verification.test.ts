import { beforeAll, describe, expect, it } from "vitest";
import { verifyMlScenarioFinal, type MlAuthoredTestFile, type MlStepVerificationDependencies } from "@/lib/scenarios/machine-learning-step-verification";
import { runMachineLearningPytest } from "@/server/scenarios/machine-learning-runtime";
import { runMlScriptPreview } from "@/server/scenarios/machine-learning-preview";
import { resolvePythonCommand, runProcessWithTimeout } from "@/server/scenarios/python-runtime";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { Scenario } from "@/lib/scenarios/schema";

/**
 * Real, end-to-end proof that `execution.artifacts.metrics` (the ML metrics
 * contract) genuinely gates FINAL verification — using the REAL Python/pytest
 * runtime (no mocks), against a hand-built in-memory fixture scenario, never
 * the real authored content under `content/interview-scenarios/`. Mirrors the
 * pattern in `server/scenarios/machine-learning-authoring-solution.test.ts`.
 */

let pytestAvailable = false;

beforeAll(async () => {
  try {
    const python = await resolvePythonCommand();
    const probe = await runProcessWithTimeout({
      cwd: process.cwd(),
      command: python,
      args: ["-m", "pytest", "--version"],
      timeoutMs: 5_000,
    });
    pytestAvailable = probe.exitCode === 0;
  } catch {
    pytestAvailable = false;
  }
}, 15_000);

/** The real dependencies verifyMlScenarioFinal needs — the exact same
 *  composition `server/scenarios/machine-learning-step-verification.ts` uses
 *  in production, reused here directly rather than duplicated. */
const deps: MlStepVerificationDependencies = {
  runPytest: (input) => runMachineLearningPytest(input),
  runMainAndReadArtifact: async (input) => {
    const preview = await runMlScriptPreview({
      scenarioSlug: input.scenarioSlug,
      workspaceFiles: input.workspaceFiles,
      timeoutMs: input.timeoutMs,
    });
    const artifact = preview.artifacts.find((a) => a.path === input.artifactPath);
    return { ranOk: preview.ok, content: artifact?.preview?.text ?? null };
  },
};

function fixtureScenario(metrics: NonNullable<NonNullable<Scenario["execution"]>["artifacts"]>["metrics"]): Scenario {
  return {
    id: "ml-metrics-fixture",
    title: "ML Metrics Fixture",
    summary: "Internal-only fixture proving execution.artifacts.metrics gates real final verification.",
    category: "machine-learning-python",
    skills: ["python"],
    jobRoles: ["ml"],
    difficulty: "easy",
    experienceMin: "entry",
    experienceMax: "junior",
    estimatedMinutes: 30,
    stack: { languages: ["python"], harness: "python" },
    workspace: { files: [{ path: "main.py", role: "edit" }], entry: "main.py" },
    rubric: [{ criterion: "Correctness", weight: 100, detail: "Works." }],
    source: "authored",
    status: "verified",
    visibility: "internal",
    type: "machine-learning",
    version: 1,
    execution: { mode: "python-ml", artifacts: { metrics } },
    steps: [
      {
        id: "step-1",
        kind: "implement",
        prompt: "Step 1",
        verification: "automated-tests",
        verify: { harness: "python", tests: ["tests/step-1.test.py"] },
        weight: 100,
        checkpoint: { files: ["solution/step-1/main.py"] },
      },
    ],
  } as Scenario;
}

function loadedFor(scenario: Scenario, mainPy: string): LoadedScenario {
  return {
    slug: "ml-metrics-fixture",
    category: "machine-learning-python",
    scenario,
    sections: {},
    files: [{ path: "main.py", role: "edit", content: mainPy }],
    entry: "main.py",
  };
}

const passingTest: MlAuthoredTestFile = { path: "tests/step-1.test.py", content: "def test_ok():\n    assert True\n" };

describe("execution.artifacts.metrics — real end-to-end final verification", () => {
  it("passes when main.py writes valid metrics.json satisfying requiredPaths and expectedTypes", async () => {
    if (!pytestAvailable) return;
    const scenario = fixtureScenario({ required: true, requiredPaths: ["/accuracy"], expectedTypes: { "/accuracy": "number" } });
    const mainPy = "import json\nwith open('metrics.json', 'w') as f:\n    json.dump({'accuracy': 0.9}, f)\n";
    const loaded = loadedFor(scenario, mainPy);

    const result = await verifyMlScenarioFinal(loaded, [passingTest], deps, { files: { "main.py": mainPy } });

    expect(result.status).toBe("passed");
    expect(result.groups?.find((g) => g.name === "metrics")?.ok).toBe(true);
  }, 30_000);

  it("FAILS when main.py never writes metrics.json at all", async () => {
    if (!pytestAvailable) return;
    const scenario = fixtureScenario({ required: true });
    const mainPy = "print('no metrics written')\n";
    const loaded = loadedFor(scenario, mainPy);

    const result = await verifyMlScenarioFinal(loaded, [passingTest], deps, { files: { "main.py": mainPy } });

    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.ok).toBe(false);
    expect(metricsGroup?.reason).toContain("was not found");
  }, 30_000);

  it("FAILS when main.py writes malformed metrics.json", async () => {
    if (!pytestAvailable) return;
    const scenario = fixtureScenario({ required: true });
    const mainPy = "with open('metrics.json', 'w') as f:\n    f.write('{not valid json')\n";
    const loaded = loadedFor(scenario, mainPy);

    const result = await verifyMlScenarioFinal(loaded, [passingTest], deps, { files: { "main.py": mainPy } });

    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.ok).toBe(false);
    expect(metricsGroup?.reason).toContain("not valid JSON");
  }, 30_000);

  it("FAILS when main.py writes metrics.json missing a required key", async () => {
    if (!pytestAvailable) return;
    const scenario = fixtureScenario({ required: true, requiredPaths: ["/accuracy", "/f1"] });
    const mainPy = "import json\nwith open('metrics.json', 'w') as f:\n    json.dump({'accuracy': 0.9}, f)\n";
    const loaded = loadedFor(scenario, mainPy);

    const result = await verifyMlScenarioFinal(loaded, [passingTest], deps, { files: { "main.py": mainPy } });

    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.reason).toContain('missing required path "/f1"');
  }, 30_000);

  it("FAILS when a required metric has the wrong type", async () => {
    if (!pytestAvailable) return;
    const scenario = fixtureScenario({ required: true, expectedTypes: { "/accuracy": "number" } });
    const mainPy = "import json\nwith open('metrics.json', 'w') as f:\n    json.dump({'accuracy': 'very good'}, f)\n";
    const loaded = loadedFor(scenario, mainPy);

    const result = await verifyMlScenarioFinal(loaded, [passingTest], deps, { files: { "main.py": mainPy } });

    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.reason).toContain('expected type "number"');
  }, 30_000);

  it("does not fail verification when metrics.json is malformed but NOT required (optional artifact)", async () => {
    if (!pytestAvailable) return;
    const scenario = fixtureScenario(undefined); // no metrics config at all — fully optional
    const mainPy = "with open('metrics.json', 'w') as f:\n    f.write('{not valid json')\n";
    const loaded = loadedFor(scenario, mainPy);

    const result = await verifyMlScenarioFinal(loaded, [passingTest], deps, { files: { "main.py": mainPy } });

    expect(result.status).toBe("passed"); // pytest still passes; metrics was never checked at all
    expect(result.groups?.some((g) => g.name === "metrics")).toBe(false);
  }, 30_000);

  it("passes when main.py writes a REAL structured metrics.json (confusion matrix, cross-validation, per-class) satisfying nested requiredPaths/assertions", async () => {
    if (!pytestAvailable) return;
    const scenario = fixtureScenario({
      required: true,
      requiredPaths: ["/summary/accuracy", "/confusion_matrix", "/cross_validation/mean"],
      assertions: [
        { path: "/summary/f1", type: "number", minimum: 0, maximum: 1 },
        { path: "/confusion_matrix", type: "array", minItems: 2, maxItems: 10 },
        { path: "/cross_validation/fold_scores", type: "array" },
      ],
    });
    const mainPy = [
      "import json",
      "payload = {",
      "    'summary': {'accuracy': 0.84, 'precision': 0.73, 'recall': 0.77, 'f1': 0.75, 'roc_auc': 0.85},",
      "    'cross_validation': {'metric': 'f1', 'fold_scores': [0.71, 0.75, 0.73, 0.78, 0.74], 'mean': 0.742, 'std': 0.023},",
      "    'confusion_matrix': [[92, 8], [11, 39]],",
      "    'per_class': {",
      "        'non_defective': {'precision': 0.89, 'recall': 0.92, 'f1': 0.90, 'support': 100},",
      "        'defective': {'precision': 0.83, 'recall': 0.78, 'f1': 0.80, 'support': 50},",
      "    },",
      "    'model': {'name': 'LogisticRegression', 'parameters': {'class_weight': 'balanced', 'max_iter': 2000}},",
      "}",
      "with open('metrics.json', 'w') as f:",
      "    json.dump(payload, f)",
      "",
    ].join("\n");
    const loaded = loadedFor(scenario, mainPy);

    const result = await verifyMlScenarioFinal(loaded, [passingTest], deps, { files: { "main.py": mainPy } });

    expect(result.status).toBe("passed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.ok).toBe(true);
  }, 30_000);

  it("FAILS when a real structured metrics.json violates a nested assertion (f1 below the configured minimum)", async () => {
    if (!pytestAvailable) return;
    const scenario = fixtureScenario({
      required: true,
      assertions: [{ path: "/summary/f1", minimum: 0.65 }],
    });
    const mainPy =
      "import json\nwith open('metrics.json', 'w') as f:\n    json.dump({'summary': {'f1': 0.4}}, f)\n";
    const loaded = loadedFor(scenario, mainPy);

    const result = await verifyMlScenarioFinal(loaded, [passingTest], deps, { files: { "main.py": mainPy } });

    expect(result.status).toBe("failed");
    const metricsGroup = result.groups?.find((g) => g.name === "metrics");
    expect(metricsGroup?.reason).toContain("below the minimum");
  }, 30_000);
});
