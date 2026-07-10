import "server-only";

import { executionPlatform } from "@/server/scenarios/execution-platform";
import { verifyScenarioStep } from "@/server/scenarios/fullstack-step-verification";
import { verifyMlFinal, verifyMlStep } from "@/server/scenarios/machine-learning-step-verification";
import { testSource } from "@/server/scenarios/test-source";
import { databaseSource } from "@/server/scenarios/database-source";
import { loadScenario } from "@/server/scenarios/load";
import { ensureDomEnv } from "@/server/scenarios/dom-env";
import { profileFromHarness, resolveExecutionProfile, type ExecutionProfile } from "@/lib/scenarios/execution/profile";
import { resolveVerificationMode } from "@/lib/scenarios/verification-mode";
import type { AuthoredTestFile } from "@/lib/scenarios/engines/contracts";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";
import type { SnapshotFile, VerificationResult, VerifyInput } from "@/lib/scenarios/verification";

/**
 * The server-side verification entrypoint — unchanged signature, new internals.
 *
 * It builds a language-agnostic `ExecutionContext` (deriving the execution
 * profile from the step's harness) and hands it to the `ExecutionPlatform`,
 * which selects the right engine from the registry. React routes to the React
 * engine (the existing component pipeline); every other harness routes to its
 * registered placeholder and returns a structured "not implemented" result.
 * There is no per-language branching here.
 *
 * The React engine runs authored tests against a shared, process-wide jsdom
 * document (`ensureDomEnv`), so runs must not interleave. A simple promise queue
 * serializes them; they are low-frequency (one per candidate action), so
 * sequential execution keeps DOM state isolated between candidates.
 */
let queue: Promise<unknown> = Promise.resolve();

export function verifyStepOnServer(input: VerifyInput): Promise<VerificationResult> {
  const run = queue.then(async () => {
    const loaded = await loadScenario(input.scenarioSlug, { includeAuthorOnly: false });
    const mode = resolveVerificationMode(loaded.scenario, "step");

    if (mode === "scenario-step") {
      const stepIndex = loaded.scenario.steps.findIndex((step) => step.id === input.step.id);
      if (stepIndex === -1) {
        throw new Error(`step not found: '${input.step.id}' in '${input.scenarioSlug}'`);
      }
      return verifyScenarioStep({
        scenarioSlug: input.scenarioSlug,
        stepIndex,
        files: input.files,
      });
    }

    if (mode === "python-step") {
      const stepIndex = loaded.scenario.steps.findIndex((step) => step.id === input.step.id);
      if (stepIndex === -1) {
        throw new Error(`step not found: '${input.step.id}' in '${input.scenarioSlug}'`);
      }
      return verifyMlStep({
        scenarioSlug: input.scenarioSlug,
        stepIndex,
        files: input.files,
        timeoutMs: input.step.timeoutMs,
      });
    }

    ensureDomEnv();
    const context = await buildExecutionContext(input, loaded);
    return executionPlatform.verify(context);
  });
  // Keep the chain alive regardless of the individual run's outcome.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Final-submission verification (Phase 4 UI for the Phase 3 `python-final`
 * verifier). Shares `verifyStepOnServer`'s queue so an ML final run never
 * interleaves with a step run for the same process. Only `machine-learning`
 * scenarios have a real final verifier today; every other type gets a clearly
 * labeled "not available yet" manual result instead of silently doing nothing —
 * harmless since no non-ML UI calls this yet (fullstack/backend behavior is
 * unchanged either way).
 */
export function verifyFinalOnServer(input: {
  scenarioSlug: string;
  files: readonly SnapshotFile[];
}): Promise<VerificationResult> {
  const run = queue.then(async () => {
    const loaded = await loadScenario(input.scenarioSlug, { includeAuthorOnly: false });
    const mode = resolveVerificationMode(loaded.scenario, "final");

    if (mode === "python-final") {
      return verifyMlFinal({ scenarioSlug: input.scenarioSlug, files: input.files });
    }

    return {
      engine: "final",
      mode,
      scenarioSlug: input.scenarioSlug,
      status: "manual",
      passed: false,
      message: "Final validation is not available for this scenario type yet.",
      durationMs: 0,
      finishedAt: Date.now(),
      errors: [],
      testResults: [],
    } satisfies VerificationResult;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Assemble the ExecutionContext for a single server-side run. */
async function buildExecutionContext(input: VerifyInput, loaded?: Awaited<ReturnType<typeof loadScenario>>): Promise<ExecutionContext> {
  const profile = profileFromHarness(input.step.harness);
  const testFiles = await resolveTestFiles(input.scenarioSlug, input.step.id);

  // Backend enrichment: only when the harness resolves to the Node engine do we
  // consult the scenario's metadata (framework/database) and load its database/
  // sources. Existing React/placeholder scenarios don't take this path, so their
  // behavior is unchanged.
  let database: ExecutionContext["database"];
  if (profile.engine === "node") {
    const full = loaded ? resolveExecutionProfile(loaded.scenario) : await loadNodeProfile(input.scenarioSlug);
    if (full) {
      profile.framework = full.framework;
      profile.database = full.database;
    }
    if (profile.database) database = databaseSource.resolve(input.scenarioSlug);
  }

  return {
    scenarioSlug: input.scenarioSlug,
    step: input.step,
    workspaceFiles: input.files,
    testFiles,
    profile,
    database,
    verificationOptions: { timeoutMs: input.step.timeoutMs, signal: input.signal },
    environment: "server",
    metadata: {},
  };
}

/** Resolve the scenario's full execution profile (framework/database from
 *  metadata). Best-effort: a load failure leaves the harness-derived profile. */
async function loadNodeProfile(slug: string): Promise<ExecutionProfile | null> {
  try {
    const loaded = await loadScenario(slug);
    return resolveExecutionProfile(loaded.scenario);
  } catch {
    return null;
  }
}

/** Read the step's authored tests; never fatal — engines that don't need tests
 *  (placeholders) simply ignore them. */
async function resolveTestFiles(slug: string, stepId: string): Promise<AuthoredTestFile[]> {
  try {
    return await testSource.resolve(slug, stepId);
  } catch {
    return [];
  }
}
