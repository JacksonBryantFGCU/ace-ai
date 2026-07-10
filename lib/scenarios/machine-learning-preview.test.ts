import { describe, expect, it, vi } from "vitest";
import {
  ML_PREVIEW_MAX_ARTIFACTS,
  ML_PREVIEW_MAX_FILE_SIZE_BYTES,
  ML_PREVIEW_MAX_TOTAL_BYTES,
  runMlScriptPreview,
  type MlScriptPreviewDependencies,
  type MlWorkspaceFileMeta,
} from "@/lib/scenarios/machine-learning-preview";

function deps(overrides: Partial<MlScriptPreviewDependencies> = {}) {
  const cleanedUp: string[] = [];
  const dependencies: MlScriptPreviewDependencies = {
    resolvePython: vi.fn(async () => "python"),
    prepareWorkspace: vi.fn(async () => ({ root: "/tmp/fake-preview-workspace" })),
    runProcess: vi.fn(async () => ({ exitCode: 0, stdout: "ok\n", stderr: "", durationMs: 5, timedOut: false })),
    cleanupWorkspace: vi.fn(async (dirs) => {
      cleanedUp.push(dirs.root);
    }),
    listWorkspaceFiles: vi.fn(async () => []),
    readWorkspaceFile: vi.fn(async () => ""),
    ...overrides,
  };
  return { dependencies, cleanedUp };
}

