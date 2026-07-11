import { beforeAll, describe, expect, it } from "vitest";
import { checkpointSource } from "@/server/scenarios/checkpoint-source";
import { loadScenario, listScenarioOptions, listScenarios } from "@/server/scenarios/load";
import { listScenarioCandidates, listScenarioPickerOptions } from "@/server/scenarios/candidates";
import { verifyFinalOnServer, verifyStepOnServer } from "@/server/scenarios/verification-service";
import { mlDataFilesOf } from "@/server/scenarios/machine-learning-data-preview";
import { previewMlScript } from "@/server/scenarios/machine-learning-preview";
import { validateScenarios } from "@/server/scenarios/authoring";
import { resolvePythonCommand, runProcessWithTimeout } from "@/server/scenarios/python-runtime";
import { roleMatchForScenario } from "@/lib/scenarios/selection/roles";
import { applyCheckpoint } from "@/lib/scenarios/session";
import type { WorkspaceSession } from "@/lib/scenarios/types";
import type { SnapshotFile } from "@/lib/scenarios/verification";

/**
 * The first PUBLIC Medium Machine Learning scenario — proves the ML runtime
 * scales to a leakage-safe binary classification pipeline (mixed numeric +
 * categorical features, missing values, class imbalance, ColumnTransformer,
 * stratified cross-validation, structured nested metrics.json with a
 * requiredPaths/expectedTypes/assertions contract) end to end on real
 * content, through the same real sandboxed engine every Easy ML scenario
 * uses. Mirrors `server/scenarios/house-price-regression.test.ts` and
 * `server/scenarios/support-ticket-categorizer.test.ts`.
 */
const SLUG = "manufacturing-defect-classifier";

function snapshot(files: readonly { path: string; content: string; role: string }[]): SnapshotFile[] {
  return files.map((file) => ({ path: file.path, content: file.content, role: file.role as SnapshotFile["role"] }));
}

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

