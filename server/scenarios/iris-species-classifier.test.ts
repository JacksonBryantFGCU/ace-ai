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
import type { LoadedScenario, WorkspaceSession } from "@/lib/scenarios/types";
import type { SnapshotFile } from "@/lib/scenarios/verification";

/**
 * The first PUBLIC Machine Learning scenario (Easy) — proves ML authoring,
 * workspace loading, Data Preview, step/final verification, the notebook-style
 * Output Preview, and the public ML picker end to end, all on real content
 * (mirrors `server/scenarios/customer-churn-classifier.test.ts`, the internal
 * ML reference, but asserts PUBLIC visibility/picker inclusion instead of
 * internal exclusion).
 */
const SLUG = "iris-species-classifier";

function snapshot(files: readonly { path: string; content: string; role: string }[]): SnapshotFile[] {
  return files.map((file) => ({ path: file.path, content: file.content, role: file.role as SnapshotFile["role"] }));
}

// Probed once (not at module-load time) so the pytest-dependent tests are
// cleanly SKIPPED — not silently no-op'd — when this environment has no
// pytest installed. Mirrors server/scenarios/machine-learning-runtime.test.ts.
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

describe("iris-species-classifier (public Easy ML scenario)", () => {
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
    60_000,
  );

  it("is public: included in every public listing, unlike the internal ML reference", async () => {
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

    // Internal ML/backend/fullstack reference fixtures stay hidden regardless.
    expect(options.some((s) => s.slug === "customer-churn-classifier")).toBe(false);
    expect(options.some((s) => s.slug === "customer-feedback-dashboard")).toBe(false);
    expect(options.some((s) => s.slug === "golden-health-check")).toBe(false);
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

  it("loads by slug with the full public ML metadata contract", async () => {
    const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
    expect(loaded.scenario.visibility).toBe("public");
    expect(loaded.scenario.type).toBe("machine-learning");
    expect(loaded.scenario.difficulty).toBe("easy");
    expect(loaded.scenario.execution?.mode).toBe("python-ml");
    expect(loaded.scenario.verification?.mode).toBe("python-step");
    expect(loaded.entry).toBe("main.py");
    expect(loaded.files.map((f) => f.path).sort()).toEqual([
      "data/test.csv",
      "data/train.csv",
      "main.py",
      "src/iris_pipeline.py",
    ]);
    // No functionName anywhere — ML steps are script-based.
    for (const step of loaded.scenario.steps) {
      expect(step.verify.harness).toBe("python");
      expect(step.verify.functionName).toBeUndefined();
    }
  });

  it("Data Preview lists train.csv and test.csv, and never exposes tests/ or solution/", async () => {
    const loaded = await loadScenario(SLUG, { includeAuthorOnly: false });
    expect(mlDataFilesOf(loaded)).toEqual(["data/test.csv", "data/train.csv"]);
    expect(loaded.files.some((f) => f.path.startsWith("tests/"))).toBe(false);
    expect(loaded.files.some((f) => f.path.startsWith("solution/"))).toBe(false);
  });

  it(
    "every step checkpoint passes its cumulative step verification, and the final checkpoint passes final validation, through the production verification path",
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
        // Part 6 of the ML preview UX work: no skipped "metrics" group anywhere.
        expect(result.groups?.some((g) => g.name === "metrics")).toBe(false);
      }

      const finalResult = await verifyFinalOnServer({
        scenarioSlug: SLUG,
        files: snapshot(lastSession!.files),
      });
      expect(finalResult.mode).toBe("python-final");
      expect(finalResult.status).toBe("passed");
      expect(finalResult.passed).toBe(true);
    },
    60_000,
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
    "Output Preview: running main.py on the step-3 (final) checkpoint shows predictions, metrics, and report artifacts",
    async () => {
      const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps[2]!;
      const checkpointFiles = await checkpointSource.resolve(SLUG, step3.id);
      const session = applyCheckpoint(loaded.files, loaded.entry, checkpointFiles);

      const preview = await previewMlScript({ scenarioSlug: SLUG, files: session.files });

      expect(preview.ok).toBe(true);
      expect(preview.command).toBe("python main.py");
      expect(preview.stdout).toContain("Loaded training rows: 75");
      expect(preview.stdout).toContain("Loaded test rows: 20");
      expect(preview.stdout).toContain("Prepared 4 model-ready feature columns.");
      expect(preview.stdout).toContain("Saved predictions.csv.");
      expect(preview.stdout).toContain("Saved metrics.json.");
      expect(preview.stdout).toContain("Saved report.txt.");
      expect(preview.artifacts).toHaveLength(3);

      const predictions = preview.artifacts.find((a) => a.path === "predictions.csv");
      expect(predictions).toBeDefined();
      expect(predictions!.kind).toBe("csv");
      expect(predictions!.preview?.columns).toEqual(["sample_id", "predicted_species"]);
      expect(predictions!.preview?.rows).toHaveLength(5); // 20 test rows, capped at 5
      expect(predictions!.preview?.truncated).toBe(true);
      const validSpecies = ["setosa", "versicolor", "virginica"];
      for (const row of predictions!.preview?.rows ?? []) {
        expect(validSpecies).toContain(row.predicted_species);
      }

      const metrics = preview.artifacts.find((a) => a.path === "metrics.json");
      expect(metrics).toBeDefined();
      expect(metrics!.kind).toBe("json");
      const metricsData = JSON.parse(metrics!.preview!.text!) as Record<string, unknown>;
      expect(metricsData).toMatchObject({ train_rows: 75, test_rows: 20, model: "DecisionTreeClassifier" });
      expect(metricsData.accuracy as number).toBeGreaterThanOrEqual(0.85);

      const report = preview.artifacts.find((a) => a.path === "report.txt");
      expect(report).toBeDefined();
      expect(report!.kind).toBe("text");
      expect(report!.preview?.text).toContain("Iris Species Classifier Report");
      expect(report!.preview?.text).toContain("Training rows: 75");
      expect(report!.preview?.text).toContain("Test rows: 20");
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

      // A preview run is not verification: it never runs pytest, and this
      // assertion is really about the contract — previewMlScript has no step
      // index, no gating, and returns a value structurally unrelated to
      // VerificationResult (no `status`/`passed`/`groups`).
      expect(preview).not.toHaveProperty("status");
      expect(preview).not.toHaveProperty("passed");
    },
    30_000,
  );
});
