import { loadAuthoredBundleBySlug } from "@/server/scenarios/authoring";
import { loadScenario } from "@/server/scenarios/load";
import { realMlStepVerificationDependencies } from "@/server/scenarios/machine-learning-verification-dependencies";
import {
  verifyMlScenarioFinal,
  verifyMlScenarioStep,
  type MlAuthoredTestFile,
} from "@/lib/scenarios/machine-learning-step-verification";
import type { ServedWorkspaceFile, SessionFile } from "@/lib/scenarios/types";
import type { VerificationResult } from "@/lib/scenarios/verification";
import { timePerf } from "@/server/scenarios/perf";

/** Authored `tests/step-N.test.py` files for a scenario, read off disk. Never
 *  served to the candidate — only fetched here, server-side, at verification time. */
function authoredMlTests(slug: string): MlAuthoredTestFile[] {
  const authored = loadAuthoredBundleBySlug(slug);
  if (!authored) throw new Error(`scenario not found: "${slug}"`);

  return Object.entries(authored.bundle.files)
    .filter(([path]) => path.startsWith("tests/"))
    .map(([path, content]) => ({ path, content }));
}

function workspaceFilesRecord(files: readonly (ServedWorkspaceFile | SessionFile)[]): Record<string, string> {
  return Object.fromEntries(files.map((file) => [file.path, file.content]));
}

export async function verifyMlStep(input: {
  scenarioSlug: string;
  stepIndex: number;
  files: readonly (ServedWorkspaceFile | SessionFile)[];
  includePreviousSteps?: boolean;
  timeoutMs?: number;
}): Promise<VerificationResult> {
  return timePerf(
    "verification.mlStep",
    async () => {
      const loaded = await loadScenario(input.scenarioSlug, { includeAuthorOnly: false });
      const authoredTests = authoredMlTests(input.scenarioSlug);
      return verifyMlScenarioStep(loaded, authoredTests, realMlStepVerificationDependencies, {
        stepIndex: input.stepIndex,
        includePreviousSteps: input.includePreviousSteps ?? loaded.scenario.verification?.includePreviousSteps ?? true,
        files: workspaceFilesRecord(input.files),
        timeoutMs: input.timeoutMs,
      });
    },
    { slug: input.scenarioSlug, stepIndex: input.stepIndex, fileCount: input.files.length },
  );
}

export async function verifyMlFinal(input: {
  scenarioSlug: string;
  files: readonly (ServedWorkspaceFile | SessionFile)[];
  timeoutMs?: number;
}): Promise<VerificationResult> {
  return timePerf(
    "verification.mlFinal",
    async () => {
      const loaded = await loadScenario(input.scenarioSlug, { includeAuthorOnly: false });
      const authoredTests = authoredMlTests(input.scenarioSlug);
      return verifyMlScenarioFinal(loaded, authoredTests, realMlStepVerificationDependencies, {
        files: workspaceFilesRecord(input.files),
        timeoutMs: input.timeoutMs,
      });
    },
    { slug: input.scenarioSlug, fileCount: input.files.length },
  );
}
