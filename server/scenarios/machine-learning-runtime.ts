import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
  runMachineLearningCommand as runMachineLearningCommandCore,
  type MachineLearningRuntimeDependencies,
  type MachineLearningRuntimeFile,
  type MachineLearningRuntimeInput,
  type MachineLearningRuntimeResult,
  type MachineLearningWorkspaceDirs,
} from "@/lib/scenarios/machine-learning-runtime";
import { resolveSandboxPython, runInSandbox } from "@/server/scenarios/sandbox/ml-sandbox-dependencies";
import { startPerfSpan, timePerf } from "@/server/scenarios/perf";

/**
 * Real dependencies for the Python ML runtime: an isolated temp workspace on
 * disk, executed inside the sandbox (container by default; `ACE_EXECUTION_
 * MODE=local-trusted` opts into direct host execution for local dev — see
 * `server/scenarios/sandbox/execution-mode.ts`, the ONLY place that decides
 * which). Mirrors `server/scenarios/fullstack-runtime.ts`'s split — the pure
 * orchestration lives in `lib/scenarios/machine-learning-runtime.ts`; this
 * file only does fs/process work and wires it up as that module's dependency
 * injection seam. `resolvePython`/`runProcess` are the ONLY two functions
 * that changed to route through the sandbox — `prepareWorkspace`/
 * `cleanupWorkspace` (below) are unchanged: the sandbox executor bind-mounts
 * the SAME isolated temp directory these already prepare.
 */

const RUNTIME_ROOT = join(process.cwd(), ".scenario-runtime", "ml");

/** Reject any workspace-relative path that would escape the runtime root
 *  (e.g. `../../etc/passwd`) — the same guard fullstack's runtime uses. */
function assertSafeWorkspacePath(root: string, path: string): string {
  const target = resolve(root, path);
  const normalizedRoot = resolve(root);
  const rel = relative(normalizedRoot, target);
  if (rel.startsWith("..") || rel === ".." || resolve(rel) === rel) {
    throw new Error(`Unsafe workspace path: ${path}`);
  }
  return target;
}

async function prepareWorkspace(files: readonly MachineLearningRuntimeFile[]): Promise<MachineLearningWorkspaceDirs> {
  return timePerf(
    "machineLearning.prepareWorkspace",
    async () => {
      const root = join(RUNTIME_ROOT, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(root, { recursive: true });

      for (const file of files) {
        const target = assertSafeWorkspacePath(root, file.path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, file.content, "utf8");
      }

      return { root };
    },
    { fileCount: files.length },
  );
}

async function cleanupWorkspace(dirs: MachineLearningWorkspaceDirs): Promise<void> {
  const endPerf = startPerfSpan("machineLearning.cleanupWorkspace", { root: dirs.root });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(dirs.root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      endPerf();
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt === 4) {
        endPerf();
        if (code === "EBUSY" || code === "EPERM") return; // best-effort on Windows file locks
        throw error;
      }
      await new Promise((resolveSleep) => setTimeout(resolveSleep, 250 * (attempt + 1)));
    }
  }
}

export function createMachineLearningRuntimeDependencies(): MachineLearningRuntimeDependencies {
  return {
    resolvePython: resolveSandboxPython,
    prepareWorkspace,
    runProcess: runInSandbox,
    cleanupWorkspace,
  };
}

/** Run one ML command (`run-main` or `pytest`) against the real Python runtime. */
export async function runMachineLearningCommand(
  input: MachineLearningRuntimeInput,
): Promise<MachineLearningRuntimeResult> {
  return timePerf(
    "machineLearning.runCommand",
    () => runMachineLearningCommandCore(input, createMachineLearningRuntimeDependencies()),
    { slug: input.scenarioSlug, command: input.command ?? "run-main" },
  );
}

/** Run `python main.py` in an isolated workspace. */
export async function runMachineLearningMain(
  input: Omit<MachineLearningRuntimeInput, "command">,
): Promise<MachineLearningRuntimeResult> {
  return runMachineLearningCommand({ ...input, command: "run-main" });
}

/** Run `python -m pytest` against the selected authored test files. */
export async function runMachineLearningPytest(
  input: Omit<MachineLearningRuntimeInput, "command">,
): Promise<MachineLearningRuntimeResult> {
  return runMachineLearningCommand({ ...input, command: "pytest" });
}
