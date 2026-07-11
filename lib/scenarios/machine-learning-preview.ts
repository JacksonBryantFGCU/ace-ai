import { buildCsvPreview } from "@/lib/scenarios/machine-learning-data-preview";
import {
  DEFAULT_RUN_MAIN_TIMEOUT_MS,
  ML_DETERMINISTIC_ENV,
  redactWorkspacePath,
  type MachineLearningProcessSpec,
  type MachineLearningRuntimeDependencies,
  type MachineLearningRuntimeFile,
  type MachineLearningWorkspaceDirs,
} from "@/lib/scenarios/machine-learning-runtime";
import { ML_ENTRYPOINT } from "@/lib/scenarios/machine-learning";
import { parseMachineLearningMetrics, type MachineLearningMetrics, type StructuredMetricsError } from "@/lib/scenarios/machine-learning-metrics";

/**
 * ML "Output Preview" — notebook-style script-run preview, NOT verification.
 *
 * Runs the candidate's `main.py` once (no pytest) and reports stdout/stderr/exit
 * status plus a bounded preview of any files the script generated (predictions.csv,
 * metrics.json, report.txt, or anything under outputs/). Deliberately separate from
 * `lib/scenarios/machine-learning-step-verification.ts` — a preview run never
 * affects step pass/fail or gating.
 *
 * Reuses the SAME `MachineLearningRuntimeDependencies` shape (and, server-side, the
 * exact same `resolvePython`/`prepareWorkspace`/`runProcess`/`cleanupWorkspace`
 * implementations) as `lib/scenarios/machine-learning-runtime.ts` — no Python
 * process logic is duplicated. The only new capability is reading the workspace
 * directory back AFTER the run and BEFORE cleanup, which `runMachineLearningCommand`
 * doesn't expose (it cleans up before returning).
 */

export type MlPreviewArtifactKind = "csv" | "json" | "text" | "unknown";

export interface MlPreviewArtifact {
  path: string;
  name: string;
  kind: MlPreviewArtifactKind;
  sizeBytes: number;
  preview?: {
    columns?: string[];
    rows?: Record<string, string>[];
    text?: string;
    truncated?: boolean;
  };
  /** File exists but exceeded ML_PREVIEW_MAX_FILE_SIZE_BYTES — metadata only, no content. */
  previewTooLarge?: boolean;
  /**
   * Populated ONLY for `metrics.json`, via the shared
   * `parseMachineLearningMetrics` (`lib/scenarios/machine-learning-metrics.ts`)
   * — the same parser step/final verification and authoring validation use.
   * When present and valid, `parsedMetrics` holds the validated flat object;
   * `preview.text` (above) is still populated with the raw text either way,
   * so a malformed `metrics.json` remains previewable as text even though
   * `parsedMetrics` is absent and `metricsError` explains why.
   */
  parsedMetrics?: MachineLearningMetrics;
  /** Set instead of `parsedMetrics` when `metrics.json` fails validation — a
   *  malformed/oversized/unsafe metrics file never crashes the preview, and
   *  is never silently treated as valid. */
  metricsError?: StructuredMetricsError;
}

export interface MlScriptPreviewResult {
  ok: boolean;
  scenarioSlug: string;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  artifacts: MlPreviewArtifact[];
}

export interface MlWorkspaceFileMeta {
  path: string;
  sizeBytes: number;
}

export interface MlScriptPreviewDependencies extends MachineLearningRuntimeDependencies {
  /** List every file in the run's temp workspace, AFTER the script ran. */
  listWorkspaceFiles(dirs: MachineLearningWorkspaceDirs): Promise<MlWorkspaceFileMeta[]>;
  /** Read one file's text content by the path `listWorkspaceFiles` reported. */
  readWorkspaceFile(dirs: MachineLearningWorkspaceDirs, path: string): Promise<string>;
}

export interface MlScriptPreviewInput {
  scenarioSlug: string;
  /** Candidate + scenario data files merged by the caller (same convention as
   *  `MachineLearningRuntimeInput.workspaceFiles`). */
  workspaceFiles: Record<string, string>;
  /** Defaults to `main.py` (`ML_ENTRYPOINT`). */
  entrypoint?: string;
  timeoutMs?: number;
}

export const ML_PREVIEW_MAX_ARTIFACTS = 10;
export const ML_PREVIEW_MAX_CSV_ROWS = 5;
export const ML_PREVIEW_MAX_TEXT_CHARS = 5_000;
export const ML_PREVIEW_MAX_FILE_SIZE_BYTES = 1_000_000; // 1 MB
export const ML_PREVIEW_MAX_TOTAL_BYTES = 5_000_000; // 5 MB across every returned artifact

/** Root-level filenames candidate scripts are expected to generate. Anything
 *  under `outputs/` is also treated as a generated artifact. This allowlist
 *  (not "every new file") is what keeps preview from ever surfacing stray
 *  `__pycache__`/etc noise as an "artifact". `predictions.csv`/`forecasts.csv`
 *  cover the two primary-output-CSV names used across current scenarios
 *  (classification/regression vs. forecasting). */
const ROOT_ARTIFACT_NAMES = new Set(["predictions.csv", "forecasts.csv", "metrics.json", "report.txt"]);

/** Hidden/system files (any path segment starting with ".", e.g. `.DS_Store`,
 *  an `outputs/.gitkeep`) are never artifacts, even if otherwise allowlisted. */
function isHiddenPath(path: string): boolean {
  return path.split("/").some((segment) => segment.startsWith("."));
}

function isArtifactPath(path: string): boolean {
  if (isHiddenPath(path)) return false;
  return ROOT_ARTIFACT_NAMES.has(path) || path.startsWith("outputs/");
}

