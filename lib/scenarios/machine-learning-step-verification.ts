import { mlStepTestPath } from "@/lib/scenarios/machine-learning";
import type { MachineLearningRuntimeResult } from "@/lib/scenarios/machine-learning-runtime";
import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import {
  machineLearningMetricsMissingError,
  parseMachineLearningMetrics,
  type MachineLearningMetricTypeName,
} from "@/lib/scenarios/machine-learning-metrics";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { VerificationGroupResult, VerificationResult } from "@/lib/scenarios/verification";

/**
 * ML step verification (Phase 3) — pure orchestration over an injected
 * `MlStepVerificationDependencies`, mirroring the split used by
 * `lib/scenarios/fullstack-step-verification.ts`:
 *
 *   - THIS file selects the right `tests/step-N.test.py` files and shapes the
 *     grouped `VerificationResult` — no fs, no child_process.
 *   - `server/scenarios/machine-learning-step-verification.ts` provides the real
 *     dependency (the Phase 2 Python/pytest runtime) and loads the scenario +
 *     authored tests off disk.
 *
 * ML is script-based (`pytest` over the candidate's `main.py`), not function-call
 * based, so there is no `functionName` requirement here — see the `mlScriptStep`
 * schema exemption in `lib/scenarios/schema.ts`.
 */

export interface MlAuthoredTestFile {
  /** Authored-only `tests/` path, e.g. "tests/step-1.test.py". */
  path: string;
  content: string;
}

export interface MlStepVerificationDependencies {
  runPytest(input: {
    scenarioSlug: string;
    workspaceFiles: Record<string, string>;
    testFileContents: Record<string, string>;
    testFiles: string[];
    timeoutMs?: number;
  }): Promise<MachineLearningRuntimeResult>;
  /**
   * Optional: run the candidate's `main.py` and read back one generated
   * artifact's raw text (if it exists). Only called — and only needs to be
   * provided — when a scenario configures `execution.artifacts.metrics.
   * required: true` (see `verifyMlScenarioFinal`); every scenario without
   * that config never touches this dependency. Reuses the SAME real Output
   * Preview runtime server-side (`runMlScriptPreview`) — no separate
   * execution path is introduced for this.
   */
  runMainAndReadArtifact?(input: {
    scenarioSlug: string;
    workspaceFiles: Record<string, string>;
    artifactPath: string;
    timeoutMs?: number;
  }): Promise<{ ranOk: boolean; content: string | null }>;
}

export interface MlStepVerificationOptions {
  stepIndex: number;
  /** Candidate workspace files, keyed by workspace-relative path. Defaults to `loaded.files`. */
  files?: Record<string, string>;
  /** Defaults to true — a step's checks include every prior step's tests too. */
  includePreviousSteps?: boolean;
  timeoutMs?: number;
}

export interface MlFinalVerificationOptions {
  files?: Record<string, string>;
  timeoutMs?: number;
}

type MlTestSelection = { ok: true; files: MlAuthoredTestFile[] } | { ok: false; missing: string };

/** Deterministic 1..N test discovery for a step verification run (current step,
 *  plus every previous step's test unless `includePreviousSteps` is false). */
function selectMlStepTestFiles(
  authoredTests: readonly MlAuthoredTestFile[],
  stepIndex: number,
  includePreviousSteps: boolean,
): MlTestSelection {
  const byPath = new Map(authoredTests.map((file) => [file.path, file]));
  const maxStepNumber = stepIndex + 1;
  const minStepNumber = includePreviousSteps ? 1 : maxStepNumber;

  const selected: MlAuthoredTestFile[] = [];
  for (let stepNumber = minStepNumber; stepNumber <= maxStepNumber; stepNumber += 1) {
    const path = mlStepTestPath(stepNumber);
    const file = byPath.get(path);
    if (!file) return { ok: false, missing: path };
    selected.push(file);
  }
  return { ok: true, files: selected };
}

const ML_STEP_TEST_RE = /^tests\/step-(\d+)\.test\.py$/i;

/** Every authored `tests/step-N.test.py` file, sorted ascending — used by final validation. */
function selectAllMlStepTestFiles(authoredTests: readonly MlAuthoredTestFile[]): MlAuthoredTestFile[] {
  return authoredTests
    .map((file) => {
      const match = ML_STEP_TEST_RE.exec(file.path);
      return match ? { file, stepNumber: Number(match[1]) } : null;
    })
    .filter((entry): entry is { file: MlAuthoredTestFile; stepNumber: number } => entry !== null)
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((entry) => entry.file);
}

