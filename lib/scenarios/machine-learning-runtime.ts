import { ML_ENTRYPOINT } from "@/lib/scenarios/machine-learning";

/**
 * Python ML runtime execution — Phase 2.
 *
 * ML scenarios are script-based (`python main.py`, `pytest`), not function-call
 * based, so this is a deliberately different shape from the harness-based
 * `VerificationEngine` model in `lib/scenarios/verification.ts`. It mirrors the
 * split used by `lib/scenarios/fullstack-runtime.ts` /
 * `server/scenarios/fullstack-runtime.ts`:
 *
 *   - THIS file is pure orchestration over an injected `MachineLearningRuntimeDependencies`
 *     — no fs, no child_process, no node builtins — so it's unit-testable with fakes.
 *   - `server/scenarios/machine-learning-runtime.ts` provides the REAL dependencies
 *     (temp workspace on disk, a spawned `python` process) and thin convenience
 *     wrappers (`runMachineLearningMain`, `runMachineLearningPytest`).
 *
 * Phase 3 (the full `verifyMlScenarioStep()` step verifier) builds on top of this.
 */

export type MachineLearningCommand = "run-main" | "pytest";

export interface MachineLearningRuntimeFile {
  /** Workspace-relative path, e.g. "main.py", "data/train.csv", "tests/step-1.test.py". */
  path: string;
  content: string;
}

export interface MachineLearningRuntimeInput {
  scenarioSlug: string;
  /**
   * Candidate-editable `workspace/` files (e.g. "main.py", "src/model.py"),
   * merged with the scenario's authored `workspace/data/` files by the caller —
   * both live under `workspace/` in the ML content contract, so both flow
   * through this one map. Candidate edits and authored data are the caller's
   * concern; this runtime only cares that everything under `workspace/` is here.
   */
  workspaceFiles: Record<string, string>;
  /**
   * Authored-only test file contents, keyed by their `tests/` path (e.g.
   * "tests/step-1.test.py"). Never merged into `workspaceFiles` — tests are
   * only ever written into the isolated runtime workspace, never served back
   * to the candidate's file tree.
   */
  testFileContents?: Record<string, string>;
  /** Which of `testFileContents`' keys to copy + run for a "pytest" command.
   *  Defaults to every key in `testFileContents` when omitted. */
  testFiles?: string[];
  /** Defaults to `main.py` (`ML_ENTRYPOINT`). */
  entrypoint?: string;
  /** Informational only in Phase 2 — not enforced (no venv/version pinning yet). */
  pythonVersion?: string;
  timeoutMs?: number;
  /** Defaults to "run-main". */
  command?: MachineLearningCommand;
}

export interface MachineLearningRuntimeResult {
  ok: boolean;
  scenarioSlug: string;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  /** Server-internal temp path. Not for candidate-facing UI without an
   *  existing debugging convention that allows surfacing it. */
  workspacePath?: string;
}

export interface MachineLearningWorkspaceDirs {
  root: string;
}

export interface MachineLearningProcessSpec {
  cwd: string;
  command: string;
  args: string[];
  timeoutMs: number;
  /** Extra environment variables merged over `process.env` (never removed —
   *  only additive determinism knobs like `PYTHONHASHSEED`). */
  env?: Record<string, string>;
}

/** Deterministic defaults for every spawned Python process: a fixed hash seed
 *  (Python randomizes `str`/`bytes` hashing per-process by default, which can
 *  make dict/set iteration order vary run-to-run) and no `.pyc`/`__pycache__`
 *  writes into the disposable temp workspace. This does NOT make candidate
 *  code deterministic — a candidate using `random`/`numpy.random` without
 *  their own fixed seed is still nondeterministic; scenarios require a fixed
 *  `random_state` for exactly this reason (see authored hints). */
export const ML_DETERMINISTIC_ENV: Record<string, string> = {
  PYTHONHASHSEED: "0",
  PYTHONDONTWRITEBYTECODE: "1",
};

export interface MachineLearningProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface MachineLearningRuntimeDependencies {
  /** Resolve the Python executable, or throw with a clear message when unavailable. */
  resolvePython(): Promise<string>;
  prepareWorkspace(files: readonly MachineLearningRuntimeFile[]): Promise<MachineLearningWorkspaceDirs>;
  runProcess(spec: MachineLearningProcessSpec): Promise<MachineLearningProcessResult>;
  cleanupWorkspace(dirs: MachineLearningWorkspaceDirs): Promise<void>;
}

export class MachineLearningRuntimeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MachineLearningRuntimeError";
  }
}

// ── Timeout defaults (configurable per call via `timeoutMs`) ────────────────
export const DEFAULT_RUN_MAIN_TIMEOUT_MS = 15_000;
export const DEFAULT_PYTEST_STEP_TIMEOUT_MS = 30_000;
export const DEFAULT_PYTEST_FINAL_TIMEOUT_MS = 45_000;

