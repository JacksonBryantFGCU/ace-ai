import {
  FULLSTACK_TEST_LAYERS,
  type FullstackAuthoredTestFile,
  type FullstackLayerResult,
  type FullstackTestLayer,
} from "@/lib/scenarios/fullstack-test-runner";
import { isFullstackRuntimeScenario, type FullstackRuntimeHandle } from "@/lib/scenarios/fullstack-runtime";
import type {
  VerificationGroupName,
  VerificationGroupResult,
  VerificationResult,
} from "@/lib/scenarios/verification";
import type { LoadedScenario, ServedWorkspaceFile, SessionFile } from "@/lib/scenarios/types";

const STEP_TEST_RE =
  /^tests\/(backend|frontend|integration)\/step-(\d+)\.(?:test|spec)\.[cm]?[jt]sx?$/i;

export interface FullstackStepVerificationDependencies {
  startRuntime(
    loaded: LoadedScenario,
    options: { files: readonly (ServedWorkspaceFile | SessionFile)[] },
  ): Promise<FullstackRuntimeHandle>;
  resetRuntime?(runtime: FullstackRuntimeHandle): Promise<void>;
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
  const runtime = await deps.startRuntime(loaded, { files });
  try {
    const groups: VerificationGroupResult[] = [];

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

      const results: FullstackLayerResult[] = [];
      for (const testFile of testFiles) {
        if (layer !== "backend" && deps.resetRuntime) {
          await deps.resetRuntime(runtime);
        }
        results.push(await deps.runTestFile({ layer, testFile, loaded, files, runtime }));
      }
      groups.push(aggregateGroup(layer, results));
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
  } finally {
    await runtime.stop();
  }
}