describe("manufacturing-defect-classifier (public Medium ML classification scenario)", () => {
  it("validates cleanly through the authoring toolkit", async () => {
    const reports = await validateScenarios({ slug: SLUG });
    expect(reports).toHaveLength(1);
    expect(reports[0]!.ok).toBe(true);
    expect(reports[0]!.diagnostics.some((d) => d.level === "error")).toBe(false);
  });

  it(
    "runs the reference solution through the REAL authoring-toolkit pytest engine (runSolution: true), with zero harness-not-runnable diagnostics",
    async () => {
      if (!pytestAvailable) return;
      const reports = await validateScenarios({ slug: SLUG, runSolution: true });
      expect(reports).toHaveLength(1);
      expect(reports[0]!.ok).toBe(true);
      expect(reports[0]!.diagnostics.some((d) => d.code === "solution/harness-not-runnable")).toBe(false);
      expect(reports[0]!.diagnostics.some((d) => d.level === "error")).toBe(false);
    },
    120_000,
  );

  it("is public: included in every public listing, alongside the existing Easy ML scenarios and internal ML reference", async () => {
    const [summaries, options, candidates, pickerOptions] = await Promise.all([
      listScenarios(),
      listScenarioOptions(),
      listScenarioCandidates(),
      listScenarioPickerOptions(),
    ]);
    expect(summaries.some((s) => s.slug === SLUG)).toBe(true);
    expect(options.some((s) => s.slug === SLUG)).toBe(true);
    expect(candidates.some((s) => s.slug === SLUG)).toBe(true);
    expect(pickerOptions.some((s) => s.slug === SLUG)).toBe(true);

    // The internal ML reference fixture stays hidden regardless.
    expect(options.some((s) => s.slug === "customer-churn-classifier")).toBe(false);

    // The existing public Easy ML scenarios are still there too — this task
    // added a new scenario, it didn't replace or hide any existing one.
    expect(options.some((s) => s.slug === "iris-species-classifier")).toBe(true);
    expect(options.some((s) => s.slug === "house-price-regression")).toBe(true);
    expect(options.some((s) => s.slug === "support-ticket-categorizer")).toBe(true);
  });

  it("appears in the Machine Learning picker, and not the backend/fullstack/frontend pickers", async () => {
    const options = await listScenarioPickerOptions();
    const option = options.find((o) => o.slug === SLUG);
    expect(option).toBeDefined();

    const match = roleMatchForScenario(option!, "machine-learning");
    expect(match.allowed).toBe(true);
    expect(match.family).toBe("machine-learning");

    for (const role of ["backend", "fullstack", "frontend"] as const) {
      expect(roleMatchForScenario(option!, role).allowed).toBe(false);
    }
  });

  it("loads by slug with the full public Medium ML metadata contract", async () => {
    const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
    expect(loaded.scenario.visibility).toBe("public");
    expect(loaded.scenario.type).toBe("machine-learning");
    expect(loaded.scenario.difficulty).toBe("medium");
    expect(loaded.scenario.execution?.mode).toBe("python-ml");
    expect(loaded.scenario.verification?.mode).toBe("python-step");
    expect(loaded.scenario.execution?.artifacts?.metrics?.required).toBe(true);
    expect(loaded.scenario.execution?.artifacts?.metrics?.requiredPaths).toEqual(
      expect.arrayContaining(["/summary/f1", "/summary/roc_auc", "/cross_validation/mean", "/confusion_matrix"]),
    );
    expect(loaded.entry).toBe("main.py");
    expect(loaded.files.map((f) => f.path).sort()).toEqual([
      "data/test.csv",
      "data/train.csv",
      "main.py",
      "src/defect_pipeline.py",
    ]);
    // No functionName anywhere — ML steps are script-based.
    for (const step of loaded.scenario.steps) {
      expect(step.verify.harness).toBe("python");
      expect(step.verify.functionName).toBeUndefined();
    }
    expect(loaded.scenario.steps).toHaveLength(3);
    expect(loaded.scenario.steps.reduce((total, s) => total + s.weight, 0)).toBe(100);
    expect(loaded.scenario.rubric.reduce((total, r) => total + r.weight, 0)).toBe(100);
  });

  it("Data Preview lists train.csv and test.csv, and never exposes tests/ or solution/", async () => {
    const loaded = await loadScenario(SLUG, { includeAuthorOnly: false });
    expect(mlDataFilesOf(loaded)).toEqual(["data/test.csv", "data/train.csv"]);
    expect(loaded.files.some((f) => f.path.startsWith("tests/"))).toBe(false);
    expect(loaded.files.some((f) => f.path.startsWith("solution/"))).toBe(false);
  });

  it(
    "every step checkpoint passes its cumulative step verification, and the final checkpoint passes final validation (including the metrics contract), through the production verification path",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
      expect(loaded.scenario.steps).toHaveLength(3);

      let lastSession: WorkspaceSession | undefined;
      for (const step of loaded.scenario.steps) {
        const checkpointFiles = await checkpointSource.resolve(SLUG, step.id);
        const session = applyCheckpoint(loaded.files, loaded.entry, checkpointFiles);
        lastSession = session;

        const result = await verifyStepOnServer({
          scenarioSlug: SLUG,
          step: {
            id: step.id,
            harness: step.verify.harness,
            functionName: step.verify.functionName,
            tests: step.verify.tests,
            timeoutMs: step.verify.timeoutMs,
          },
          files: snapshot(session.files),
        });

        expect(result.mode).toBe("python-step");
        expect(result.status).toBe("passed");
        expect(result.passed).toBe(true);
        expect(result.groups?.find((g) => g.name === "python")?.ok).toBe(true);
      }

      const finalResult = await verifyFinalOnServer({
        scenarioSlug: SLUG,
        files: snapshot(lastSession!.files),
      });
      expect(finalResult.mode).toBe("python-final");
      expect(finalResult.status).toBe("passed");
      expect(finalResult.passed).toBe(true);
      const metricsGroup = finalResult.groups?.find((g) => g.name === "metrics");
      expect(metricsGroup?.ok).toBe(true);
    },
    180_000,
  );

  it(
    "an incomplete (starter) workspace fails step 1 cleanly instead of crashing the verification service",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
      const step1 = loaded.scenario.steps[0]!;

      const result = await verifyStepOnServer({
        scenarioSlug: SLUG,
        step: {
          id: step1.id,
          harness: step1.verify.harness,
          functionName: step1.verify.functionName,
          tests: step1.verify.tests,
          timeoutMs: step1.verify.timeoutMs,
        },
        files: snapshot(loaded.files), // unmodified starter workspace
      });

      expect(result.status).toBe("failed");
      expect(result.groups?.find((g) => g.name === "python")?.ok).toBe(false);
    },
    30_000,
  );

  it(
    "final verification on an incomplete (starter) workspace fails normally — no sandbox error, no host paths in the reason",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });

      const result = await verifyFinalOnServer({
        scenarioSlug: SLUG,
        files: snapshot(loaded.files), // unmodified starter workspace
      });

      expect(result.status).toBe("failed");
      expect(result.passed).toBe(false);
      const pythonGroup = result.groups?.find((g) => g.name === "python");
      expect(pythonGroup?.ok).toBe(false);
      const allReasons = (result.groups ?? []).map((g) => g.reason ?? "").join(" ");
      expect(allReasons).not.toContain("C:\\");
      expect(allReasons).not.toContain(process.cwd());
      expect(allReasons).not.toContain("tests/step-1.test.py".replace("/", "\\"));
    },
    60_000,
  );

  it(
    "final verification FAILS with a safe structured reason when main.py never writes metrics.json",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps[2]!;
      const checkpointFiles = await checkpointSource.resolve(SLUG, step3.id);
      const session = applyCheckpoint(loaded.files, loaded.entry, checkpointFiles);

      const brokenMain = [
        "from pathlib import Path",
        "from src.defect_pipeline import load_test_data, load_training_data",
        "DATA_DIR = Path(__file__).parent / 'data'",
        "def main():",
        "    load_training_data(str(DATA_DIR / 'train.csv'))",
        "    load_test_data(str(DATA_DIR / 'test.csv'))",
        "    print('no metrics.json written')",
        "if __name__ == '__main__':",
        "    main()",
        "",
      ].join("\n");

      const files = snapshot(session.files).map((f) => (f.path === "main.py" ? { ...f, content: brokenMain } : f));

      const result = await verifyFinalOnServer({ scenarioSlug: SLUG, files });

      expect(result.status).toBe("failed");
      const metricsGroup = result.groups?.find((g) => g.name === "metrics");
      expect(metricsGroup?.ok).toBe(false);
      expect(metricsGroup?.reason).toContain("was not found");
      expect(metricsGroup?.reason ?? "").not.toContain("C:\\");
      expect(metricsGroup?.reason ?? "").not.toContain(process.cwd());
    },
    60_000,
  );

  it(
    "final verification FAILS with a safe structured reason when main.py writes malformed metrics.json",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps[2]!;
      const checkpointFiles = await checkpointSource.resolve(SLUG, step3.id);
      const session = applyCheckpoint(loaded.files, loaded.entry, checkpointFiles);

      const brokenMain = [
        "from pathlib import Path",
        "DATA_DIR = Path(__file__).parent / 'data'",
        "def main():",
        "    with open('metrics.json', 'w') as f:",
        "        f.write('{not valid json')",
        "if __name__ == '__main__':",
        "    main()",
        "",
      ].join("\n");

      const files = snapshot(session.files).map((f) => (f.path === "main.py" ? { ...f, content: brokenMain } : f));

      const result = await verifyFinalOnServer({ scenarioSlug: SLUG, files });

      expect(result.status).toBe("failed");
      const metricsGroup = result.groups?.find((g) => g.name === "metrics");
      expect(metricsGroup?.ok).toBe(false);
      expect(metricsGroup?.reason).toContain("not valid JSON");
    },
    60_000,
  );

  it(
    "Output Preview: running main.py on the step-3 (final) checkpoint shows predictions, structured metrics, and report artifacts",
    async () => {
      const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps[2]!;
      const checkpointFiles = await checkpointSource.resolve(SLUG, step3.id);
      const session = applyCheckpoint(loaded.files, loaded.entry, checkpointFiles);

      const preview = await previewMlScript({ scenarioSlug: SLUG, files: session.files });

      expect(preview.ok).toBe(true);
      expect(preview.command).toBe("python main.py");
      expect(preview.stdout).toContain("Loaded training rows: 600");
      expect(preview.stdout).toContain("Loaded test rows: 150");
      expect(preview.stdout).toContain("Saved predictions.csv.");
      expect(preview.stdout).toContain("Saved metrics.json.");
      expect(preview.stdout).toContain("Saved report.txt.");
      expect(preview.artifacts).toHaveLength(3);

      const predictions = preview.artifacts.find((a) => a.path === "predictions.csv");
      expect(predictions).toBeDefined();
      expect(predictions!.kind).toBe("csv");
      expect(predictions!.preview?.columns).toEqual(["component_id", "predicted_defect", "defect_probability"]);
      expect(predictions!.preview?.rows).toHaveLength(5); // 150 test rows, capped at 5
      expect(predictions!.preview?.truncated).toBe(true);
      for (const row of predictions!.preview?.rows ?? []) {
        expect(["0", "1"]).toContain(String(row.predicted_defect));
        const probability = Number(row.defect_probability);
        expect(probability).toBeGreaterThanOrEqual(0);
        expect(probability).toBeLessThanOrEqual(1);
      }

      const metrics = preview.artifacts.find((a) => a.path === "metrics.json");
      expect(metrics).toBeDefined();
      expect(metrics!.kind).toBe("json");
      const metricsData = JSON.parse(metrics!.preview!.text!) as {
        summary: { f1: number; roc_auc: number };
        cross_validation: { fold_scores: number[] };
        confusion_matrix: number[][];
        dataset: { training_rows: number; test_rows: number; positive_rate: number };
        model: { name: string };
      };
      expect(metricsData.summary.f1).toBeGreaterThanOrEqual(0);
      expect(metricsData.summary.f1).toBeLessThanOrEqual(1);
      expect(metricsData.summary.roc_auc).toBeGreaterThanOrEqual(0.75);
      expect(Array.isArray(metricsData.cross_validation.fold_scores)).toBe(true);
      expect(metricsData.cross_validation.fold_scores).toHaveLength(5);
      expect(Array.isArray(metricsData.confusion_matrix)).toBe(true);
      expect(metricsData.confusion_matrix).toHaveLength(2);
      expect(metricsData.dataset.training_rows).toBe(600);
      expect(metricsData.dataset.test_rows).toBe(150);
      expect(metricsData.dataset.positive_rate).toBeGreaterThan(0.1);
      expect(metricsData.dataset.positive_rate).toBeLessThan(0.3);
      expect(metricsData.model.name).toBe("LogisticRegression");

      const report = preview.artifacts.find((a) => a.path === "report.txt");
      expect(report).toBeDefined();
      expect(report!.kind).toBe("text");
      expect(report!.preview?.text).toContain("Manufacturing Defect Classifier Report");
      expect(report!.preview?.text).toContain("Training rows: 600");
      expect(report!.preview?.text).toContain("Test rows: 150");
    },
    30_000,
  );

  it(
    "Output Preview on an incomplete workspace fails cleanly and never affects step verification state",
    async () => {
      const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
      const preview = await previewMlScript({ scenarioSlug: SLUG, files: loaded.files });

      expect(preview.ok).toBe(false);
      expect(preview.stderr).toContain("NotImplementedError");
      expect(preview.artifacts).toEqual([]); // no predictions.csv was generated

      expect(preview).not.toHaveProperty("status");
      expect(preview).not.toHaveProperty("passed");
    },
    30_000,
  );
});
