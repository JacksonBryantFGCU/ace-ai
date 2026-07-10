"use client";

import { AlertTriangle, BarChart3, FileText, Loader2, Play, Terminal } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { shell } from "@/components/scenario/shell/tokens";
import type { MlPreviewArtifact, MlScriptPreviewResult } from "@/lib/scenarios/machine-learning-preview";
import type { JsonValue, MachineLearningMetrics } from "@/lib/scenarios/machine-learning-metrics";

const SECTION_LABEL = "text-[11px] font-semibold uppercase tracking-[0.13em]";

/**
 * The right-side preview panel for machine-learning scenarios — a notebook-style
 * run of `main.py`. Replaces the generic Browser/API/Fullstack `PreviewPanel` for
 * ML (see `getPreviewPanelKind` in `lib/scenarios/verification-mode.ts`); ML never
 * renders that panel's chrome or labels.
 *
 * This is PREVIEW, not verification: it never touches step pass/fail or gating
 * (see `useMlPreview` / `runMlPreviewScriptForSession` in
 * `use-interview-controller.ts`, which call this independently of `pytest`).
 *
 * `metrics.json` and `report.txt` get dedicated, nicer sections; every other
 * generated file (predictions.csv, outputs/*) shows in "Generated Files".
 */
export function MlNotebookPreviewPanel({
  running,
  result,
  onRun,
}: {
  running: boolean;
  result: MlScriptPreviewResult | null;
  onRun: () => void;
}) {
  const metricsArtifact = result?.artifacts.find((a) => a.path === "metrics.json");
  const reportArtifact = result?.artifacts.find((a) => a.path === "report.txt");
  const otherArtifacts = result?.artifacts.filter((a) => a !== metricsArtifact && a !== reportArtifact) ?? [];

  return (
    <div
      className="flex w-[360px] max-w-[38vw] flex-none flex-col"
      style={{ background: shell.panelBg, borderLeft: `1px solid ${shell.border}` }}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: shell.borderSoft }}>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: shell.text }}>
            Notebook Preview
          </p>
          <p className="truncate text-[11px]" style={{ color: shell.textFainter }}>
            Python script output
          </p>
        </div>
        {result ? (
          <div className="ml-auto shrink-0">
            <StatusBadge tone={result.ok ? "success" : "danger"}>
              {result.timedOut ? "Timed out" : result.ok ? "Script completed." : "Script failed."}
            </StatusBadge>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div>
          <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
            Python Script
          </span>
          <button
            type="button"
            onClick={onRun}
            disabled={running}
            className="flex w-full items-center justify-center gap-2 rounded-[9px] p-[9px] text-[13px] font-semibold text-white transition-colors hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: shell.nextBg }}
          >
            {running ? <Loader2 className="size-[15px] animate-spin" /> : <Play className="size-[15px] fill-current" />}
            {running ? "Running main.py..." : "Run Python Script"}
          </button>
        </div>

        {!result && !running ? (
          <EmptyPanel
            icon={<Terminal className="size-4" />}
            message="Run main.py to preview script output, metrics, and generated files."
          />
        ) : null}

        {result ? (
          <>
            <div>
              <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
                Run Output
              </span>
              <div
                className="flex flex-col gap-2 rounded-[9px] p-3"
                style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${shell.borderSoft}` }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px]" style={{ color: shell.textFainter }}>
                    exit code: {result.exitCode ?? "n/a"}
                  </span>
                  <span className="text-[11px]" style={{ color: shell.textFainter }}>
                    {result.durationMs} ms
                  </span>
                </div>
                {result.timedOut ? (
                  <p className="text-xs" style={{ color: "#fca5a5" }}>
                    Script timed out.
                  </p>
                ) : null}

                {result.stdout ? <OutputBlock label="stdout" content={result.stdout} /> : null}
                {result.stderr ? <OutputBlock label="stderr" content={result.stderr} tone="error" /> : null}
                {!result.stdout && !result.stderr ? (
                  <p className="text-xs" style={{ color: shell.textFainter }}>
                    Script produced no output.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
                Metrics
              </span>
              {!metricsArtifact ? (
                <EmptyPanel icon={<BarChart3 className="size-4" />} message="No metrics file generated yet." />
              ) : metricsArtifact.previewTooLarge ? (
                <EmptyPanel icon={<BarChart3 className="size-4" />} message="Preview too large." />
              ) : metricsArtifact.parsedMetrics ? (
                <MetricsGrid metrics={metricsArtifact.parsedMetrics} />
              ) : (
                <div className="flex flex-col gap-2">
                  <EmptyPanel
                    icon={<AlertTriangle className="size-4" />}
                    message={
                      metricsArtifact.metricsError
                        ? `metrics.json is invalid: ${metricsArtifact.metricsError.message}`
                        : "metrics.json could not be parsed."
                    }
                  />
                  <OutputBlock label="metrics.json (raw)" content={metricsArtifact.preview?.text ?? ""} />
                </div>
              )}
            </div>

            {reportArtifact ? (
              <div>
                <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
                  Report
                </span>
                {reportArtifact.previewTooLarge ? (
                  <EmptyPanel icon={<FileText className="size-4" />} message="Preview too large." />
                ) : (
                  <OutputBlock label="report.txt" content={reportArtifact.preview?.text ?? ""} />
                )}
              </div>
            ) : null}

            <div>
              <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
                Generated Files
              </span>
              {result.artifacts.length === 0 ? (
                <EmptyPanel
                  icon={<FileText className="size-4" />}
                  message="No generated files detected. Scripts can write predictions.csv, metrics.json, or report.txt to preview outputs here."
                />
              ) : otherArtifacts.length === 0 ? (
                <p className="text-xs" style={{ color: shell.textFainter }}>
                  metrics.json and report.txt are shown above.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {otherArtifacts.map((artifact) => (
                    <ArtifactCard key={artifact.path} artifact={artifact} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function OutputBlock({ label, content, tone = "default" }: { label: string; content: string; tone?: "default" | "error" }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-semibold tracking-wide uppercase" style={{ color: shell.textFainter }}>
        {label}
      </p>
      <pre
        className="max-h-40 overflow-auto rounded bg-black/30 p-2 font-mono text-[11px] whitespace-pre-wrap"
        style={{ color: tone === "error" ? "#fca5a5" : "#c4cad3" }}
      >
        {content}
      </pre>
    </div>
  );
}

function formatMetricValue(value: unknown): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(4);
  if (value === null) return "null";
  return String(value);
}

function isPrimitive(value: JsonValue): value is Exclude<JsonValue, unknown[] | { [k: string]: JsonValue }> {
  return value === null || typeof value !== "object";
}

/** A 2D array of finite numbers only — e.g. a confusion matrix — rendered as
 *  a table. Generic structural detection, not tied to any specific metric
 *  name/scenario. */
function isNumericMatrix(value: JsonValue): value is number[][] {
  return Array.isArray(value) && value.length > 0 && value.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "number"));
}

const MAX_RENDERED_ARRAY_ITEMS = 20;
const MAX_RENDERED_OBJECT_KEYS = 30;

/**
 * `metrics` (and every value reachable from it) is already validated and
 * bounded by `parseMachineLearningMetrics` (max depth 8, max 5,000 total
 * nodes) before it ever reaches this component — so a plain recursive React
 * tree is safe here; the adversarial-input guard already ran in the parser,
 * not in render. This renders top-level PRIMITIVE metrics as the original
 * compact card grid, and top-level structured (object/array) metrics as
 * expandable `<details>` sections — native keyboard/screen-reader support,
 * no custom widget needed. Numeric matrices render as a table; large
 * arrays/objects are truncated (never thousands of DOM nodes); nothing here
 * uses `dangerouslySetInnerHTML`.
 */
function MetricsGrid({ metrics }: { metrics: MachineLearningMetrics }) {
  const entries = Object.entries(metrics);
  const primitiveEntries = entries.filter(([, value]) => isPrimitive(value));
  const structuredEntries = entries.filter(([, value]) => !isPrimitive(value));

  return (
    <div className="flex flex-col gap-2">
      {primitiveEntries.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {primitiveEntries.map(([key, value]) => (
            <div
              key={key}
              className="rounded-[9px] p-2.5"
              style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${shell.borderSoft}` }}
            >
              <p className="text-[10px] uppercase" style={{ color: shell.textFainter }}>
                {key}
              </p>
              <p className="mt-0.5 font-mono text-[13px]" style={{ color: shell.text }}>
                {formatMetricValue(value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {structuredEntries.map(([key, value]) => (
        <details
          key={key}
          className="rounded-[9px] p-2.5"
          style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${shell.borderSoft}` }}
        >
          <summary
            className="cursor-pointer text-[10px] font-semibold uppercase focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
            style={{ color: shell.textFainter }}
          >
            {key} <span style={{ color: shell.textFaint }}>({Array.isArray(value) ? `array, ${value.length} items` : "object"})</span>
          </summary>
          <div className="mt-2">
            <JsonTree value={value} />
          </div>
        </details>
      ))}
    </div>
  );
}

/** Renders one JSON value: a numeric matrix as a table, an array as a
 *  bounded list of `JsonTree` items, an object as a bounded list of
 *  key/`JsonTree` pairs, and a primitive as formatted text. */
function JsonTree({ value }: { value: JsonValue }) {
  if (isPrimitive(value)) {
    return (
      <span className="font-mono text-[12px]" style={{ color: shell.text }}>
        {formatMetricValue(value)}
      </span>
    );
  }

  if (isNumericMatrix(value)) {
    return (
      <div className="overflow-x-auto rounded-[7px]" style={{ border: `1px solid ${shell.borderSoft}` }}>
        <table className="border-collapse text-left font-mono text-[11px]">
          <tbody>
            {value.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-2 py-1 text-right whitespace-nowrap"
                    style={{ color: shell.textMuted, borderBottom: `1px solid ${shell.borderFaint}` }}
                  >
                    {formatMetricValue(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (Array.isArray(value)) {
    const shown = value.slice(0, MAX_RENDERED_ARRAY_ITEMS);
    return (
      <ol className="flex flex-col gap-1 pl-4" style={{ listStyleType: "decimal" }}>
        {shown.map((item, i) => (
          <li key={i} className="text-[11px]">
            <JsonTree value={item} />
          </li>
        ))}
        {value.length > MAX_RENDERED_ARRAY_ITEMS ? (
          <li className="text-[11px]" style={{ color: shell.textFainter }}>
            …{value.length - MAX_RENDERED_ARRAY_ITEMS} more items not shown.
          </li>
        ) : null}
      </ol>
    );
  }

  // Plain object.
  const entries = Object.entries(value);
  const shown = entries.slice(0, MAX_RENDERED_OBJECT_KEYS);
  return (
    <dl className="flex flex-col gap-1.5">
      {shown.map(([key, child]) => (
        <div key={key} className="flex flex-col gap-0.5">
          <dt className="text-[10px] uppercase" style={{ color: shell.textFainter }}>
            {key}
          </dt>
          <dd className="pl-2">
            <JsonTree value={child} />
          </dd>
        </div>
      ))}
      {entries.length > MAX_RENDERED_OBJECT_KEYS ? (
        <p className="text-[11px]" style={{ color: shell.textFainter }}>
          …{entries.length - MAX_RENDERED_OBJECT_KEYS} more keys not shown.
        </p>
      ) : null}
    </dl>
  );
}

/** Pretty-print a JSON artifact's raw text; falls back to the raw text if it
 *  doesn't parse (a malformed JSON file should still be previewable). */
function formatJsonText(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function ArtifactCard({ artifact }: { artifact: MlPreviewArtifact }) {
  return (
    <div className="rounded-[9px] p-2.5" style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${shell.borderSoft}` }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[12px]" style={{ color: shell.text }}>
          {artifact.name}
        </span>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase" style={{ color: shell.textFainter }}>
          {artifact.kind}
        </span>
        <span className="ml-auto text-[11px]" style={{ color: shell.textFainter }}>
          {formatBytes(artifact.sizeBytes)}
        </span>
      </div>

      {artifact.previewTooLarge ? (
        <p className="mt-2 text-xs" style={{ color: shell.textFainter }}>
          Preview too large.
        </p>
      ) : artifact.kind === "csv" && artifact.preview?.columns ? (
        <div className="mt-2 overflow-x-auto rounded-[7px]" style={{ border: `1px solid ${shell.borderSoft}` }}>
          <table className="w-full border-collapse text-left font-mono text-[11px]">
            <thead>
              <tr style={{ background: "rgba(255,255,255,.04)" }}>
                {artifact.preview.columns.map((column) => (
                  <th
                    key={column}
                    className="px-2 py-1 font-semibold whitespace-nowrap"
                    style={{ color: shell.text, borderBottom: `1px solid ${shell.borderSoft}` }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(artifact.preview.rows ?? []).map((row, i) => (
                <tr key={i}>
                  {artifact.preview!.columns!.map((column) => (
                    <td
                      key={column}
                      className="px-2 py-1 whitespace-nowrap"
                      style={{ color: shell.textMuted, borderBottom: `1px solid ${shell.borderFaint}` }}
                    >
                      {row[column] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {artifact.preview.truncated ? (
            <p className="px-2 py-1 text-[10.5px]" style={{ color: shell.textFainter }}>
              Showing the first {artifact.preview.rows?.length ?? 0} rows only.
            </p>
          ) : null}
        </div>
      ) : artifact.kind === "json" && artifact.preview?.text !== undefined ? (
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/30 p-2 font-mono text-[11px] whitespace-pre-wrap" style={{ color: shell.text }}>
          {formatJsonText(artifact.preview.text)}
          {artifact.preview.truncated ? "\n…" : ""}
        </pre>
      ) : artifact.preview?.text !== undefined ? (
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/30 p-2 font-mono text-[11px] whitespace-pre-wrap" style={{ color: shell.text }}>
          {artifact.preview.text}
          {artifact.preview.truncated ? "\n…" : ""}
        </pre>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EmptyPanel({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-[9px] px-3 py-3 text-[12.5px]"
      style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${shell.borderSoft}`, color: shell.textFainter }}
    >
      {icon}
      {message}
    </div>
  );
}
