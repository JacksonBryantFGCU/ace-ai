import { resolvePythonCommand, runProcessWithTimeout } from "@/server/scenarios/python-runtime";
import {
  resolveSandboxLimits,
  validateSandboxRequest,
  type SandboxExecutionRequest,
  type SandboxExecutionResult,
  type SandboxExecutor,
} from "@/lib/scenarios/execution/sandbox/sandbox-executor";

/**
 * Direct host subprocess execution — NO container isolation, NO network
 * block, NO resource limits beyond timeout/output capping. This is the
 * pre-sandbox behavior, kept ONLY as an explicit, clearly-named opt-in for
 * local development on a machine without Docker (`ACE_EXECUTION_MODE=
 * local-trusted` — see `server/scenarios/sandbox/execution-mode.ts`, which
 * is the ONLY place allowed to construct this executor). It must never be
 * the silent default in production or in the test suite.
 *
 * `command[0]` is treated as the interpreter (normally resolved via
 * `resolvePythonCommand`, i.e. whatever `python3`/`python`/`py` is on the
 * developer's own PATH) and the rest as its arguments — same shape the
 * container executor uses, so callers don't need to branch on which
 * executor is active.
 */
export function createLocalTrustedExecutor(): SandboxExecutor {
  return {
    kind: "local-trusted",
    label: "Local trusted executor (ACE_EXECUTION_MODE=local-trusted — host subprocess, NOT sandboxed, dev only)",
    async execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
      const validationErrors = validateSandboxRequest(request);
      if (validationErrors.length > 0) {
        return {
          status: "sandbox-error",
          exitCode: null,
          stdout: "",
          stderr: "",
          durationMs: 0,
          message: `Invalid sandbox request: ${validationErrors.map((e) => `${e.field}: ${e.message}`).join("; ")}`,
        };
      }

      const startedAt = Date.now();
      let python: string;
      try {
        python = await resolvePythonCommand();
      } catch (error) {
        return {
          status: "sandbox-unavailable",
          exitCode: null,
          stdout: "",
          stderr: "",
          durationMs: Date.now() - startedAt,
          message: error instanceof Error ? error.message : String(error),
        };
      }

      const limits = resolveSandboxLimits(request);
      // The request's command[0] is a logical interpreter name (e.g.
      // "python") — substitute the actually-resolved host executable so
      // this works the same whether "python"/"python3"/"py" is on PATH.
      const args = [...request.command.slice(1)];

      const result = await runProcessWithTimeout({
        cwd: request.workspacePath,
        command: python,
        args,
        timeoutMs: limits.timeoutMs,
        maxOutputChars: limits.maxOutputChars,
      });

      return {
        status: result.timedOut ? "timeout" : result.exitCode === 0 ? "completed" : "failed",
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: result.durationMs,
      };
    },
  };
}
