import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import {
  resolveSandboxLimits,
  validateSandboxRequest,
  type SandboxExecutionRequest,
  type SandboxExecutionResult,
  type SandboxExecutor,
} from "@/lib/scenarios/execution/sandbox/sandbox-executor";

/**
 * Real Docker-backed `SandboxExecutor` — the production/default execution
 * path for candidate ML code. Spawns `docker run` directly (array args,
 * NEVER a shell string — no shell-metacharacter injection surface
 * regardless of file contents), enforcing every security/resource control
 * documented in `docs/README.md`'s "Machine Learning Scenario Runtime"
 * section: `--network=none`, `--read-only` root fs, dropped capabilities,
 * `no-new-privileges`, non-root user, memory/CPU/PID limits, a bounded
 * `/tmp` tmpfs, and a labeled, unique, single-use container removed with
 * `--rm` (plus an explicit `docker kill` on timeout/cancellation).
 *
 * One fresh container per execution — never reused across candidates or
 * interview sessions (see `docs/README.md` "Cleanup").
 */

export const ML_SANDBOX_IMAGE = "ace-ai-ml-runner";
export const ML_SANDBOX_IMAGE_TAG = "1";
export const ML_SANDBOX_IMAGE_REF = `${ML_SANDBOX_IMAGE}:${ML_SANDBOX_IMAGE_TAG}`;

/** Every container this executor creates carries this label — the ONLY
 *  selector orphan-cleanup (`server/scenarios/sandbox/cleanup.ts`) uses, so
 *  it can never remove a container it didn't create. */
export const SANDBOX_CONTAINER_LABEL = "ace.ai.sandbox=true";

const CONTAINER_NAME_PREFIX = "ace-ml-";
const SANDBOX_USER = "10001:10001";
const TMPFS_SIZE_MB = 96;
const KILL_GRACE_MS = 3_000;

export class SandboxUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SandboxUnavailableError";
  }
}

function dockerBinary(): string {
  // `docker` resolved via PATH — never a user/candidate-controlled value.
  return process.env.ACE_DOCKER_BIN?.trim() || "docker";
}

async function runDocker(
  args: string[],
  timeoutMs: number,
): Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean; spawnError: boolean }> {
  return new Promise((resolvePromise) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    // Declared (unassigned) here, before the try/catch below, so `settle`'s
    // `clearTimeout(timer)` never hits the TDZ if `spawn()` throws
    // synchronously and `settle` runs before the real `setTimeout` call.
    // eslint-disable-next-line prefer-const -- assigned once, but only AFTER this declaration point; see comment above.
    let timer: NodeJS.Timeout | undefined;

    const settle = (exitCode: number | null, spawnError = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ exitCode, stdout, stderr, timedOut, spawnError });
    };

    let child: ChildProcess;
    try {
      child = spawn(dockerBinary(), args, { windowsHide: true });
    } catch (error) {
      stderr = error instanceof Error ? error.message : String(error);
      settle(null, true);
      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      }, KILL_GRACE_MS);
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      stderr += (stderr ? "\n" : "") + (error instanceof Error ? error.message : String(error));
      settle(null, true);
    });
    child.once("close", (code) => settle(code));
  });
}

/** True if the Docker CLI itself failed to even reach a daemon (vs. the
 *  container/command it ran failing) — distinguishes "sandbox unavailable"
 *  from "candidate code failed", which must never be confused. */
function looksLikeDaemonUnreachable(stderr: string): boolean {
  const s = stderr.toLowerCase();
  return (
    s.includes("cannot connect to the docker daemon") ||
    s.includes("error during connect") ||
    s.includes("is the docker daemon running")
  );
}

let cachedAvailability: Promise<void> | null = null;

/**
 * Verify the Docker daemon is reachable AND the pinned sandbox image exists
 * locally. Never pulls a remote image automatically — an actionable error
 * tells the operator to run `npm run sandbox:build` instead.
 *
 * Memoized for the process lifetime (mirrors `resolvePythonCommand`'s own
 * memoization pattern) — without this, EVERY execution (and ML step
 * verification alone issues several cumulative pytest runs per step) would
 * pay two extra `docker` CLI round-trips before the container even starts,
 * which measurably adds up. A transient failure is not cached, so Docker
 * coming up mid-process (e.g. Docker Desktop still starting) self-heals on
 * the next call instead of being stuck failed for the rest of the process.
 */
export async function assertSandboxAvailable(): Promise<void> {
  cachedAvailability ??= (async () => {
    const info = await runDocker(["info", "--format", "{{.ServerVersion}}"], 10_000);
    if (info.spawnError) {
      throw new SandboxUnavailableError(
        "Docker is not installed or not on PATH. Install Docker Desktop (or set ACE_DOCKER_BIN) to run ML candidate code in the sandbox.",
      );
    }
    if (info.exitCode !== 0 || looksLikeDaemonUnreachable(info.stderr)) {
      throw new SandboxUnavailableError(
        "The Docker daemon is not running or not reachable. Start Docker Desktop, or set ACE_EXECUTION_MODE=local-trusted for local development without Docker.",
      );
    }

    const imageCheck = await runDocker(["image", "inspect", ML_SANDBOX_IMAGE_REF, "--format", "{{.Id}}"], 10_000);
    if (imageCheck.exitCode !== 0) {
      throw new SandboxUnavailableError(
        `Sandbox image "${ML_SANDBOX_IMAGE_REF}" was not found locally. Run \`npm run sandbox:build\` to build it (the runtime never pulls a remote image automatically).`,
      );
    }
  })();
  try {
    await cachedAvailability;
  } catch (error) {
    cachedAvailability = null; // don't cache a transient failure
    throw error;
  }
}

