import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join, relative, resolve } from "node:path";
import {
  startFullstackRuntime as startFullstackRuntimeCore,
  type FullstackRuntimeDependencies,
  type FullstackRuntimeFile,
  type FullstackRuntimeHandle,
  type FullstackRuntimeLog,
  type FullstackRuntimeProcess,
  type FullstackRuntimeTargets,
  type FullstackWorkspaceDirs,
} from "@/lib/scenarios/fullstack-runtime";
import type { LoadedScenario, ServedWorkspaceFile, SessionFile } from "@/lib/scenarios/types";
import { startPerfSpan, timePerf } from "@/server/scenarios/perf";

const RUNTIME_ROOT = join(process.cwd(), ".scenario-runtime");
const DEFAULT_BACKEND_PORT = 4310;
const DEFAULT_FRONTEND_PORT = 5173;

function assertSafeWorkspacePath(root: string, path: string): string {
  const target = resolve(root, path);
  const normalizedRoot = resolve(root);
  const rel = relative(normalizedRoot, target);
  if (rel.startsWith("..") || rel === ".." || resolve(rel) === rel) {
    throw new Error(`Unsafe workspace path: ${path}`);
  }
  return target;
}

async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once("error", () => resolvePort(false));
    server.once("listening", () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findFreePort(start: number): Promise<number> {
  for (let port = start; port < start + 100; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No available port found starting at ${start}.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function prepareWorkspace(files: readonly FullstackRuntimeFile[]): Promise<FullstackWorkspaceDirs> {
  return timePerf("fullstack.prepareWorkspace", async () => {
    const root = join(RUNTIME_ROOT, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(root, { recursive: true });

    for (const file of files) {
      const target = assertSafeWorkspacePath(root, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, "utf8");
    }

    const backend = join(root, "backend");
    const frontend = join(root, "frontend");
    await mkdir(backend, { recursive: true });
    await mkdir(frontend, { recursive: true });

    return { root, backend, frontend };
  }, { fileCount: files.length });
}

class ChildProcessRuntimeProcess implements FullstackRuntimeProcess {
  private readonly entries: FullstackRuntimeLog[] = [];

  constructor(
    private readonly name: "backend" | "frontend",
    private readonly child: ChildProcessWithoutNullStreams,
  ) {}

  push(stream: FullstackRuntimeLog["stream"], message: string): void {
    this.entries.push({
      source: this.name,
      stream,
      message,
      timestamp: new Date().toISOString(),
    });
    if (this.entries.length > 500) this.entries.shift();
  }

  logs(): FullstackRuntimeLog[] {
    return [...this.entries];
  }

  async stop(): Promise<void> {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;

    if (process.platform === "win32" && this.child.pid) {
      await new Promise<void>((resolveStop) => {
        const killer = spawn("taskkill", ["/pid", String(this.child.pid), "/t", "/f"], {
          windowsHide: true,
          stdio: "ignore",
        });
        killer.once("close", () => resolveStop());
        killer.once("error", () => resolveStop());
      });
      await new Promise<void>((resolveStop) => {
        if (this.child.exitCode !== null || this.child.signalCode !== null) {
          resolveStop();
          return;
        }
        const timer = setTimeout(resolveStop, 2_000);
        this.child.once("close", () => {
          clearTimeout(timer);
          resolveStop();
        });
      });
      return;
    }

    this.child.kill("SIGTERM");
    await new Promise<void>((resolveStop) => {
      const timer = setTimeout(() => {
        if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill("SIGKILL");
        resolveStop();
      }, 2_000);
      this.child.once("close", () => {
        clearTimeout(timer);
        resolveStop();
      });
    });
  }
}

async function startProcess(
  spec: Parameters<FullstackRuntimeDependencies["startProcess"]>[0],
): Promise<FullstackRuntimeProcess> {
  return timePerf("fullstack.startProcess", async () => {
    const command = process.platform === "win32" && spec.command === "npm" ? "cmd.exe" : spec.command;
    const args =
      process.platform === "win32" && spec.command === "npm"
        ? ["/d", "/s", "/c", "npm", ...spec.args]
        : spec.args;
    const child = spawn(command, args, {
      cwd: spec.cwd,
      env: { ...process.env, ...spec.env },
      windowsHide: true,
    });

    let stderr = "";
    const runtimeProcess = new ChildProcessRuntimeProcess(spec.name, child);
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      runtimeProcess.push("stderr", text);
    });
    child.stdout.on("data", (chunk: Buffer) => {
      runtimeProcess.push("stdout", chunk.toString());
    });

    await new Promise<void>((resolveStart, rejectStart) => {
      const timer = setTimeout(resolveStart, 200);
      child.once("error", (error) => {
        clearTimeout(timer);
        rejectStart(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        rejectStart(new Error(`${spec.name} process exited during startup with code ${code}: ${stderr.trim()}`));
      });
    });

    runtimeProcess.push("system", `${spec.name} process started in ${spec.cwd}`);
    return runtimeProcess;
  }, { name: spec.name });
}

async function waitForHttp(url: string, label: "backend" | "frontend"): Promise<void> {
  const deadline = Date.now() + 20_000;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok || response.status < 500) return;
      lastError = new Error(`${label} health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }

  throw new Error(
    `${label} did not become healthy at ${url}${lastError instanceof Error ? `: ${lastError.message}` : ""}`,
  );
}

export function createFullstackRuntimeDependencies(): FullstackRuntimeDependencies {
  return {
    async allocatePorts() {
      return timePerf("fullstack.allocatePorts", async () => {
        const backendPort = await findFreePort(DEFAULT_BACKEND_PORT);
        const frontendPort = await findFreePort(
          backendPort === DEFAULT_FRONTEND_PORT ? DEFAULT_FRONTEND_PORT + 1 : DEFAULT_FRONTEND_PORT,
        );
        return { backendPort, frontendPort };
      });
    },
    prepareWorkspace,
    startProcess,
    async waitForHttp(url, label) {
      return timePerf("fullstack.waitForHttp", () => waitForHttp(url, label), { label, url });
    },
    async cleanupWorkspace(dirs) {
      const endPerf = startPerfSpan("fullstack.cleanupWorkspace", { root: dirs.root });
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await rm(dirs.root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
          endPerf();
          return;
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (attempt === 4) {
            endPerf();
            if (code === "EBUSY" || code === "EPERM") return;
            throw error;
          }
          await sleep(250 * (attempt + 1));
        }
      }
    },
  };
}

export async function startFullstackRuntime(
  loaded: LoadedScenario,
  options: {
    files?: readonly (ServedWorkspaceFile | SessionFile)[];
    purpose?: "preview" | "verification";
    targets?: FullstackRuntimeTargets;
  } = {},
): Promise<FullstackRuntimeHandle> {
  return timePerf("fullstack.startRuntime", () => startFullstackRuntimeCore(loaded, createFullstackRuntimeDependencies(), options), {
    slug: loaded.slug,
    purpose: options.purpose,
    backend: options.targets?.backend ?? true,
    frontend: options.targets?.frontend ?? true,
  });
}