function artifactKindOf(path: string): MlPreviewArtifactKind {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "csv";
  if (ext === "json") return "json";
  if (ext === "txt" || ext === "md" || ext === "log") return "text";
  return "unknown";
}

function artifactName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

async function buildArtifact(
  deps: MlScriptPreviewDependencies,
  dirs: MachineLearningWorkspaceDirs,
  file: MlWorkspaceFileMeta,
): Promise<MlPreviewArtifact> {
  const base: MlPreviewArtifact = {
    path: file.path,
    name: artifactName(file.path),
    kind: artifactKindOf(file.path),
    sizeBytes: file.sizeBytes,
  };

  if (file.sizeBytes > ML_PREVIEW_MAX_FILE_SIZE_BYTES) {
    return { ...base, previewTooLarge: true };
  }
  if (base.kind === "unknown") {
    return base; // listed, but nothing we know how to preview
  }

  const content = await deps.readWorkspaceFile(dirs, file.path);

  if (base.kind === "csv") {
    const csv = buildCsvPreview(file.path, content, ML_PREVIEW_MAX_CSV_ROWS);
    return { ...base, preview: { columns: csv.columns, rows: csv.rows, truncated: csv.truncated } };
  }

  // metrics.json specifically gets validated through the shared parser (same
  // one step/final verification and authoring validation use) — on success
  // the caller gets a structured `parsedMetrics` object; on failure a
  // `metricsError` explains why, and the raw text below is STILL returned so
  // a malformed metrics.json remains previewable, never a crash and never a
  // silent "looks fine" for bad data.
  if (file.path === "metrics.json") {
    const result = parseMachineLearningMetrics(content);
    const truncated = content.length > ML_PREVIEW_MAX_TEXT_CHARS;
    const textPreview = truncated ? content.slice(0, ML_PREVIEW_MAX_TEXT_CHARS) : content;
    return {
      ...base,
      preview: { text: textPreview, truncated },
      ...(result.ok ? { parsedMetrics: result.metrics } : { metricsError: result.error }),
    };
  }

  // json / text — a bounded raw-text preview. JSON is not re-parsed/pretty-printed
  // here: a malformed JSON file should still be previewable as text, not crash.
  const truncated = content.length > ML_PREVIEW_MAX_TEXT_CHARS;
  return { ...base, preview: { text: truncated ? content.slice(0, ML_PREVIEW_MAX_TEXT_CHARS) : content, truncated } };
}

/** Best-effort artifact collection: a listing/read failure must never fail the
 *  whole preview run — the script's stdout/stderr/exit status is always returned. */
async function collectArtifacts(
  deps: MlScriptPreviewDependencies,
  dirs: MachineLearningWorkspaceDirs,
): Promise<MlPreviewArtifact[]> {
  try {
    const files = await deps.listWorkspaceFiles(dirs);
    const candidates = files.filter((f) => isArtifactPath(f.path)).slice(0, ML_PREVIEW_MAX_ARTIFACTS);

    // Enforce a TOTAL byte cap across every returned artifact, on top of the
    // per-file cap — a handful of files each just under the per-file limit
    // could otherwise add up to an unbounded response.
    let runningTotal = 0;
    const withinBudget: MlWorkspaceFileMeta[] = [];
    for (const file of candidates) {
      runningTotal += file.sizeBytes;
      if (runningTotal > ML_PREVIEW_MAX_TOTAL_BYTES) break;
      withinBudget.push(file);
    }

    return await Promise.all(withinBudget.map((file) => buildArtifact(deps, dirs, file)));
  } catch {
    return [];
  }
}

/**
 * Run `python main.py` in an isolated workspace and return a structured preview
 * result (stdout/stderr/exit/duration + generated-file previews). Never throws for
 * a candidate-code failure (non-zero exit, exception, timeout) — those are
 * represented in the result, exactly like `runMachineLearningCommand`.
 */
export async function runMlScriptPreview(
  input: MlScriptPreviewInput,
  deps: MlScriptPreviewDependencies,
): Promise<MlScriptPreviewResult> {
  const entrypoint = input.entrypoint ?? ML_ENTRYPOINT;
  const timeoutMs = input.timeoutMs ?? DEFAULT_RUN_MAIN_TIMEOUT_MS;
  const files: MachineLearningRuntimeFile[] = Object.entries(input.workspaceFiles).map(([path, content]) => ({
    path,
    content,
  }));

  let dirs: MachineLearningWorkspaceDirs | null = null;
  try {
    const python = await deps.resolvePython();
    dirs = await deps.prepareWorkspace(files);

    const spec: MachineLearningProcessSpec = {
      cwd: dirs.root,
      command: python,
      args: [entrypoint],
      timeoutMs,
      env: ML_DETERMINISTIC_ENV,
    };
    const result = await deps.runProcess(spec);
    const artifacts = await collectArtifacts(deps, dirs);

    return {
      ok: !result.timedOut && result.exitCode === 0,
      scenarioSlug: input.scenarioSlug,
      command: `python ${entrypoint}`,
      exitCode: result.exitCode,
      stdout: redactWorkspacePath(result.stdout, dirs.root),
      stderr: redactWorkspacePath(result.stderr, dirs.root),
      durationMs: result.durationMs,
      timedOut: result.timedOut,
      artifacts,
    };
  } finally {
    if (dirs) {
      const cleanupDirs = dirs;
      await deps.cleanupWorkspace(cleanupDirs).catch(() => {
        // Best-effort cleanup. The preview result is the actionable output.
      });
    }
  }
}
