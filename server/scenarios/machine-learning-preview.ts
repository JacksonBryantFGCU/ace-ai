import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  runMlScriptPreview as runMlScriptPreviewCore,
  type MlScriptPreviewDependencies,
  type MlScriptPreviewInput,
  type MlScriptPreviewResult,
  type MlWorkspaceFileMeta,
} from "@/lib/scenarios/machine-learning-preview";
import type { MachineLearningWorkspaceDirs } from "@/lib/scenarios/machine-learning-runtime";
import { createMachineLearningRuntimeDependencies } from "@/server/scenarios/machine-learning-runtime";
import { loadScenario } from "@/server/scenarios/load";
import { timePerf } from "@/server/scenarios/perf";
import type { ServedWorkspaceFile, SessionFile } from "@/lib/scenarios/types";

/**
 * Real dependencies for the ML "Output Preview" run (see
 * `lib/scenarios/machine-learning-preview.ts`). Reuses the SAME
 * `resolvePython`/`prepareWorkspace`/`runProcess`/`cleanupWorkspace`
 * implementations as the Phase 2/3 verification runtime
 * (`server/scenarios/machine-learning-runtime.ts`) — no Python process logic
 * is duplicated here. The only new code is reading the temp workspace back
 * (plain fs, no process spawning) between the run and cleanup.
 */

const IGNORED_DIR_NAMES = new Set(["__pycache__", ".pytest_cache"]);

function walk(dir: string, prefix: string, out: MlWorkspaceFileMeta[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIR_NAMES.has(entry.name)) continue;
    const abs = join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      walk(abs, rel, out);
    } else if (entry.isFile()) {
      out.push({ path: rel.replace(/\\/g, "/"), sizeBytes: statSync(abs).size });
    }
  }
}

/** List every file under the run's temp workspace root. Only ever walks that
 *  one sandboxed directory — never accepts an external path. */
async function listWorkspaceFiles(dirs: MachineLearningWorkspaceDirs): Promise<MlWorkspaceFileMeta[]> {
  const out: MlWorkspaceFileMeta[] = [];
  walk(dirs.root, "", out);
  return out;
}

/** Read one file by a path `listWorkspaceFiles` itself reported — the path
 *  never comes from user input, so there is no traversal surface to guard. */
async function readWorkspaceFile(dirs: MachineLearningWorkspaceDirs, path: string): Promise<string> {
  return readFileSync(join(dirs.root, path), "utf8");
}

function createMlPreviewDependencies(): MlScriptPreviewDependencies {
  return {
    ...createMachineLearningRuntimeDependencies(),
    listWorkspaceFiles,
    readWorkspaceFile,
  };
}

/** Run `python main.py` against real dependencies and return the preview result. */
export async function runMlScriptPreview(input: MlScriptPreviewInput): Promise<MlScriptPreviewResult> {
  return timePerf(
    "machineLearning.previewRun",
    () => runMlScriptPreviewCore(input, createMlPreviewDependencies()),
    { slug: input.scenarioSlug },
  );
}

function workspaceFilesRecord(files: readonly (ServedWorkspaceFile | SessionFile)[]): Record<string, string> {
  return Object.fromEntries(files.map((file) => [file.path, file.content]));
}

/**
 * Scenario-aware entrypoint: loads the scenario (for its `entry`) and runs the
 * candidate's current workspace through the preview runtime. Preview is NOT
 * verification — it never touches step state/gating, and never runs pytest.
 */
export async function previewMlScript(input: {
  scenarioSlug: string;
  files: readonly (ServedWorkspaceFile | SessionFile)[];
  timeoutMs?: number;
}): Promise<MlScriptPreviewResult> {
  const loaded = await loadScenario(input.scenarioSlug, { includeAuthorOnly: false });
  return runMlScriptPreview({
    scenarioSlug: input.scenarioSlug,
    workspaceFiles: workspaceFilesRecord(input.files),
    entrypoint: loaded.entry,
    timeoutMs: input.timeoutMs,
  });
}