/** Test-only: clear the memoized availability check. */
export function resetSandboxAvailabilityCache(): void {
  cachedAvailability = null;
}

function buildDockerArgs(request: SandboxExecutionRequest, containerName: string): string[] {
  const limits = resolveSandboxLimits(request);
  const args: string[] = ["run", "--rm", "--name", containerName, "--label", SANDBOX_CONTAINER_LABEL, "--label", "ace.ai.kind=ml"];

  if (!limits.networkAccess) args.push("--network", "none");

  args.push(
    "--read-only",
    "--tmpfs",
    `/tmp:rw,size=${TMPFS_SIZE_MB}m,mode=1777`,
    "--memory",
    `${limits.memoryLimitMb}m`,
    "--memory-swap",
    `${limits.memoryLimitMb}m`, // no swap beyond the memory limit
    "--cpus",
    String(limits.cpuLimit),
    "--pids-limit",
    String(limits.maxProcesses),
    "--security-opt",
    "no-new-privileges",
    "--cap-drop",
    "ALL",
    "--user",
    SANDBOX_USER,
    // Writable (not :ro) — candidate scripts write predictions.csv/
    // metrics.json/report.txt/outputs/* next to main.py in this SAME
    // directory. Safe because this directory is single-execution,
    // already-isolated, and discarded afterward — never the repo, never
    // shared across runs. The container's ROOT filesystem stays read-only
    // regardless (--read-only above); only this one bind mount is writable.
    "-v",
    `${request.workspacePath}:/workspace:rw`,
    "-w",
    "/workspace",
  );

  // Force single-threaded BLAS/OpenMP. numpy/scipy/scikit-learn auto-detect
  // the HOST's CPU count (not the container's --cpus cap) and spawn that
  // many native pthreads on first import. Each thread counts against
  // --pids-limit, so on a many-core host this can exceed the limit and
  // crash the candidate's own import with an opaque "pthread_create
  // failed: Resource temporarily unavailable" — a resource collision, not
  // a candidate code failure. Since the container only ever gets 1 CPU
  // anyway, multi-threaded BLAS buys nothing here. Candidate-supplied env
  // (none currently passed) could still override these if ever needed.
  const singleThreadedBlasEnv: Record<string, string> = {
    OPENBLAS_NUM_THREADS: "1",
    OMP_NUM_THREADS: "1",
    MKL_NUM_THREADS: "1",
    NUMEXPR_NUM_THREADS: "1",
    VECLIB_MAXIMUM_THREADS: "1",
  };
  for (const [key, value] of Object.entries({ ...singleThreadedBlasEnv, ...(request.environment ?? {}) })) {
    args.push("-e", `${key}=${value}`);
  }

  args.push(ML_SANDBOX_IMAGE_REF, ...request.command);
  return args;
}

async function killContainer(containerName: string): Promise<void> {
  await runDocker(["kill", containerName], 5_000).catch(() => {
    // Best-effort — `--rm` still removes it once it exits either way.
  });
}

export function createContainerSandboxExecutor(): SandboxExecutor {
  return {
    kind: "container",
    label: `Docker container sandbox (${ML_SANDBOX_IMAGE_REF})`,
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
      try {
        await assertSandboxAvailable();
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
      const containerName = `${CONTAINER_NAME_PREFIX}${randomUUID()}`;
      const args = buildDockerArgs(request, containerName);

      // `docker run`'s own process is given a slightly longer timeout than
      // the container's — if the container hangs past its limit we kill IT
      // by name (works even if the `docker run` client process itself is
      // wedged), then let the client process exit on its own.
      const runResult = await runDocker(args, limits.timeoutMs + 5_000);

      const timedOut = runResult.timedOut;
      if (timedOut) {
        await killContainer(containerName);
      }

      if (runResult.spawnError) {
        return {
          status: "sandbox-error",
          exitCode: null,
          stdout: "",
          stderr: "",
          durationMs: Date.now() - startedAt,
          message: "Failed to start the sandbox container.",
        };
      }

      const maxChars = limits.maxOutputChars;
      const stdout = runResult.stdout.length > maxChars ? runResult.stdout.slice(0, maxChars) + "\n…output truncated…" : runResult.stdout;
      const stderr = runResult.stderr.length > maxChars ? runResult.stderr.slice(0, maxChars) + "\n…output truncated…" : runResult.stderr;

      return {
        status: timedOut ? "timeout" : runResult.exitCode === 0 ? "completed" : "failed",
        exitCode: runResult.exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
      };
    },
  };
}
