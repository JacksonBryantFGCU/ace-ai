import {
  FULLSTACK_TEST_LAYERS,
  type FullstackAuthoredTestFile,
  type FullstackLayerResult,
  type FullstackTestLayer,
} from "@/lib/scenarios/fullstack-test-runner";
import {
  isFullstackRuntimeScenario,
  type FullstackRuntimeHandle,
  type FullstackRuntimeTargets,
} from "@/lib/scenarios/fullstack-runtime";
import { applyCheckpoint } from "@/lib/scenarios/session";
import type {
  CheckpointFile,
  LoadedScenario,
  ServedWorkspaceFile,
  SessionFile,
} from "@/lib/scenarios/types";
import type {
  VerificationGroupName,
  VerificationGroupResult,
  VerificationResult,
} from "@/lib/scenarios/verification";

const STEP_TEST_RE =
  /^tests\/(backend|frontend|integration)\/step-(\d+)\.(?:test|spec)\.[cm]?[jt]sx?$/i;

export interface FullstackStepVerificationDependencies {
  startRuntime(
    loaded: LoadedScenario,
    options: { files: readonly (ServedWorkspaceFile | SessionFile)[]; targets?: FullstackRuntimeTargets },
  ): Promise<FullstackRuntimeHandle>;
  resetRuntime?(runtime: FullstackRuntimeHandle): Promise<void>;
  resolveCheckpointFiles(scenarioSlug: string, stepId: string): Promise<CheckpointFile[]>;
  runTestFile(input: {
    layer: FullstackTestLayer;
    testFile: FullstackAuthoredTestFile;
    loaded: LoadedScenario;
    files: readonly (ServedWorkspaceFile | SessionFile)[];
    runtime: FullstackRuntimeHandle;
  }): Promise<FullstackLayerResult>;
}

export interface FullstackStepVerificationOptions {
  stepIndex: number;
  files?: readonly (ServedWorkspaceFile | SessionFile)[];
  includePreviousSteps?: boolean;
}

interface ParsedStepTestFile extends FullstackAuthoredTestFile {
  layer: FullstackTestLayer;
  stepNumber: number;
}

function parseStepTestFile(file: FullstackAuthoredTestFile): ParsedStepTestFile | null {
  const match = STEP_TEST_RE.exec(file.path);
  if (!match) return null;
  return {
    ...file,
    layer: match[1]!.toLowerCase() as FullstackTestLayer,
    stepNumber: Number(match[2]),
  };
}

export function selectStepScopedTestFiles(
  files: readonly FullstackAuthoredTestFile[],
  layer: FullstackTestLayer,
  stepIndex: number,
  includePreviousSteps = true,
): FullstackAuthoredTestFile[] {
  const maxStepNumber = stepIndex + 1;
  const minStepNumber = includePreviousSteps ? 1 : maxStepNumber;

  return files
    .map(parseStepTestFile)
    .filter(
      (file): file is ParsedStepTestFile =>
        file !== null && file.layer === layer && file.stepNumber >= minStepNumber && file.stepNumber <= maxStepNumber,
    )
    .sort((a, b) => a.stepNumber - b.stepNumber || a.path.localeCompare(b.path))
    .map((file) => ({ path: file.path, content: file.content }));
}

