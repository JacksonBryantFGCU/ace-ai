import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import type { LoadedScenario, ServedWorkspaceFile, SessionFile } from "@/lib/scenarios/types";

export interface FullstackRuntimeInfo {
  mode: "fullstack";
  frontendUrl: string;
  backendUrl: string;
  /** Primary preview target. Fullstack preview points at the Vite frontend. */
  previewUrl: string;
  workspace: FullstackWorkspaceDirs;
}

export interface FullstackRuntimeLog {
  source: "backend" | "frontend";
  stream: "stdout" | "stderr" | "system";
  message: string;
  timestamp: string;
}

export interface FullstackRuntimeHandle extends FullstackRuntimeInfo {
  logs(): FullstackRuntimeLog[];
  stop(): Promise<void>;
}

export interface FullstackWorkspaceDirs {
  root: string;
  backend: string;
  frontend: string;
}

export interface FullstackRuntimeFile {
  path: string;
  content: string;
}

export interface FullstackProcessSpec {
  name: "backend" | "frontend";
  cwd: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface FullstackRuntimeProcess {
  logs?(): FullstackRuntimeLog[];
  stop(): Promise<void>;
}

export interface FullstackRuntimeDependencies {
  allocatePorts(): Promise<{ backendPort: number; frontendPort: number }>;
  prepareWorkspace(files: readonly FullstackRuntimeFile[]): Promise<FullstackWorkspaceDirs>;
  startProcess(spec: FullstackProcessSpec): Promise<FullstackRuntimeProcess>;
  waitForHttp(url: string, label: "backend" | "frontend"): Promise<void>;
  cleanupWorkspace(dirs: FullstackWorkspaceDirs): Promise<void>;
}

export interface FullstackRuntimeTargets {
  backend?: boolean;
  frontend?: boolean;
}

export class FullstackRuntimeStartupError extends Error {
  constructor(
    readonly stage: "backend" | "frontend" | "workspace",
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "FullstackRuntimeStartupError";
  }
}

export function isFullstackRuntimeScenario(loaded: LoadedScenario): boolean {
  return scenarioTypeOf(loaded.scenario) === "fullstack" && loaded.scenario.execution?.mode === "fullstack";
}

function runtimeFiles(files: readonly (ServedWorkspaceFile | SessionFile)[]): FullstackRuntimeFile[] {
  return files.map((file) => ({ path: file.path, content: file.content }));
}

async function stopQuietly(process: FullstackRuntimeProcess | null): Promise<void> {
  if (!process) return;
  try {
    await process.stop();
  } catch {
    // Best-effort cleanup. The startup error remains the actionable failure.
  }
}

function logsFor(...processes: (FullstackRuntimeProcess | null)[]): FullstackRuntimeLog[] {
  return processes.flatMap((process) => process?.logs?.() ?? []);
}

function resolvedTargets(targets: FullstackRuntimeTargets | undefined): Required<FullstackRuntimeTargets> {
  return {
    backend: targets?.backend ?? true,
    frontend: targets?.frontend ?? true,
  };
}

function scheduleCleanup(
  deps: FullstackRuntimeDependencies,
  dirs: FullstackWorkspaceDirs | null,
): void {
  if (!dirs) return;
  void deps.cleanupWorkspace(dirs).catch(() => {
    // Best-effort cleanup. Runtime startup/test failures remain the actionable signal.
  });
}

export async function startFullstackRuntime(
  loaded: LoadedScenario,
  deps: FullstackRuntimeDependencies,
  options: {
    files?: readonly (ServedWorkspaceFile | SessionFile)[];
    purpose?: "preview" | "verification";
    targets?: FullstackRuntimeTargets;
  } = {},
): Promise<FullstackRuntimeHandle> {
  if (!isFullstackRuntimeScenario(loaded)) {
    throw new FullstackRuntimeStartupError(
      "workspace",
      `Scenario "${loaded.slug}" is not configured for the fullstack runtime.`,
    );
  }

  const targets = resolvedTargets(options.targets);
  if (!targets.backend && targets.frontend) {
    throw new FullstackRuntimeStartupError(
      "workspace",
      "Fullstack runtime cannot start the frontend without the backend.",
    );
  }

  let dirs: FullstackWorkspaceDirs | null = null;
  let backend: FullstackRuntimeProcess | null = null;
  let frontend: FullstackRuntimeProcess | null = null;

  try {
    const ports = await deps.allocatePorts();
    const backendUrl = `http://localhost:${ports.backendPort}`;
    const frontendUrl = `http://localhost:${ports.frontendPort}`;

    dirs = await deps.prepareWorkspace(runtimeFiles(options.files ?? loaded.files));

    if (targets.backend) {
      backend = await deps.startProcess({
        name: "backend",
        cwd: dirs.backend,
        command: "npm",
        args: ["run", "dev"],
        env: {
          PORT: String(ports.backendPort),
          NODE_ENV: options.purpose === "verification" ? "test" : "development",
        },
      });
      await deps.waitForHttp(`${backendUrl}/health`, "backend");
    }

    if (targets.frontend) {
      frontend = await deps.startProcess({
        name: "frontend",
        cwd: dirs.frontend,
        command: "npm",
        args: ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(ports.frontendPort)],
        env: {
          NODE_ENV: options.purpose === "verification" ? "test" : "development",
          VITE_API_BASE_URL: backendUrl,
        },
      });
      await deps.waitForHttp(frontendUrl, "frontend");
    }

    return {
      mode: "fullstack",
      frontendUrl: targets.frontend ? frontendUrl : backendUrl,
      backendUrl,
      previewUrl: targets.frontend ? frontendUrl : backendUrl,
      workspace: dirs,
      logs: () => logsFor(backend, frontend),
      async stop() {
        await stopQuietly(frontend);
        await stopQuietly(backend);
        scheduleCleanup(deps, dirs);
      },
    };
  } catch (error) {
    await stopQuietly(frontend);
    await stopQuietly(backend);
    scheduleCleanup(deps, dirs);

    if (error instanceof FullstackRuntimeStartupError) throw error;
    throw new FullstackRuntimeStartupError(
      backend ? "frontend" : dirs ? "backend" : "workspace",
      error instanceof Error ? error.message : "Fullstack runtime failed to start.",
      { cause: error },
    );
  }
}
