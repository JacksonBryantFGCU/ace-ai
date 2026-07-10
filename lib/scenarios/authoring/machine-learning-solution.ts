import { checkpointTargetPath, normalizeSolutionImports } from "@/lib/scenarios/checkpoints";
import {
  verifyMlScenarioFinal,
  verifyMlScenarioStep,
  type MlAuthoredTestFile,
  type MlStepVerificationDependencies,
} from "@/lib/scenarios/machine-learning-step-verification";
import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { Scenario } from "@/lib/scenarios/schema";
import type { VerificationResult } from "@/lib/scenarios/verification";

/**
 * ML solution validation (Phase: replaces the `solution/harness-not-runnable`
 * placeholder). Machine-learning scenarios are script/pytest-based, not a
 * single-step `harness` the generic `ExecutionPlatform` engine registry can
 * dispatch (that registry assumes one step = one isolated test run; ML steps
 * are CUMULATIVE — step 3's checkpoint must also pass steps 1 and 2's tests
 * when `includePreviousSteps: true`). Rather than retrofit that cross-step
 * dependency into the shared `ExecutionEngine` contract, this module routes
 * authoring-time validation through the exact SAME real engine production
 * interviews use — `verifyMlScenarioStep` / `verifyMlScenarioFinal`
 * (`lib/scenarios/machine-learning-step-verification.ts`) — via the same
 * `MlStepVerificationDependencies` injection seam `server/scenarios/machine-
 * learning-step-verification.ts` uses for real candidates. No parallel ML
 * execution system, no scenario-specific hardcoding: the same pytest command,
 * the same cumulative test selection, the same result shape.
 *
 * Mirrors `lib/scenarios/authoring/solution.ts`'s structure (pure, in-memory
 * `AuthoredBundle` in — `Diagnostic[]` out) so the two solution validators
 * read the same way even though they dispatch through different engines.
 */

/** Injected dependencies: the exact same `MlStepVerificationDependencies`
 *  shape real interview verification uses (`runPytest`, and optionally
 *  `runMainAndReadArtifact` for scenarios that configure `execution.
 *  artifacts.metrics.required: true`) — composed once in
 *  `server/scenarios/authoring.ts` from the real `runMachineLearningPytest` /
 *  `runMlScriptPreview`, the exact functions `server/scenarios/machine-
 *  learning-step-verification.ts` wires into real interview verification. */
export type MlSolutionRunner = MlStepVerificationDependencies;

function baseWorkspace(scenario: Scenario, bundle: AuthoredBundle): Record<string, string> {
  const files: Record<string, string> = {};
  for (const f of scenario.workspace.files) {
    const content = bundle.files[`workspace/${f.path}`];
    if (content !== undefined) files[f.path] = content;
  }
  return files;
}

/** Overlay ONE step's checkpoint solution onto the base workspace. Each
 *  `solution/step-N/` folder is a COMPLETE, self-contained checkpoint by
 *  convention (not an incremental diff), so this never accidentally pulls in
 *  a later step's solution code for an earlier step — step i only ever reads
 *  `scenario.steps[i].checkpoint.files`. */
function applySolution(base: Record<string, string>, step: Scenario["steps"][number], bundle: AuthoredBundle): Record<string, string> {
  const files = { ...base };
  for (const solutionPath of step.checkpoint?.files ?? []) {
    const content = bundle.files[solutionPath];
    if (content === undefined) continue; // missing file already reported by the structural validator
    const target = checkpointTargetPath(solutionPath);
    files[target] = normalizeSolutionImports(content);
  }
  return files;
}

/** Every authored `tests/*.test.py` file in the bundle — never candidate-facing,
 *  read here only for the authoring-time run. */
function authoredMlTests(bundle: AuthoredBundle): MlAuthoredTestFile[] {
  return Object.entries(bundle.files)
    .filter(([path]) => path.startsWith("tests/"))
    .map(([path, content]) => ({ path, content }));
}

/** A `LoadedScenario` shaped just enough to satisfy `verifyMlScenarioStep`'s
 *  signature. `files`/`entry` are unused at authoring time because the
 *  candidate workspace is always supplied explicitly via `options.files`. */