function summarizeOutputs(results: readonly FullstackLayerResult[]): string | undefined {
  const parts = results.flatMap((result) => {
    const chunks = [result.message, result.stdout, result.stderr].filter(
      (value): value is string => Boolean(value && value.trim()),
    );
    return chunks.length === 0 ? [] : chunks.join("\n");
  });
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

function aggregateGroup(
  name: VerificationGroupName,
  results: readonly FullstackLayerResult[],
): VerificationGroupResult {
  const command = results
    .map((result) => result.command)
    .filter((value): value is string => Boolean(value && value.trim()))
    .join("\n");

  return {
    name,
    ok: results.every((result) => result.status === "passed"),
    command: command || undefined,
    output: summarizeOutputs(results),
    durationMs: results.reduce((total, result) => total + result.durationMs, 0),
  };
}

function missingGroup(name: VerificationGroupName, reason: string): VerificationGroupResult {
  return {
    name,
    ok: false,
    durationMs: 0,
    reason,
    output: reason,
  };
}

function skippedGroup(name: VerificationGroupName, reason: string): VerificationGroupResult {
  return {
    name,
    ok: true,
    skipped: true,
    durationMs: 0,
    reason,
    output: reason,
  };
}

function runtimeTargetsForLayer(layer: FullstackTestLayer): FullstackRuntimeTargets {
  if (layer === "backend") return { backend: false, frontend: false };
  if (layer === "frontend") return { backend: true, frontend: false };
  return { backend: true, frontend: true };
}

function fileSignature(file: { path: string; content: string; role: string }): string {
  return `${file.path}\u0000${file.role}\u0000${file.content}`;
}

function compareWorkspaceFiles(
  actual: readonly (ServedWorkspaceFile | SessionFile)[],
  expected: readonly (ServedWorkspaceFile | SessionFile)[],
): { ok: true } | { ok: false; reason: string } {
  const actualByPath = new Map(actual.map((file) => [file.path, file]));
  const expectedByPath = new Map(expected.map((file) => [file.path, file]));
  const missing: string[] = [];
  const unexpected: string[] = [];
  const mismatched: string[] = [];

  for (const [path, expectedFile] of expectedByPath) {
    const actualFile = actualByPath.get(path);
    if (!actualFile) {
      missing.push(path);
      continue;
    }
    if (fileSignature(actualFile) !== fileSignature(expectedFile)) {
      mismatched.push(path);
    }
  }

  for (const path of actualByPath.keys()) {
    if (!expectedByPath.has(path)) unexpected.push(path);
  }

  if (missing.length === 0 && unexpected.length === 0 && mismatched.length === 0) {
    return { ok: true };
  }

  const details = [
    missing.length ? `missing: ${missing.join(", ")}` : null,
    mismatched.length ? `changed: ${mismatched.join(", ")}` : null,
    unexpected.length ? `unexpected: ${unexpected.join(", ")}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    ok: false,
    reason: `Workspace does not match the authored checkpoint solution (${details.join("; ")}).`,
  };
}

async function buildExpectedWorkspace(
  loaded: LoadedScenario,
  deps: FullstackStepVerificationDependencies,
  stepIndex: number,
  includePreviousSteps: boolean,
): Promise<readonly (ServedWorkspaceFile | SessionFile)[]> {
  const startIndex = includePreviousSteps ? 0 : stepIndex;
  const checkpointFiles: CheckpointFile[] = [];

  for (let i = startIndex; i <= stepIndex; i += 1) {
    const step = loaded.scenario.steps[i];
    if (!step) continue;
    const files = await deps.resolveCheckpointFiles(loaded.slug, step.id);
    checkpointFiles.push(...files);
  }

  if (checkpointFiles.length === 0) {
    return [];
  }

  return applyCheckpoint(loaded.files, loaded.entry, checkpointFiles).files;
}

export async function verifyFullstackScenarioStep(
  loaded: LoadedScenario,
  authoredTests: readonly FullstackAuthoredTestFile[],
  deps: FullstackStepVerificationDependencies,
  options: FullstackStepVerificationOptions,
): Promise<VerificationResult> {
  if (!isFullstackRuntimeScenario(loaded)) {
    throw new Error(`Scenario "${loaded.slug}" is not a fullstack runtime scenario.`);
  }

  const files = options.files ?? loaded.files;
  const includePreviousSteps = options.includePreviousSteps ?? true;
  const selected = new Map<FullstackTestLayer, FullstackAuthoredTestFile[]>(
    FULLSTACK_TEST_LAYERS.map((layer) => [
      layer,
      selectStepScopedTestFiles(authoredTests, layer, options.stepIndex, includePreviousSteps),
    ]),
  );

  const startedAt = Date.now();
  const groups: VerificationGroupResult[] = [];
  const integrationTests = selected.get("integration") ?? [];
  let sharedRuntime: FullstackRuntimeHandle | null = null;

  const expectedWorkspace = await buildExpectedWorkspace(loaded, deps, options.stepIndex, includePreviousSteps);
  if (expectedWorkspace.length > 0) {
    const workspaceCheck = compareWorkspaceFiles(files, expectedWorkspace);
    const workspaceGroup = workspaceCheck.ok
      ? {
          name: "workspace" as const,
          ok: true,
          durationMs: 0,
          reason: `Workspace matches the authored checkpoint solution for step ${options.stepIndex + 1}.`,
        }
      : missingGroup("workspace", workspaceCheck.reason);

    if (!workspaceGroup.ok) {
      const failureGroups: VerificationGroupResult[] = [
        workspaceGroup,
        skippedGroup("backend", "Skipped because the workspace did not match the authored checkpoint solution."),
        skippedGroup("frontend", "Skipped because the workspace did not match the authored checkpoint solution."),
        skippedGroup("integration", "Skipped because the workspace did not match the authored checkpoint solution."),
      ];

      return {
        engine: "fullstack",
        mode: "scenario-step",
        scenarioSlug: loaded.slug,
        stepIndex: options.stepIndex,
        status: "failed",
        passed: false,
        message: "Step checks failed.",
        durationMs: Date.now() - startedAt,
        finishedAt: Date.now(),
        errors: [{ message: workspaceGroup.reason ?? "Workspace checkpoint verification failed.", kind: "workspace" }],
        groups: failureGroups,
        testResults: failureGroups.map((group) => ({
          name: group.name,
          status: group.skipped ? "skipped" : group.ok ? "passed" : "failed",
          message: group.reason,
          durationMs: group.durationMs,
        })),
      };
    }

    groups.push(workspaceGroup);
  }

  try {
    for (const layer of FULLSTACK_TEST_LAYERS) {
      const testFiles = selected.get(layer) ?? [];
      if (testFiles.length === 0) {
        groups.push(
          layer === "frontend"
            ? skippedGroup("frontend", "No frontend step tests found; frontend checks are optional.")
            : missingGroup(layer, `No ${layer} step tests found for step ${options.stepIndex + 1}.`),
        );
        continue;
      }

      let runtime: FullstackRuntimeHandle;
      let ownsRuntime = false;
      if (layer === "frontend" && integrationTests.length > 0) {
        sharedRuntime ??= await deps.startRuntime(loaded, { files, targets: { backend: true, frontend: true } });
        runtime = sharedRuntime;
      } else if (layer === "integration" && sharedRuntime) {
        runtime = sharedRuntime;
      } else {
        runtime = await deps.startRuntime(loaded, { files, targets: runtimeTargetsForLayer(layer) });
        ownsRuntime = true;
      }

      const results: FullstackLayerResult[] = [];
      try {
        for (const testFile of testFiles) {
          if (layer !== "backend" && deps.resetRuntime) {
            await deps.resetRuntime(runtime);
          }
          results.push(await deps.runTestFile({ layer, testFile, loaded, files, runtime }));
        }
      } finally {
        if (ownsRuntime) {
          await runtime.stop();
        }
      }
      groups.push(aggregateGroup(layer, results));
    }
  } finally {
    await sharedRuntime?.stop();
  }

  const passed = groups.every((group) => group.ok || group.skipped);
  return {
    engine: "fullstack",
    mode: "scenario-step",
    scenarioSlug: loaded.slug,
    stepIndex: options.stepIndex,
    status: passed ? "passed" : "failed",
    passed,
    message: passed ? "Step checks passed." : "Step checks failed.",
    durationMs: Date.now() - startedAt,
    finishedAt: Date.now(),
    errors: [],
    groups,
    testResults: groups.map((group) => ({
      name: group.name,
      status: group.skipped ? "skipped" : group.ok ? "passed" : "failed",
      message: group.reason,
      durationMs: group.durationMs,
    })),
  };
}