/**
 * Redact the disposable temp workspace's absolute host path out of a Python
 * process's output (a traceback prints `File "<abs path>/main.py", line N` —
 * without this, the server's absolute filesystem path would otherwise leak
 * into candidate- and authoring-facing stdout/stderr). Best-effort: covers
 * both path-separator styles since Python doesn't normalize consistently
 * across platforms. Shared by both the step/final verification path
 * (`runMachineLearningCommand`) and the Output Preview path
 * (`runMlScriptPreview`) — the same host path can appear in either.
 */
export function redactWorkspacePath(text: string, workspaceRoot: string): string {
  if (!text) return text;
  const forward = workspaceRoot.replaceAll("\\", "/");
  const backward = workspaceRoot.replaceAll("/", "\\");
  return text.split(forward).join("<workspace>").split(backward).join("<workspace>");
}

function selectedTestFiles(input: MachineLearningRuntimeInput): string[] {
  return input.testFiles ?? Object.keys(input.testFileContents ?? {});
}

/** A "final" run covers every step's tests; a single-step run gets the shorter
 *  step timeout. Callers can always override via `timeoutMs`. */
function defaultTimeoutFor(command: MachineLearningCommand, selectedCount: number): number {
  if (command === "run-main") return DEFAULT_RUN_MAIN_TIMEOUT_MS;
  return selectedCount > 1 ? DEFAULT_PYTEST_FINAL_TIMEOUT_MS : DEFAULT_PYTEST_STEP_TIMEOUT_MS;
}

function runtimeFiles(input: MachineLearningRuntimeInput, command: MachineLearningCommand): MachineLearningRuntimeFile[] {
  const files: MachineLearningRuntimeFile[] = Object.entries(input.workspaceFiles).map(([path, content]) => ({
    path,
    content,
  }));

  if (command === "pytest") {
    for (const testPath of selectedTestFiles(input)) {
      const content = input.testFileContents?.[testPath];
      if (content === undefined) {
        throw new MachineLearningRuntimeError(`Requested test file "${testPath}" has no authored content.`);
      }
      files.push({ path: testPath, content });
    }
  }

  return files;
}

function commandArgs(input: MachineLearningRuntimeInput, command: MachineLearningCommand): string[] {
  if (command === "run-main") {
    return [input.entrypoint ?? ML_ENTRYPOINT];
  }

  const selected = selectedTestFiles(input);
  if (selected.length === 0) {
    throw new MachineLearningRuntimeError("pytest command requires at least one test file.");
  }
  // pytest's default "prepend" import mode derives a module name from the
  // test file's path stem — for "tests/step-1.test.py" that stem is
  // "step-1.test", which it then treats as a dotted package path ("step-1"
  // . "test") and fails to import ("No module named 'step-1'"). This isn't
  // specific to any one scenario: EVERY authored test follows the frozen
  // `tests/step-N.test.py` convention (`mlStepTestPath`), so every ML
  // scenario's pytest run would hit this. `--import-mode=importlib` imports
  // by file path instead of derived dotted name, sidestepping it entirely.
  return ["-m", "pytest", "-q", "--import-mode=importlib", ...selected];
}

/**
 * Run one Python ML command (`main.py`, or a pytest selection) in an isolated,
 * dependency-injected workspace and return a structured result. Never throws
 * for a candidate-code failure (non-zero exit, exception, timeout) — those are
 * all represented in the returned result. It DOES throw
 * `MachineLearningRuntimeError` for setup problems (Python unavailable, no
 * test files selected for a pytest run) that no candidate result can capture.
 */
export async function runMachineLearningCommand(
  input: MachineLearningRuntimeInput,
  deps: MachineLearningRuntimeDependencies,
): Promise<MachineLearningRuntimeResult> {
  const command = input.command ?? "run-main";
  const args = commandArgs(input, command);
  const files = runtimeFiles(input, command);
  const timeoutMs = input.timeoutMs ?? defaultTimeoutFor(command, selectedTestFiles(input).length);

  let dirs: MachineLearningWorkspaceDirs | null = null;
  try {
    const python = await deps.resolvePython();
    dirs = await deps.prepareWorkspace(files);

    const result = await deps.runProcess({
      cwd: dirs.root,
      command: python,
      args,
      timeoutMs,
      env: ML_DETERMINISTIC_ENV,
    });

    return {
      ok: !result.timedOut && result.exitCode === 0,
      scenarioSlug: input.scenarioSlug,
      command,
      exitCode: result.exitCode,
      stdout: redactWorkspacePath(result.stdout, dirs.root),
      stderr: redactWorkspacePath(result.stderr, dirs.root),
      durationMs: result.durationMs,
      timedOut: result.timedOut,
      workspacePath: dirs.root,
    };
  } finally {
    if (dirs) {
      const cleanupDirs = dirs;
      await deps.cleanupWorkspace(cleanupDirs).catch(() => {
        // Best-effort cleanup. The run result is the actionable output.
      });
    }
  }
}
