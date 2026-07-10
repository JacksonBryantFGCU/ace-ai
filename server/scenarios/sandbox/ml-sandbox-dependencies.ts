import { resolveSandboxExecutor } from "@/server/scenarios/sandbox/execution-mode";
import { assertSandboxAvailable } from "@/server/scenarios/sandbox/container-sandbox-executor";
import { resolvePythonCommand } from "@/server/scenarios/python-runtime";
import type { SandboxExecutionResult } from "@/lib/scenarios/execution/sandbox/sandbox-executor";
import type { MachineLearningProcessResult, MachineLearningProcessSpec } from "@/lib/scenarios/machine-learning-runtime";

/**
 * Adapts the generic `SandboxExecutor` to the exact
 * `MachineLearningRuntimeDependencies` shape `lib/scenarios/machine-
 * learning-runtime.ts` (pure orchestration) already expects — the ONLY
 * change needed in `server/scenarios/machine-learning-runtime.ts` to route
 * every ML execution path (preview, step/final verification, authoring
 * solution validation all funnel through that one file's dependency
 * composition) through the sandbox, container or local-trusted, without
 * touching any ML-domain code.
 */

export class MlSandboxUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MlSandboxUnavailableError";
  }
}

/**
 * The "python" command name to pass as `MachineLearningRuntimeInput`'s
 * resolved interpreter. In container mode this is just the literal
 * `"python"` (valid INSIDE the image); in local-trusted mode it's whatever
 * `python3`/`python`/`py` was actually found on the host PATH. Throws
 * `MlSandboxUnavailableError` when the active executor's backing runtime
 * (Docker daemon + image, or a host Python) isn't available — the SAME
 * "setup problem, not a candidate failure" contract `resolvePythonCommand`
 * already had.
 */
export async function resolveSandboxPython(): Promise<string> {
  const executor = resolveSandboxExecutor();
  if (executor.kind === "local-trusted") {
    // Defers to the real host-python probe so the error message (which
    // Python executables were tried) stays accurate.
    return resolvePythonCommand();
  }

  try {
    await assertSandboxAvailable();
  } catch (error) {
    throw new MlSandboxUnavailableError(error instanceof Error ? error.message : String(error), { cause: error });
  }
  return "python";
}

function toProcessResult(result: SandboxExecutionResult): MachineLearningProcessResult {
  if (result.status === "sandbox-unavailable" || result.status === "sandbox-error") {
    // Surfaced as a setup-problem throw, matching `resolveSandboxPython`'s
    // contract — `runPytestSafely`/`runMachineLearningCommand` (lib layer)
    // already know how to turn a thrown setup error into a structured,
    // candidate-safe failure without ever confusing it for a test failure.
    throw new MlSandboxUnavailableError(result.message ?? "The execution sandbox is unavailable.");
  }
  return {
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs: result.durationMs,
    timedOut: result.status === "timeout",
  };
}

/** Run one process (the resolved python interpreter + args) through the
 *  active sandbox executor. `spec.command` is the value `resolveSandboxPython`
 *  returned — the executor implementations know how to interpret it
 *  (literal "python" for the container image, or a real host path for
 *  local-trusted mode). */
export async function runInSandbox(spec: MachineLearningProcessSpec & { maxOutputChars?: number }): Promise<MachineLearningProcessResult> {
  const executor = resolveSandboxExecutor();
  const result = await executor.execute({
    workspacePath: spec.cwd,
    command: [spec.command, ...spec.args],
    environment: spec.env,
    timeoutMs: spec.timeoutMs,
    maxOutputChars: spec.maxOutputChars,
    networkAccess: false,
  });
  return toProcessResult(result);
}
