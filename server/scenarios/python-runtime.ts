import { spawn, type ChildProcess } from "node:child_process";
import type { MachineLearningProcessResult, MachineLearningProcessSpec } from "@/lib/scenarios/machine-learning-runtime";

/**
 * Low-level Python process infrastructure: executable resolution and a generic
 * spawn-with-timeout/output-cap runner. No ML-domain knowledge lives here —
 * `server/scenarios/machine-learning-runtime.ts` is the ML-specific caller.
 */

const PYTHON_CANDIDATES = ["python3", "python", "py"] as const;
export const PYTHON_UNAVAILABLE_MESSAGE = "Python runtime is not available";

let cachedPython: Promise<string> | null = null;

function probePython(command: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    let child: ChildProcess;
    try {
      child = spawn(command, ["--version"], { windowsHide: true, stdio: "ignore" });
    } catch {
      resolvePromise(false);
      return;
    }
    child.once("error", () => resolvePromise(false));
    child.once("exit", (code) => resolvePromise(code === 0));
  });
}

/**
 * Resolve the first available Python executable from `python3` / `python` /
 * `py` (Windows launcher). Memoized for the process lifetime. Throws
 * `PYTHON_UNAVAILABLE_MESSAGE` when none respond to `--version` — this task
 * never installs Python automatically.
 */
export async function resolvePythonCommand(): Promise<string> {
  cachedPython ??= (async () => {
    for (const candidate of PYTHON_CANDIDATES) {
      if (await probePython(candidate)) return candidate;
    }
    throw new Error(PYTHON_UNAVAILABLE_MESSAGE);
  })();
  try {
    return await cachedPython;
  } catch (error) {
    cachedPython = null; // don't cache a transient failure
    throw error;
  }
}

/** Test-only: clear the memoized resolution (e.g. to re-probe after mocking). */
export function resetPythonResolutionCache(): void {
  cachedPython = null;
}

const DEFAULT_MAX_OUTPUT_CHARS = 200_000;
const KILL_GRACE_MS = 2_000;

function killProcess(child: ChildProcess): void {
  if (process.platform === "win32" && child.pid) {
    try {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
    } catch {
      // Best-effort — the timeout result is the actionable signal either way.
    }
    return;
  }
  child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }, KILL_GRACE_MS);
}

function appendCapped(current: string, chunk: Buffer, maxChars: number): string {
  if (current.length >= maxChars) return current;
  const next = current + chunk.toString();
  if (next.length > maxChars) {
    return `${next.slice(0, maxChars)}\n…output truncated at ${maxChars} characters…`;
  }
  return next;
}

/**
 * Spawn one process (no shell, args as an array — never string-interpolated),
 * capture stdout/stderr (size-capped), enforce a timeout with cross-platform
 * kill (taskkill /t /f on Windows, SIGTERM→SIGKILL elsewhere), and resolve a
 * structured result. Never throws for the child process's own behavior
 * (non-zero exit, timeout) — only for a genuine spawn failure (e.g. the
 * command doesn't exist), which resolves with `exitCode: null`.
 */
export async function runProcessWithTimeout(
  spec: MachineLearningProcessSpec & { maxOutputChars?: number },
): Promise<MachineLearningProcessResult> {
  const startedAt = Date.now();
  const maxChars = spec.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;

  return new Promise((resolvePromise) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const settle = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ exitCode, stdout, stderr, durationMs: Date.now() - startedAt, timedOut });
    };

    let child: ChildProcess;
    try {
      child = spawn(spec.command, spec.args, {
        cwd: spec.cwd,
        windowsHide: true,
        env: { ...process.env, ...spec.env },
      });
    } catch (error) {
      stderr = error instanceof Error ? error.message : String(error);
      settle(null);
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      killProcess(child);
    }, spec.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout = appendCapped(stdout, chunk, maxChars);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = appendCapped(stderr, chunk, maxChars);
    });

    child.once("error", (error) => {
      stderr += (stderr ? "\n" : "") + (error instanceof Error ? error.message : String(error));
      settle(null);
    });
    child.once("close", (code) => settle(code));
  });
}
