import {
  isFullstackRuntimeScenario,
  type FullstackRuntimeHandle,
  type FullstackRuntimeTargets,
} from "@/lib/scenarios/fullstack-runtime";
import type { LoadedScenario, ServedWorkspaceFile, SessionFile } from "@/lib/scenarios/types";

export const FULLSTACK_TEST_LAYERS = ["backend", "frontend", "integration"] as const;
export type FullstackTestLayer = (typeof FULLSTACK_TEST_LAYERS)[number];

export interface FullstackAuthoredTestFile {
  path: string;
  content: string;
}

export interface FullstackLayerRunInput {
  layer: FullstackTestLayer;
  testFiles: readonly FullstackAuthoredTestFile[];
  loaded: LoadedScenario;
  files: readonly (ServedWorkspaceFile | SessionFile)[];
  runtime?: FullstackRuntimeHandle;
}

export interface FullstackLayerResult {
  layer: FullstackTestLayer;
  status: "passed" | "failed" | "skipped";
  message?: string;
  command?: string;
  stdout?: string;
  stderr?: string;
  durationMs: number;
}

export interface FullstackTestRunResult {
  scenarioSlug: string;
  status: "passed" | "failed";
  layers: FullstackLayerResult[];
}

export interface FullstackTestRunnerDependencies {
  startRuntime(
    loaded: LoadedScenario,
    options: {
      files: readonly (ServedWorkspaceFile | SessionFile)[];
      targets?: FullstackRuntimeTargets;
    },
  ): Promise<FullstackRuntimeHandle>;
  runLayer(input: FullstackLayerRunInput): Promise<FullstackLayerResult>;
}

export interface FullstackTestRunOptions {
  layers?: readonly FullstackTestLayer[];
  files?: readonly (ServedWorkspaceFile | SessionFile)[];
}

function filesForLayer(files: readonly FullstackAuthoredTestFile[], layer: FullstackTestLayer): FullstackAuthoredTestFile[] {
  return files.filter((file) => file.path.startsWith(`tests/${layer}/`));
}

function runtimeTargetsForLayer(layer: FullstackTestLayer): FullstackRuntimeTargets {
  if (layer === "backend") return { backend: false, frontend: false };
  if (layer === "frontend") return { backend: true, frontend: false };
  return { backend: true, frontend: true };
}

export function parseFullstackTestLayer(value: string | undefined): FullstackTestLayer | "all" {
  if (!value || value === "all") return "all";
  if (FULLSTACK_TEST_LAYERS.includes(value as FullstackTestLayer)) return value as FullstackTestLayer;
  throw new Error(`Unknown fullstack test layer "${value}". Use backend, frontend, integration, or all.`);
}

export async function runFullstackScenarioTests(
  loaded: LoadedScenario,
  authoredTests: readonly FullstackAuthoredTestFile[],
  deps: FullstackTestRunnerDependencies,
  options: FullstackTestRunOptions = {},
): Promise<FullstackTestRunResult> {
  if (!isFullstackRuntimeScenario(loaded)) {
    throw new Error(`Scenario "${loaded.slug}" is not a fullstack runtime scenario.`);
  }

  const files = options.files ?? loaded.files;
  const requested = options.layers ?? FULLSTACK_TEST_LAYERS;
  const layers: FullstackLayerResult[] = [];
  const selected = new Map<FullstackTestLayer, FullstackAuthoredTestFile[]>(
    FULLSTACK_TEST_LAYERS.map((layer) => [layer, filesForLayer(authoredTests, layer)]),
  );
  const shouldShareFullRuntime = requested.includes("frontend") && requested.includes("integration");
  let sharedRuntime: FullstackRuntimeHandle | null = null;

  try {
    for (const layer of requested) {
      const testFiles = selected.get(layer) ?? [];
      if (testFiles.length === 0) {
        layers.push({
          layer,
          status: layer === "frontend" ? "skipped" : "failed",
          message:
            layer === "frontend"
              ? "No frontend tests found; frontend unit tests are optional for V1 fullstack scenarios."
              : `No ${layer} tests found.`,
          durationMs: 0,
        });
        continue;
      }

      let runtime: FullstackRuntimeHandle | undefined;
      let ownsRuntime = false;
      if (layer === "frontend" && shouldShareFullRuntime && (selected.get("integration")?.length ?? 0) > 0) {
        sharedRuntime ??= await deps.startRuntime(loaded, { files, targets: { backend: true, frontend: true } });
        runtime = sharedRuntime;
      } else if (layer === "integration" && sharedRuntime) {
        runtime = sharedRuntime;
      } else {
        runtime = await deps.startRuntime(loaded, { files, targets: runtimeTargetsForLayer(layer) });
        ownsRuntime = true;
      }

      try {
        layers.push(await deps.runLayer({ layer, testFiles, loaded, files, runtime }));
      } finally {
        if (ownsRuntime) {
          await runtime.stop();
        }
      }
    }
  } finally {
    await sharedRuntime?.stop();
  }

  return {
    scenarioSlug: loaded.slug,
    status: layers.every((layer) => layer.status === "passed" || layer.status === "skipped") ? "passed" : "failed",
    layers,
  };
}