function workspaceFilesOf(loaded: LoadedScenario, override?: Record<string, string>): Record<string, string> {
  return override ?? Object.fromEntries(loaded.files.map((file) => [file.path, file.content]));
}

/** Labeled stdout/stderr sections (Phase 4 messaging) — each section is only
 *  included when non-empty, so a quiet pytest run doesn't print empty headers. */
function labeledOutput(result: MachineLearningRuntimeResult): string | undefined {
  const sections = [
    result.stdout && result.stdout.trim() ? `stdout:\n${result.stdout}` : null,
    result.stderr && result.stderr.trim() ? `stderr:\n${result.stderr}` : null,
  ].filter((section): section is string => section !== null);
  return sections.length > 0 ? sections.join("\n\n") : undefined;
}

function groupsFromRuntimeResult(result: MachineLearningRuntimeResult): VerificationGroupResult[] {
  const reason = result.timedOut
    ? "Python checks timed out."
    : result.ok
      ? undefined
      : `Python checks failed (exit code ${result.exitCode ?? "unknown"}).`;

  // No metrics convention exists yet, so no "metrics" group is emitted here — a
  // future phase can add one once an authored `evaluation/metrics.json` or
  // emitted pytest metric convention exists. Metrics from a script's
  // `metrics.json` are surfaced separately in the ML notebook preview panel
  // (see `MlNotebookPreviewPanel`), which is preview, not verification.
  return [
    {
      name: "python",
      ok: result.ok,
      command: "python -m pytest -q",
      output: labeledOutput(result),
      durationMs: result.durationMs,
      reason,
    },
  ];
}

function failureGroups(reason: string): VerificationGroupResult[] {
  return [{ name: "python", ok: false, durationMs: 0, reason, output: reason }];
}

function buildResult(
  scenarioSlug: string,
  mode: "python-step" | "python-final",
  stepIndex: number | undefined,
  groups: VerificationGroupResult[],
  startedAt: number,
): VerificationResult {
  const passed = groups.every((group) => group.ok || group.skipped);
  const label = mode === "python-final" ? "Final" : "Step";
  return {
    engine: "machine-learning",
    mode,
    scenarioSlug,
    stepIndex,
    status: passed ? "passed" : "failed",
    passed,
    message: passed ? `${label} checks passed.` : `${label} checks failed.`,
    durationMs: Date.now() - startedAt,
    finishedAt: Date.now(),
    errors: passed
      ? []
      : groups
          .filter((group) => !group.ok && !group.skipped)
          .map((group) => ({ message: group.reason ?? "Python checks failed.", kind: "python" })),
    groups,
    testResults: groups.map((group) => ({
      name: group.name,
      status: group.skipped ? "skipped" : group.ok ? "passed" : "failed",
      message: group.reason,
      durationMs: group.durationMs,
    })),
  };
}

