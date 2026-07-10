import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  FULLSTACK_TEST_LAYERS,
  runFullstackScenarioTests as runFullstackScenarioTestsCore,
  type FullstackAuthoredTestFile,
  type FullstackLayerResult,
  type FullstackTestLayer,
  type FullstackTestRunResult,
} from "@/lib/scenarios/fullstack-test-runner";
import { startFullstackRuntime } from "@/server/scenarios/fullstack-runtime";
import { loadAuthoredBundleBySlug } from "@/server/scenarios/authoring";
import { loadScenario } from "@/server/scenarios/load";
import type { FullstackRuntimeHandle, FullstackWorkspaceDirs } from "@/lib/scenarios/fullstack-runtime";

interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

function layerTestFiles(files: Record<string, string>): FullstackAuthoredTestFile[] {
  return Object.entries(files)
    .filter(([path]) => FULLSTACK_TEST_LAYERS.some((layer) => path.startsWith(`tests/${layer}/`)))
    .map(([path, content]) => ({ path, content }));
}

async function writeTestsForLayer(
  workspace: FullstackWorkspaceDirs,
  layer: FullstackTestLayer,
  files: readonly FullstackAuthoredTestFile[],
): Promise<string[]> {
  const base =
    layer === "backend"
      ? workspace.backend
      : workspace.frontend;
  const written: string[] = [];

  for (const file of files) {
    const rel = file.path.slice(`tests/${layer}/`.length);
    const targetRel = `tests/${layer}/${rel}`;
    const target = join(base, targetRel);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, file.content, "utf8");
    written.push(targetRel);
  }

  return written;
}

async function runCommand(
  cwd: string,
  command: string,
  args: string[],
  env: Record<string, string>,
): Promise<CommandResult> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const executable = process.platform === "win32" && command === "npm" ? "cmd.exe" : command;
    const commandArgs = process.platform === "win32" && command === "npm"
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

function npmArgsForLayer(layer: FullstackTestLayer, paths: readonly string[]): string[] {
  if (layer === "integration") return ["run", "test:integration", "--", ...paths];
  return ["test", "--", ...paths];
}

async function runLayerCommand(input: {
  layer: FullstackTestLayer;
  testFiles: readonly FullstackAuthoredTestFile[];
  runtime?: FullstackRuntimeHandle;
}): Promise<FullstackLayerResult> {
  const workspace = input.runtime?.workspace;
  if (!workspace) {
    return {
      layer: input.layer,
      status: "failed",
      message: `${input.layer} tests require a prepared fullstack workspace.`,
      durationMs: 0,
    };
  }

  const paths = await writeTestsForLayer(workspace, input.layer, input.testFiles);
  const cwd = input.layer === "backend" ? workspace.backend : workspace.frontend;
  const env: Record<string, string> = { NODE_ENV: "test" };
  if (input.runtime) {
    env.FRONTEND_URL = input.runtime.frontendUrl;
    env.BACKEND_URL = input.runtime.backendUrl;
    env.VITE_API_BASE_URL = input.runtime.backendUrl;
  }
  const result = await runCommand(cwd, "npm", npmArgsForLayer(input.layer, paths), env);
  return {
    layer: input.layer,
    status: result.code === 0 ? "passed" : "failed",
    message: result.code === 0 ? undefined : `${input.layer} tests failed with exit code ${result.code}.`,
    command: `npm ${npmArgsForLayer(input.layer, paths).join(" ")}`,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs: result.durationMs,
  };
}

export async function runFullstackScenarioTests(options: {
  slug: string;
  layers?: readonly FullstackTestLayer[];
}): Promise<FullstackTestRunResult> {
  const loaded = await loadScenario(options.slug, { includeAuthorOnly: false });
  const authored = loadAuthoredBundleBySlug(options.slug);
  if (!authored) throw new Error(`scenario not found: "${options.slug}"`);
  const authoredTests = layerTestFiles(authored.bundle.files);

  return runFullstackScenarioTestsCore(loaded, authoredTests, {
    async startRuntime(runtimeLoaded, runtimeOptions) {
      return startFullstackRuntime(runtimeLoaded, { ...runtimeOptions, purpose: "verification" });
    },
    async runLayer(input) {
      const result = await runLayerCommand({
        layer: input.layer,
        testFiles: input.testFiles,
        runtime: input.runtime,
      });
      return input.runtime
        ? {
            ...result,
            stdout: result.stdout
              ? `[${relative(process.cwd(), input.runtime.workspace.root)}]\n${result.stdout}`
              : result.stdout,
          }
        : result;
    },
  }, { layers: options.layers });
}