function bundleAsLoadedScenario(bundle: AuthoredBundle, scenario: Scenario): LoadedScenario {
  return {
    slug: bundle.slug,
    category: bundle.category,
    scenario,
    sections: bundle.sections,
    files: [],
    entry: scenario.workspace.entry,
  };
}

/** Map a real ML `VerificationResult` into authoring diagnostics. Candidate-
 *  facing verification already redacts hidden test source / solution code
 *  (only stdout/stderr from the RUN appear in `groups[].output`); this reuses
 *  that same result, so authoring diagnostics carry no more than a real
 *  candidate would ever see for the same failure. */
function diagnoseMlResult(result: VerificationResult, at: string): Diagnostic[] {
  if (result.passed) return [];

  const pythonGroup = result.groups?.find((g) => g.name === "python");
  const errorSummary = result.errors.map((e) => e.message).join("; ");
  const detail = pythonGroup?.reason || errorSummary || result.message || "unknown failure";
  const output = pythonGroup?.output;

  return [
    diag.error(
      "solution/tests-fail",
      at,
      `the reference solution does NOT pass its own tests: ${detail}.${output ? `\n${output}` : ""}`,
      "The official solution must pass every authored test. Fix the solution (solution/<step>/…) or the tests until green.",
    ),
  ];
}

/**
 * Validate every ML checkpoint (and the final cumulative solution) by
 * actually running them through the real pytest-based engine. Returns one
 * `solution/tests-fail` error per checkpoint that doesn't pass its own
 * (cumulative) tests — a genuinely broken reference solution can no longer
 * validate cleanly.
 */
export async function validateMachineLearningSolution(
  bundle: AuthoredBundle,
  deps: MlSolutionRunner,
): Promise<Diagnostic[]> {
  const { scenario } = bundle;
  // Self-contained guard (the caller in `solution.ts` already gates on this,
  // but this module must never assume it's the only caller — a non-ML
  // scenario passed here is simply a no-op, not a crash).
  if (!scenario || scenarioTypeOf(scenario) !== "machine-learning") return [];

  const out: Diagnostic[] = [];
  const base = baseWorkspace(scenario, bundle);
  const authoredTests = authoredMlTests(bundle);
  const loaded = bundleAsLoadedScenario(bundle, scenario);
  const includePreviousSteps = scenario.verification?.includePreviousSteps ?? true;

  let finalFiles: Record<string, string> | null = null;

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i]!;
    const at = `scenario.md → steps[${i}] (${step.id})`;

    if (!step.checkpoint || step.checkpoint.files.length === 0) {
      out.push(
        diag.warning(
          "solution/no-reference-solution",
          at,
          "verification step has no checkpoint (reference solution) to validate its tests against.",
          "Add `checkpoint: { files: [solution/<step>/…] }` so the official solution can be auto-checked.",
        ),
      );
      continue;
    }

    const files = applySolution(base, step, bundle);
    if (i === scenario.steps.length - 1) finalFiles = files;

    let result: VerificationResult;
    try {
      result = await verifyMlScenarioStep(loaded, authoredTests, deps, {
        stepIndex: i,
        includePreviousSteps,
        files,
      });
    } catch (e) {
      out.push(
        diag.error(
          "solution/run-crashed",
          at,
          `running the reference solution against the tests threw: ${(e as Error).message}`,
          "Fix the reference solution or tests so they load without crashing (e.g. a missing dependency or Python runtime).",
        ),
      );
      continue;
    }

    out.push(...diagnoseMlResult(result, at));
  }

  // Final validation (`python-final`) — the last checkpoint must also pass
  // EVERY authored step test run together, exactly like a candidate's
  // "Run final checks".
  if (finalFiles) {
    const at = "scenario.md → steps (final)";
    try {
      const result = await verifyMlScenarioFinal(loaded, authoredTests, deps, { files: finalFiles });
      out.push(...diagnoseMlResult(result, at));
    } catch (e) {
      out.push(
        diag.error(
          "solution/run-crashed",
          at,
          `running final validation against the reference solution threw: ${(e as Error).message}`,
          "Fix the reference solution or tests so final validation loads without crashing.",
        ),
      );
    }
  }

  return out;
}