describe("runMlScriptPreview", () => {
  it("runs `python main.py` and captures stdout", async () => {
    const { dependencies } = deps({
      runProcess: vi.fn(async () => ({ exitCode: 0, stdout: "hello\n", stderr: "", durationMs: 12, timedOut: false })),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "print('hello')" } }, dependencies);
    expect(result.ok).toBe(true);
    expect(result.command).toBe("python main.py");
    expect(result.stdout).toBe("hello\n");
    expect(dependencies.runProcess).toHaveBeenCalledWith(expect.objectContaining({ args: ["main.py"] }));
  });

  it("captures stderr on a failing script and returns ok: false", async () => {
    const { dependencies } = deps({
      runProcess: vi.fn(async () => ({ exitCode: 1, stdout: "", stderr: "Traceback: boom", durationMs: 8, timedOut: false })),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } }, dependencies);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("boom");
  });

  it("returns ok: false and timedOut: true when the script times out", async () => {
    const { dependencies } = deps({
      runProcess: vi.fn(async () => ({ exitCode: null, stdout: "", stderr: "", durationMs: 15000, timedOut: true })),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } }, dependencies);
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it("does not run pytest — only the entrypoint script", async () => {
    const { dependencies } = deps();
    await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } }, dependencies);
    const call = (dependencies.runProcess as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.args).toEqual(["main.py"]);
  });

  it("cleans up the workspace after collecting artifacts", async () => {
    const { dependencies, cleanedUp } = deps();
    await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } }, dependencies);
    expect(cleanedUp).toEqual(["/tmp/fake-preview-workspace"]);
  });

  it("detects generated predictions.csv and previews its first rows", async () => {
    const files: MlWorkspaceFileMeta[] = [
      { path: "main.py", sizeBytes: 10 },
      { path: "predictions.csv", sizeBytes: 40 },
    ];
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => files),
      readWorkspaceFile: vi.fn(async (_dirs, path) => {
        if (path === "predictions.csv") return "customer_id,churn_prediction\nCUST-1,0\nCUST-2,1\n";
        return "";
      }),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } }, dependencies);
    expect(result.artifacts).toHaveLength(1);
    const artifact = result.artifacts[0]!;
    expect(artifact.path).toBe("predictions.csv");
    expect(artifact.kind).toBe("csv");
    expect(artifact.preview?.columns).toEqual(["customer_id", "churn_prediction"]);
    expect(artifact.preview?.rows).toEqual([
      { customer_id: "CUST-1", churn_prediction: "0" },
      { customer_id: "CUST-2", churn_prediction: "1" },
    ]);
  });

  it("caps CSV artifact rows at 5", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => `CUST-${i},${i % 2}`).join("\n");
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [{ path: "predictions.csv", sizeBytes: 500 }]),
      readWorkspaceFile: vi.fn(async () => `customer_id,churn_prediction\n${rows}\n`),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    expect(result.artifacts[0]!.preview?.rows).toHaveLength(5);
    expect(result.artifacts[0]!.preview?.truncated).toBe(true);
  });

  it("previews generated JSON and text files as bounded text", async () => {
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [
        { path: "metrics.json", sizeBytes: 20 },
        { path: "report.txt", sizeBytes: 10 },
      ]),
      readWorkspaceFile: vi.fn(async (_dirs, path) => (path === "metrics.json" ? '{"accuracy":0.9}' : "All good.")),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    const metrics = result.artifacts.find((a) => a.path === "metrics.json")!;
    const report = result.artifacts.find((a) => a.path === "report.txt")!;
    expect(metrics.kind).toBe("json");
    expect(metrics.preview?.text).toBe('{"accuracy":0.9}');
    expect(report.kind).toBe("text");
    expect(report.preview?.text).toBe("All good.");
  });

  it("validates metrics.json through the shared parser and returns parsedMetrics on success", async () => {
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [{ path: "metrics.json", sizeBytes: 40 }]),
      readWorkspaceFile: vi.fn(async () => '{"accuracy": 0.93, "f1": 0.8, "model": "DecisionTreeClassifier"}'),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    const metrics = result.artifacts.find((a) => a.path === "metrics.json")!;
    expect(metrics.parsedMetrics).toEqual({ accuracy: 0.93, f1: 0.8, model: "DecisionTreeClassifier" });
    expect(metrics.metricsError).toBeUndefined();
    // Raw text preview is still populated alongside the validated object.
    expect(metrics.preview?.text).toBe('{"accuracy": 0.93, "f1": 0.8, "model": "DecisionTreeClassifier"}');
  });

  it("does not crash on malformed metrics.json — returns a structured metricsError, still previewable as raw text", async () => {
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [{ path: "metrics.json", sizeBytes: 20 }]),
      readWorkspaceFile: vi.fn(async () => "{not valid json"),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    expect(result.ok).toBe(true); // a malformed OPTIONAL artifact never fails the run itself
    const metrics = result.artifacts.find((a) => a.path === "metrics.json")!;
    expect(metrics.parsedMetrics).toBeUndefined();
    expect(metrics.metricsError?.code).toBe("metrics/invalid-json");
    expect(metrics.preview?.text).toBe("{not valid json"); // raw text fallback, never silently dropped
  });

  it("parses nested metrics.json values (structured results) through the shared recursive parser", async () => {
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [{ path: "metrics.json", sizeBytes: 40 }]),
      readWorkspaceFile: vi.fn(async () => '{"confusion_matrix": [[92, 8], [11, 39]], "summary": {"f1": 0.75}}'),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    const metrics = result.artifacts.find((a) => a.path === "metrics.json")!;
    expect(metrics.metricsError).toBeUndefined();
    expect(metrics.parsedMetrics).toEqual({
      confusion_matrix: [
        [92, 8],
        [11, 39],
      ],
      summary: { f1: 0.75 },
    });
  });

  it("still rejects a structurally-invalid metrics.json (e.g. a dangerous key nested inside a structured result)", async () => {
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [{ path: "metrics.json", sizeBytes: 40 }]),
      readWorkspaceFile: vi.fn(async () => '{"summary": {"__proto__": 1}}'),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    const metrics = result.artifacts.find((a) => a.path === "metrics.json")!;
    expect(metrics.parsedMetrics).toBeUndefined();
    expect(metrics.metricsError?.code).toBe("metrics/dangerous-key");
  });

  it("marks oversized artifacts previewTooLarge without reading their content", async () => {
    const readWorkspaceFile = vi.fn(async () => "");
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [{ path: "predictions.csv", sizeBytes: ML_PREVIEW_MAX_FILE_SIZE_BYTES + 1 }]),
      readWorkspaceFile,
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    expect(result.artifacts[0]!.previewTooLarge).toBe(true);
    expect(result.artifacts[0]!.preview).toBeUndefined();
    expect(readWorkspaceFile).not.toHaveBeenCalled();
  });

  it("caps the number of returned artifacts", async () => {
    const many: MlWorkspaceFileMeta[] = Array.from({ length: 25 }, (_, i) => ({ path: `outputs/file-${i}.txt`, sizeBytes: 5 }));
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => many),
      readWorkspaceFile: vi.fn(async () => "x"),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    expect(result.artifacts).toHaveLength(ML_PREVIEW_MAX_ARTIFACTS);
  });

  it("caps the TOTAL bytes across every returned artifact, even when each file is individually under the per-file cap", async () => {
    // 3 files, each comfortably under ML_PREVIEW_MAX_FILE_SIZE_BYTES on their
    // own, but together they exceed ML_PREVIEW_MAX_TOTAL_BYTES.
    const eachSize = Math.floor(ML_PREVIEW_MAX_TOTAL_BYTES / 2) + 1;
    const files: MlWorkspaceFileMeta[] = [
      { path: "outputs/a.txt", sizeBytes: eachSize },
      { path: "outputs/b.txt", sizeBytes: eachSize },
      { path: "outputs/c.txt", sizeBytes: eachSize },
    ];
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => files),
      readWorkspaceFile: vi.fn(async () => "x"),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    // Only the first file fits within the total budget; the rest are dropped
    // entirely (not returned as previewTooLarge metadata — they're excluded
    // from the response altogether, same as never having been listed).
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]!.path).toBe("outputs/a.txt");
  });

  it("ignores files that are not on the artifact allowlist (never exposes tests/solution/other files)", async () => {
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [
        { path: "main.py", sizeBytes: 10 },
        { path: "src/churn_pipeline.py", sizeBytes: 10 },
        { path: "data/train.csv", sizeBytes: 10 },
        { path: "tests/step-1.test.py", sizeBytes: 10 },
        { path: "solution/step-1/main.py", sizeBytes: 10 },
        { path: "evaluation/rubric.json", sizeBytes: 10 },
        { path: "random-file.txt", sizeBytes: 10 },
      ]),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    expect(result.artifacts).toEqual([]);
  });

  it("still returns stdout/stderr and an empty-safe artifact list when artifact listing throws", async () => {
    const { dependencies } = deps({
      runProcess: vi.fn(async () => ({ exitCode: 0, stdout: "partial output\n", stderr: "", durationMs: 5, timedOut: false })),
      listWorkspaceFiles: vi.fn(async () => {
        throw new Error("fs exploded");
      }),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    expect(result.ok).toBe(true);
    expect(result.stdout).toBe("partial output\n");
    expect(result.artifacts).toEqual([]);
  });

  it("detects outputs/*.csv, outputs/*.json, and outputs/*.txt artifacts", async () => {
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [
        { path: "outputs/summary.csv", sizeBytes: 10 },
        { path: "outputs/scores.json", sizeBytes: 10 },
        { path: "outputs/notes.txt", sizeBytes: 10 },
      ]),
      readWorkspaceFile: vi.fn(async (_dirs, path) => {
        if (path === "outputs/summary.csv") return "a,b\n1,2\n";
        if (path === "outputs/scores.json") return '{"a":1}';
        return "hello";
      }),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    expect(result.artifacts.map((a) => a.path).sort()).toEqual([
      "outputs/notes.txt",
      "outputs/scores.json",
      "outputs/summary.csv",
    ]);
  });

  it("ignores hidden/system files even under outputs/", async () => {
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [
        { path: ".DS_Store", sizeBytes: 10 },
        { path: "outputs/.gitkeep", sizeBytes: 0 },
        { path: "outputs/.hidden.csv", sizeBytes: 10 },
      ]),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    expect(result.artifacts).toEqual([]);
  });

  it("preserves line breaks in a text (report.txt) preview", async () => {
    const { dependencies } = deps({
      listWorkspaceFiles: vi.fn(async () => [{ path: "report.txt", sizeBytes: 40 }]),
      readWorkspaceFile: vi.fn(async () => "Line one\nLine two\nLine three"),
    });
    const result = await runMlScriptPreview({ scenarioSlug: "ml-fixture", workspaceFiles: {} }, dependencies);
    expect(result.artifacts[0]!.preview?.text).toBe("Line one\nLine two\nLine three");
  });
});