async function runPytestSafely(
  deps: MlStepVerificationDependencies,
  input: Parameters<MlStepVerificationDependencies["runPytest"]>[0],
): Promise<{ ok: true; result: MachineLearningRuntimeResult } | { ok: false; message: string }> {
  try {
    return { ok: true, result: await deps.runPytest(input) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

function assertMachineLearningScenario(loaded: LoadedScenario): void {
  if (scenarioTypeOf(loaded.scenario) !== "machine-learning") {
    throw new Error(`Scenario "${loaded.slug}" is not a machine-learning scenario.`);
  }
}

/**
 * Optional "metrics" verification group — added to final verification ONLY
 * when the scenario configures `execution.artifacts.metrics.required: true`
 * (`lib/scenarios/schema.ts`). Every scenario without that config is
 * completely unaffected: no extra `main.py` run, no group added, identical
 * behavior to before this existed. When configured, this is what makes
 * "missing/malformed metrics.json" and "missing required key"/"wrong type"
 * genuinely FAIL final verification, via the same shared
 * `parseMachineLearningMetrics` preview uses — never a scenario-specific
 * hardcoded check.
 */
async function metricsVerificationGroup(
  loaded: LoadedScenario,
  deps: MlStepVerificationDependencies,
  workspaceFiles: Record<string, string>,
  timeoutMs: number | undefined,
): Promise<VerificationGroupResult | null> {
  const config = loaded.scenario.execution?.artifacts?.metrics;
  if (!config?.required) return null; // not configured, or explicitly optional — no-op

  const path = config.path ?? "metrics.json";

  if (!deps.runMainAndReadArtifact) {
    return {
      name: "metrics",
      ok: false,
      durationMs: 0,
      reason: "metrics.json validation is configured as required, but no runner is available in this environment.",
    };
  }

  let outcome: { ranOk: boolean; content: string | null };
  try {
    outcome = await deps.runMainAndReadArtifact({
      scenarioSlug: loaded.slug,
      workspaceFiles,
      artifactPath: path,
      timeoutMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { name: "metrics", ok: false, durationMs: 0, reason: message };
  }

  if (!outcome.ranOk) {
    return {
      name: "metrics",
      ok: false,
      durationMs: 0,
      reason: `main.py did not run successfully, so ${path} could not be validated.`,
    };
  }
  if (outcome.content === null) {
    return { name: "metrics", ok: false, durationMs: 0, reason: machineLearningMetricsMissingError(path).message };
  }

  const result = parseMachineLearningMetrics(outcome.content, {
    requiredPaths: config.requiredPaths,
    expectedTypes: config.expectedTypes as Readonly<Record<string, MachineLearningMetricTypeName>> | undefined,
    assertions: config.assertions,
  });
  if (!result.ok) {
    return { name: "metrics", ok: false, durationMs: 0, reason: result.error.message };
  }

  return { name: "metrics", ok: true, durationMs: 0 };
}

/** `verification.mode: python-step` — run the current step's tests (plus every
 *  previous step's, unless `includePreviousSteps` is false). */
export async function verifyMlScenarioStep(
  loaded: LoadedScenario,
  authoredTests: readonly MlAuthoredTestFile[],
  deps: MlStepVerificationDependencies,
  options: MlStepVerificationOptions,
): Promise<VerificationResult> {
  assertMachineLearningScenario(loaded);

  const { stepIndex } = options;
  if (stepIndex < 0 || stepIndex >= loaded.scenario.steps.length) {
    throw new Error(`invalid step index ${stepIndex} for scenario "${loaded.slug}"`);
  }

  const startedAt = Date.now();
  const includePreviousSteps = options.includePreviousSteps ?? true;
  const selection = selectMlStepTestFiles(authoredTests, stepIndex, includePreviousSteps);

  if (!selection.ok) {
    return buildResult(
      loaded.slug,
      "python-step",
      stepIndex,
      failureGroups(`Missing ML step test: ${selection.missing}`),
      startedAt,
    );
  }

  const outcome = await runPytestSafely(deps, {
    scenarioSlug: loaded.slug,
    workspaceFiles: workspaceFilesOf(loaded, options.files),
    testFileContents: Object.fromEntries(selection.files.map((file) => [file.path, file.content])),
    testFiles: selection.files.map((file) => file.path),
    timeoutMs: options.timeoutMs,
  });

  const groups = outcome.ok ? groupsFromRuntimeResult(outcome.result) : failureGroups(outcome.message);
  return buildResult(loaded.slug, "python-step", stepIndex, groups, startedAt);
}

/** `verification.mode: python-final` — run every authored step test. */
export async function verifyMlScenarioFinal(
  loaded: LoadedScenario,
  authoredTests: readonly MlAuthoredTestFile[],
  deps: MlStepVerificationDependencies,
  options: MlFinalVerificationOptions = {},
): Promise<VerificationResult> {
  assertMachineLearningScenario(loaded);

  const startedAt = Date.now();
  const allTests = selectAllMlStepTestFiles(authoredTests);

  if (allTests.length === 0) {
    return buildResult(
      loaded.slug,
      "python-final",
      undefined,
      failureGroups("No ML step tests found for final validation."),
      startedAt,
    );
  }

  const workspaceFiles = workspaceFilesOf(loaded, options.files);
  const outcome = await runPytestSafely(deps, {
    scenarioSlug: loaded.slug,
    workspaceFiles,
    testFileContents: Object.fromEntries(allTests.map((file) => [file.path, file.content])),
    testFiles: allTests.map((file) => file.path),
    timeoutMs: options.timeoutMs,
  });

  const groups = outcome.ok ? groupsFromRuntimeResult(outcome.result) : failureGroups(outcome.message);

  const metricsGroup = await metricsVerificationGroup(loaded, deps, workspaceFiles, options.timeoutMs);
  if (metricsGroup) groups.push(metricsGroup);

  return buildResult(loaded.slug, "python-final", undefined, groups, startedAt);
}
