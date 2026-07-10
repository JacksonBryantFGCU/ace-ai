import { loadAuthoredBundleBySlug } from "@/server/scenarios/authoring";
import { loadScenario } from "@/server/scenarios/load";
import { startFullstackRuntime } from "@/server/scenarios/fullstack-runtime";
import { checkpointSource } from "@/server/scenarios/checkpoint-source";
import {
  verifyFullstackScenarioStep,
  type FullstackStepVerificationDependencies,
} from "@/lib/scenarios/fullstack-step-verification";
import type { FullstackAuthoredTestFile, FullstackLayerResult, FullstackTestLayer } from "@/lib/scenarios/fullstack-test-runner";
import type { FullstackRuntimeHandle } from "@/lib/scenarios/fullstack-runtime";
import type { ServedWorkspaceFile, SessionFile } from "@/lib/scenarios/types";
import type { VerificationResult } from "@/lib/scenarios/verification";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { timePerf } from "@/server/scenarios/perf";

async function writeLayerTestFile(
  runtime: FullstackRuntimeHandle,
  layer: FullstackTestLayer,
  testFile: FullstackAuthoredTestFile,
): Promise<string> {
  const base = layer === "backend" ? runtime.workspace.backend : runtime.workspace.frontend;
  const rel = testFile.path.slice(`tests/${layer}/`.length);
  const targetRel = `tests/${layer}/${rel}`;
  const target = join(base, targetRel);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, testFile.content, "utf8");
  return targetRel;
}

async function runCommand(
  cwd: string,
  command: string,
  args: string[],
  env: Record<string, string>,
): Promise<{ code: number; stdout: string; stderr: string; durationMs: number }> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const executable = process.platform === "win32" && command === "npm" ? "cmd.exe" : command;
    const commandArgs =
      process.platform === "win32" && command === "npm"
        ? ["/d", "/s", "/c", "npm", ...args]
        : args;
    const child = spawn(executable, commandArgs, {
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}${error.message}`, durationMs: Date.now() - startedAt });
    });
    child.once("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr, durationMs: Date.now() - startedAt });
    });
  });
}

function commandFor(layer: FullstackTestLayer, path: string): string[] {
  return layer === "integration"
    ? ["run", "test:integration", "--", path]
    : ["test", "--", path];
}

async function resetRuntime(runtime: FullstackRuntimeHandle): Promise<void> {
  await timePerf("verification.resetRuntime", async () => {
    const response = await fetch(`${runtime.backendUrl}/__test/reset`, {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Failed to reset verification database: ${response.status} ${response.statusText}`);
    }
  });
}

async function runTestFile(input: {
  layer: FullstackTestLayer;
  testFile: FullstackAuthoredTestFile;
  runtime: FullstackRuntimeHandle;
}): Promise<FullstackLayerResult> {
  const path = await writeLayerTestFile(input.runtime, input.layer, input.testFile);
  const cwd = input.layer === "backend" ? input.runtime.workspace.backend : input.runtime.workspace.frontend;
  const args = commandFor(input.layer, path);
  const command = `npm ${args.join(" ")}`;
  const result = await timePerf("verification.runTestFile", () => runCommand(cwd, "npm", args, {
    NODE_ENV: "test",
    BACKEND_URL: input.runtime.backendUrl,
    FRONTEND_URL: input.runtime.frontendUrl,
    VITE_API_BASE_URL: input.runtime.backendUrl,
  }), { layer: input.layer, path });
  return {
    layer: input.layer,
    status: result.code === 0 ? "passed" : "failed",
    message: result.code === 0 ? undefined : `${input.layer} checks failed in ${path}.`,
    command,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs: result.durationMs,
  };
}

function startupFailureResult(
  slug: string,
  stepIndex: number,
  stage: "backend" | "frontend" | "workspace",
  error: Error,
): VerificationResult {
  const groups = [
    {
      name: "backend" as const,
      ok: stage !== "backend",
      skipped: stage !== "backend",
      reason: stage === "backend" ? error.message : "Skipped because runtime startup did not complete.",
      output: stage === "backend" ? error.message : "Skipped because runtime startup did not complete.",
      durationMs: 0,
    },
    {
      name: "frontend" as const,
      ok: false,
      skipped: stage !== "frontend",
      reason: stage === "frontend" ? error.message : "Skipped because runtime startup did not complete.",
      output: stage === "frontend" ? error.message : "Skipped because runtime startup did not complete.",
      durationMs: 0,
    },
    {
      name: "integration" as const,
      ok: false,
      skipped: true,
      reason: "Skipped because runtime startup did not complete.",
      output: "Skipped because runtime startup did not complete.",
      durationMs: 0,
    },
    {
      name: "workspace" as const,
      ok: false,
      skipped: true,
      reason: "Skipped because runtime startup did not complete.",
      output: "Skipped because runtime startup did not complete.",
      durationMs: 0,
    },
  ];

  return {
    engine: "fullstack",
    mode: "scenario-step",
    scenarioSlug: slug,
    stepIndex,
    status: "failed",
    passed: false,
    message: "Step checks failed.",
    durationMs: 0,
    finishedAt: Date.now(),
    errors: [{ message: error.message, kind: "runtime", stack: error.stack }],
    groups,
    testResults: groups.map((group) => ({
      name: group.name,
      status: group.skipped ? "skipped" : group.ok ? "passed" : "failed",
      message: group.reason,
      durationMs: group.durationMs,
    })),
  };
}

function authoredFullstackTests(slug: string): FullstackAuthoredTestFile[] {
  const authored = loadAuthoredBundleBySlug(slug);
  if (!authored) throw new Error(`scenario not found: "${slug}"`);

  return Object.entries(authored.bundle.files)
    .filter(([path]) => path.startsWith("tests/backend/") || path.startsWith("tests/frontend/") || path.startsWith("tests/integration/"))
    .map(([path, content]) => ({ path, content }));
}

export async function verifyScenarioStep(input: {
  scenarioSlug: string;
  stepIndex: number;
  files: readonly (ServedWorkspaceFile | SessionFile)[];
}): Promise<VerificationResult> {
  return timePerf("verification.stepScenario", async () => {
    const loaded = await loadScenario(input.scenarioSlug, { includeAuthorOnly: false });
    const authoredTests = authoredFullstackTests(input.scenarioSlug);

    const deps: FullstackStepVerificationDependencies = {
      async startRuntime(runtimeLoaded, options) {
        return startFullstackRuntime(runtimeLoaded, { ...options, purpose: "verification" });
      },
      resetRuntime,
      resolveCheckpointFiles: (scenarioSlug, stepId) => checkpointSource.resolve(scenarioSlug, stepId),
      async runTestFile({ layer, testFile, runtime }) {
        return runTestFile({ layer, testFile, runtime });
      },
    };

    try {
      return await verifyFullstackScenarioStep(loaded, authoredTests, deps, {
        stepIndex: input.stepIndex,
        files: input.files,
        includePreviousSteps: loaded.scenario.verification?.includePreviousSteps ?? true,
      });
    } catch (error) {
      const runtimeError = error as { stage?: "backend" | "frontend" | "workspace" };
      if (runtimeError.stage) {
        const actual = error instanceof Error ? error : new Error(String(error));
        return startupFailureResult(input.scenarioSlug, input.stepIndex, runtimeError.stage, actual);
      }
      throw error;
    }
  }, { slug: input.scenarioSlug, stepIndex: input.stepIndex, fileCount: input.files.length });
}
