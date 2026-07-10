import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MlNotebookPreviewPanel } from "@/components/scenario/preview/ml-notebook-preview-panel";
import type { MlScriptPreviewResult } from "@/lib/scenarios/machine-learning-preview";

describe("MlNotebookPreviewPanel", () => {
  it("shows the empty state before the first run, with no browser/API/fullstack labels", () => {
    const html = renderToStaticMarkup(
      createElement(MlNotebookPreviewPanel, { running: false, result: null, onRun: () => {} }),
    );
    expect(html).toContain("Notebook Preview");
    expect(html).toContain("Run Python Script");
    expect(html).toContain("Run main.py to preview script output, metrics, and generated files.");
    expect(html).not.toContain("API preview");
    expect(html).not.toContain("Frontend preview");
    expect(html).not.toContain("Browser preview");
    expect(html).not.toContain("Fullstack Preview");
    expect(html).not.toContain("Postman");
  });

  it("shows the running state", () => {
    const html = renderToStaticMarkup(
      createElement(MlNotebookPreviewPanel, { running: true, result: null, onRun: () => {} }),
    );
    expect(html).toContain("Running main.py...");
  });

  it("renders stdout and generated CSV artifacts on success", () => {
    const result: MlScriptPreviewResult = {
      ok: true,
      scenarioSlug: "customer-churn-classifier",
      command: "python main.py",
      exitCode: 0,
      stdout: "Loaded 60 training rows and 15 test rows.\nWrote 15 predictions to predictions.csv",
      stderr: "",
      durationMs: 812,
      timedOut: false,
      artifacts: [
        {
          path: "predictions.csv",
          name: "predictions.csv",
          kind: "csv",
          sizeBytes: 240,
          preview: {
            columns: ["customer_id", "churn_prediction"],
            rows: [
              { customer_id: "CUST-160", churn_prediction: "0" },
              { customer_id: "CUST-161", churn_prediction: "1" },
            ],
            truncated: true,
          },
        },
      ],
    };

    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));

    expect(html).toContain("Script completed.");
    expect(html).toContain("Loaded 60 training rows and 15 test rows.");
    expect(html).toContain("predictions.csv");
    expect(html).toContain("customer_id");
    expect(html).toContain("churn_prediction");
    expect(html).toContain("CUST-160");
    expect(html).toContain("Showing the first 2 rows only.");
  });

  it("shows failure status and stderr, and stdout if present, on a failed run", () => {
    const result: MlScriptPreviewResult = {
      ok: false,
      scenarioSlug: "customer-churn-classifier",
      command: "python main.py",
      exitCode: 1,
      stdout: "Loaded 60 training rows and 15 test rows.",
      stderr: "NotImplementedError: predict_churn is not implemented yet",
      durationMs: 120,
      timedOut: false,
      artifacts: [],
    };

    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));

    expect(html).toContain("Script failed.");
    expect(html).toContain("NotImplementedError");
    expect(html).toContain("Loaded 60 training rows and 15 test rows.");
    expect(html).toContain(
      "No generated files detected. Scripts can write predictions.csv, metrics.json, or report.txt to preview outputs here.",
    );
    expect(html).toContain("No metrics file generated yet.");
  });

  it("shows a timed-out run clearly", () => {
    const result: MlScriptPreviewResult = {
      ok: false,
      scenarioSlug: "ml-fixture",
      command: "python main.py",
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 15000,
      timedOut: true,
      artifacts: [],
    };

    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));
    expect(html).toContain("Timed out");
  });

  it("renders metrics.json as a readable metrics grid using the pre-validated parsedMetrics field", () => {
    const metricsText = JSON.stringify({ accuracy: 0.83, f1: 0.81, train_rows: 60, test_rows: 15, model: "LogisticRegression" });
    const result: MlScriptPreviewResult = {
      ok: true,
      scenarioSlug: "customer-churn-classifier",
      command: "python main.py",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 500,
      timedOut: false,
      artifacts: [
        {
          path: "metrics.json",
          name: "metrics.json",
          kind: "json",
          sizeBytes: 90,
          preview: { text: metricsText },
          // As populated by the real pipeline via parseMachineLearningMetrics
          // (lib/scenarios/machine-learning-preview.ts) — the panel renders
          // straight from this validated object, no re-parsing in the UI.
          parsedMetrics: { accuracy: 0.83, f1: 0.81, train_rows: 60, test_rows: 15, model: "LogisticRegression" },
        },
      ],
    };

    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));

    expect(html).toContain("accuracy");
    expect(html).toContain("0.83");
    expect(html).toContain("f1");
    expect(html).toContain("train_rows");
    expect(html).toContain("60");
    expect(html).toContain("model");
    expect(html).toContain("LogisticRegression");
    // metrics.json is not double-rendered in the generic "Generated Files" list.
    expect(html).toContain("metrics.json and report.txt are shown above.");
  });

  function resultWithMetrics(parsedMetrics: MlScriptPreviewResult["artifacts"][number]["parsedMetrics"]): MlScriptPreviewResult {
    return {
      ok: true,
      scenarioSlug: "ml-fixture",
      command: "python main.py",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 500,
      timedOut: false,
      artifacts: [
        {
          path: "metrics.json",
          name: "metrics.json",
          kind: "json",
          sizeBytes: 90,
          preview: { text: JSON.stringify(parsedMetrics) },
          parsedMetrics,
        },
      ],
    };
  }

  it("renders top-level primitive metrics as compact cards alongside a nested object as an expandable section", () => {
    const result = resultWithMetrics({ accuracy: 0.84, summary: { precision: 0.73, recall: 0.77 } });
    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));

    // Top-level primitive still renders as a compact card.
    expect(html).toContain("accuracy");
    expect(html).toContain("0.84");
    // Nested object renders inside an expandable <details> with a label.
    expect(html).toContain("<details");
    expect(html).toContain("summary");
    expect(html).toContain("precision");
    expect(html).toContain("0.73");
    expect(html).toContain("recall");
  });

  it("renders a 2D numeric array (confusion_matrix) as a generic table, not hardcoded to one scenario", () => {
    const result = resultWithMetrics({
      confusion_matrix: [
        [92, 8],
        [11, 39],
      ],
    });
    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));

    expect(html).toContain("<table");
    expect(html).toContain("92");
    expect(html).toContain("39");
  });

  it("renders a plain array as a list, truncated past the row cap, without rendering thousands of DOM nodes", () => {
    const bigArray = Array.from({ length: 500 }, (_, i) => i);
    const result = resultWithMetrics({ fold_scores: bigArray });
    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));

    expect(html).toContain("fold_scores");
    expect(html).toContain("more items not shown");
    // A handful of <li> for the truncated preview, not 500.
    const liCount = (html.match(/<li/g) ?? []).length;
    expect(liCount).toBeLessThan(30);
  });

  it("renders the full illustrative structured example (summary, cross_validation, confusion_matrix, per_class, model) without crashing", () => {
    const example = {
      summary: { accuracy: 0.84, precision: 0.73, recall: 0.77, f1: 0.75, roc_auc: 0.85 },
      cross_validation: { metric: "f1", fold_scores: [0.71, 0.75, 0.73, 0.78, 0.74], mean: 0.742, std: 0.023 },
      confusion_matrix: [
        [92, 8],
        [11, 39],
      ],
      per_class: {
        non_defective: { precision: 0.89, recall: 0.92, f1: 0.9, support: 100 },
        defective: { precision: 0.83, recall: 0.78, f1: 0.8, support: 50 },
      },
      model: { name: "LogisticRegression", parameters: { class_weight: "balanced", max_iter: 2000 } },
    };
    const result = resultWithMetrics(example);
    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));

    expect(html).toContain("cross_validation");
    expect(html).toContain("per_class");
    expect(html).toContain("LogisticRegression");
    expect(html).toContain("balanced");
    // No raw HTML injection anywhere in this component.
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  it("never uses dangerouslySetInnerHTML for metrics rendering", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./ml-notebook-preview-panel.tsx", import.meta.url), "utf8"),
    );
    // Checks the JSX PROP usage pattern specifically (not the bare string),
    // so a doc comment mentioning the API name by name doesn't false-positive.
    expect(source).not.toMatch(/dangerouslySetInnerHTML\s*=/);
  });

  it("shows a clear warning (never a crash, never silently valid) when metrics.json fails validation, with raw text still available", () => {
    const result: MlScriptPreviewResult = {
      ok: true,
      scenarioSlug: "customer-churn-classifier",
      command: "python main.py",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 500,
      timedOut: false,
      artifacts: [
        {
          path: "metrics.json",
          name: "metrics.json",
          kind: "json",
          sizeBytes: 20,
          preview: { text: "{not valid json" },
          metricsError: { code: "metrics/invalid-json", message: "metrics.json is not valid JSON: Unexpected end of JSON input" },
        },
      ],
    };

    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));

    expect(html).toContain("metrics.json is invalid");
    expect(html).toContain("not valid JSON");
    // Raw text is still shown as a fallback preview.
    expect(html).toContain("not valid json");
  });

  it("renders report.txt preserving line breaks", () => {
    const result: MlScriptPreviewResult = {
      ok: true,
      scenarioSlug: "customer-churn-classifier",
      command: "python main.py",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 500,
      timedOut: false,
      artifacts: [
        {
          path: "report.txt",
          name: "report.txt",
          kind: "text",
          sizeBytes: 80,
          preview: { text: "Customer Churn Classifier Report\nTraining rows: 60\nTest rows: 15" },
        },
      ],
    };

    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));

    expect(html).toContain("Customer Churn Classifier Report");
    expect(html).toContain("Training rows: 60");
    // whitespace-pre-wrap preserves the newlines from the raw text content
    expect(html).toContain("Customer Churn Classifier Report\nTraining rows: 60\nTest rows: 15");
  });

  it("shows metadata-only for an oversized artifact", () => {
    const result: MlScriptPreviewResult = {
      ok: true,
      scenarioSlug: "ml-fixture",
      command: "python main.py",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 10,
      timedOut: false,
      artifacts: [
        { path: "predictions.csv", name: "predictions.csv", kind: "csv", sizeBytes: 2_000_000, previewTooLarge: true },
      ],
    };

    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));
    expect(html).toContain("Preview too large.");
  });

  it("does not expose tests/solution/evaluation paths for any rendered artifact", () => {
    const result: MlScriptPreviewResult = {
      ok: true,
      scenarioSlug: "customer-churn-classifier",
      command: "python main.py",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 10,
      timedOut: false,
      artifacts: [
        {
          path: "predictions.csv",
          name: "predictions.csv",
          kind: "csv",
          sizeBytes: 100,
          preview: { columns: ["customer_id"], rows: [{ customer_id: "CUST-1" }] },
        },
      ],
    };

    const html = renderToStaticMarkup(createElement(MlNotebookPreviewPanel, { running: false, result, onRun: () => {} }));
    expect(html).not.toContain("tests/");
    expect(html).not.toContain("solution/");
    expect(html).not.toContain("evaluation/");
  });
});
