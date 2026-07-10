/**
 * Sandbox Executor abstraction — the ONE seam every candidate-code execution
 * path (ML preview, step/final verification, authoring solution validation)
 * calls through, instead of embedding container orchestration (or raw host
 * subprocess spawning) directly in ML-specific modules.
 *
 *   Scenario Runtime (lib/scenarios/machine-learning-runtime.ts)
 *         |
 *         v
 *   SandboxExecutor  (this file — the interface)
 *         |
 *         +-- ContainerSandboxExecutor   (server/scenarios/sandbox/container-sandbox-executor.ts)
 *         |     real Docker isolation — the production/default path
 *         |
 *         +-- LocalTrustedExecutor       (server/scenarios/sandbox/local-trusted-executor.ts)
 *               direct host subprocess — explicit opt-in ONLY
 *               (ACE_EXECUTION_MODE=local-trusted), for local development
 *               without Docker. Never the silent default.
 *
 * This module is pure (no fs, no child_process, no Docker) — just the
 * contract + request validation, so it's unit-testable without a real
 * container runtime and importable from both `lib/` and `server/`.
 */

export type SandboxExecutionStatus =
  | "completed"
  | "failed"
  | "timeout"
  | "sandbox-unavailable"
  | "sandbox-error";

export interface SandboxExecutionRequest {
  /** Host directory containing ONLY the files this one execution may see —
   *  a disposable, already-isolated per-run directory. NEVER the repo root,
   *  a home directory, or any shared/reused path. */
  workspacePath: string;
  /** argv, executed directly — NEVER passed through a shell, so there is no
   *  shell-metacharacter injection surface regardless of file contents. */
  command: string[];
  /** Merged over the executor's deterministic baseline env — never the raw
   *  host `process.env` (which could leak host secrets into the sandbox). */
  environment?: Record<string, string>;
  timeoutMs: number;
  memoryLimitMb?: number;
  cpuLimit?: number;
  maxProcesses?: number;
  /** Defaults to `false`. Only set `true` for a reviewed, explicit use case
   *  — see `docs/README.md`'s sandbox network policy. */
  networkAccess?: boolean;
  /** Maximum combined stdout+stderr characters retained (excess is
   *  truncated, not silently dropped — the result still reports what fit). */
  maxOutputChars?: number;
}

export interface SandboxExecutionResult {
  status: SandboxExecutionStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  /** Only set for `sandbox-unavailable`/`sandbox-error` — a short, safe,
   *  actionable message (no host paths, no daemon internals dumped raw). */
  message?: string;
}

export interface SandboxExecutor {
  readonly kind: "container" | "local-trusted";
  /** Human-readable label for logs/diagnostics, e.g. "Docker container
   *  sandbox (ace-ai-ml-runner)" or "Local trusted executor (dev only)". */
  readonly label: string;
  execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult>;
}

// ── Bounds (defaults + validation) ──────────────────────────────────────────
// Conservative defaults for the current Easy ML scenarios. A scenario's
// declared `verify.timeoutMs` may override the timeout within
// `SANDBOX_MAX_TIMEOUT_MS` — never unbounded.

export const SANDBOX_DEFAULT_TIMEOUT_MS = 45_000;
export const SANDBOX_MAX_TIMEOUT_MS = 120_000;
export const SANDBOX_DEFAULT_MEMORY_LIMIT_MB = 768;
export const SANDBOX_MAX_MEMORY_LIMIT_MB = 2_048;
export const SANDBOX_DEFAULT_CPU_LIMIT = 1;
export const SANDBOX_MAX_CPU_LIMIT = 2;
export const SANDBOX_DEFAULT_MAX_PROCESSES = 64;
export const SANDBOX_MAX_MAX_PROCESSES = 256;
export const SANDBOX_DEFAULT_MAX_OUTPUT_CHARS = 200_000;
export const SANDBOX_MAX_MAX_OUTPUT_CHARS = 1_000_000;

export interface ResolvedSandboxLimits {
  timeoutMs: number;
  memoryLimitMb: number;
  cpuLimit: number;
  maxProcesses: number;
  maxOutputChars: number;
  networkAccess: boolean;
}

/**
 * Clamp + validate a request's resource fields into concrete limits — every
 * executor implementation calls this FIRST, so no caller (including a
 * scenario's own `verify.timeoutMs` override) can request unbounded
 * resources. Never throws; out-of-range values are clamped, not rejected,
 * so a slightly-too-generous scenario config degrades safely instead of
 * failing verification outright over a config nit.
 */
export function resolveSandboxLimits(request: SandboxExecutionRequest): ResolvedSandboxLimits {
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  return {
    timeoutMs: clamp(request.timeoutMs || SANDBOX_DEFAULT_TIMEOUT_MS, 1_000, SANDBOX_MAX_TIMEOUT_MS),
    memoryLimitMb: clamp(request.memoryLimitMb ?? SANDBOX_DEFAULT_MEMORY_LIMIT_MB, 128, SANDBOX_MAX_MEMORY_LIMIT_MB),
    cpuLimit: clamp(request.cpuLimit ?? SANDBOX_DEFAULT_CPU_LIMIT, 0.25, SANDBOX_MAX_CPU_LIMIT),
    maxProcesses: clamp(request.maxProcesses ?? SANDBOX_DEFAULT_MAX_PROCESSES, 8, SANDBOX_MAX_MAX_PROCESSES),
    maxOutputChars: clamp(
      request.maxOutputChars ?? SANDBOX_DEFAULT_MAX_OUTPUT_CHARS,
      1_000,
      SANDBOX_MAX_MAX_OUTPUT_CHARS,
    ),
    networkAccess: request.networkAccess === true,
  };
}

export interface SandboxRequestValidationError {
  field: string;
  message: string;
}

/**
 * Structural validation independent of resource clamping — catches
 * configuration mistakes (empty command, non-absolute/suspicious workspace
 * path) that indicate a caller bug rather than an over-generous resource
 * request. Returns every problem found (not just the first), so a broken
 * caller sees the whole picture at once.
 */
export function validateSandboxRequest(request: SandboxExecutionRequest): SandboxRequestValidationError[] {
  const errors: SandboxRequestValidationError[] = [];

  if (!request.workspacePath || request.workspacePath.trim().length === 0) {
    errors.push({ field: "workspacePath", message: "workspacePath must be a non-empty path." });
  } else if (!isAbsolutePath(request.workspacePath)) {
    errors.push({ field: "workspacePath", message: "workspacePath must be an absolute path to a prepared, isolated directory." });
  }

  if (!Array.isArray(request.command) || request.command.length === 0) {
    errors.push({ field: "command", message: "command must be a non-empty argv array." });
  } else if (request.command.some((arg) => typeof arg !== "string")) {
    errors.push({ field: "command", message: "every command argument must be a string." });
  }

  if (typeof request.timeoutMs !== "number" || !Number.isFinite(request.timeoutMs) || request.timeoutMs <= 0) {
    errors.push({ field: "timeoutMs", message: "timeoutMs must be a positive finite number." });
  }

  return errors;
}

function isAbsolutePath(path: string): boolean {
  // POSIX absolute ("/...") or Windows absolute ("C:\..." / "C:/...").
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}
