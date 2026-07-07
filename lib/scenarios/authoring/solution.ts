import { checkpointTargetPath, normalizeSolutionImports } from "@/lib/scenarios/checkpoints";
import { ensureAuthoringDom } from "@/lib/scenarios/authoring/jsdom-env";
import { resolveExecutionProfile } from "@/lib/scenarios/execution/profile";
import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";
import type { SnapshotFile, VerificationResult } from "@/lib/scenarios/verification";
import type { Scenario } from "@/lib/scenarios/schema";

/**
 * Solution validation (executes tests). For every verification step it overlays
 * the step's reference solution (its checkpoint files) onto the workspace and runs
 * the step's authored tests — the official solution MUST pass every test. This is
 * the correctness gate that makes a broken checkpoint / broken test impossible to
 * ship unnoticed.
 *
 * The step is executed by routing through the SAME `ExecutionPlatform` production
 * uses (Phase 10): the validator builds a language-agnostic `ExecutionContext` and
 * hands it to an injected verifier, so engine selection comes entirely from the
 * scenario's profile (React / Node / Express / SQLite). There is no per-harness
 * branching here — a step whose engine isn't implemented yet simply comes back
 * `unsupported` and is reported as a non-fatal suggestion.
 */

/** Verify one execution context — the injected seam onto the ExecutionPlatform. */
export type SolutionVerifier = (context: ExecutionContext) => Promise<VerificationResult>;

type Step = Scenario["steps"][number];

function baseWorkspace(scenario: Scenario, bundle: AuthoredBundle): SnapshotFile[] {
  return scenario.workspace.files
    .map((f) => ({ path: f.path, role: f.role, content: bundle.files[`workspace/${f.path}`] }))
    .filter((f): f is SnapshotFile => f.content !== undefined);
}

/** Overlay a step's checkpoint solution files onto the base workspace. */
function applySolution(base: SnapshotFile[], step: Step, bundle: AuthoredBundle): SnapshotFile[] {
  const byPath = new Map(base.map((f) => [f.path, { ...f }]));
  for (const solutionPath of step.checkpoint?.files ?? []) {
    const content = bundle.files[solutionPath];
    if (content === undefined) continue; // missing file already reported by step validator
    const target = checkpointTargetPath(solutionPath);
    byPath.set(target, { path: target, role: "edit", content: normalizeSolutionImports(content) });
  }
  return [...byPath.values()];
}

/**
 * The scenario's provisioned database sources, read from the IN-MEMORY bundle (not
 * the filesystem), so the toolkit validates exactly the authored `database/` files.
 * `undefined` when the profile declares no database or the schema is absent (the
 * missing-schema case is already reported by the execution validator).
 */
function databaseSources(bundle: AuthoredBundle, profile: ReturnType<typeof resolveExecutionProfile>): ExecutionContext["database"] {
  if (!profile.database) return undefined;
  const schema = bundle.files["database/schema.sql"];
  if (schema === undefined) return undefined;
  const seed = bundle.files["database/seed.sql"];
  return { schema, seed };
}

export async function validateSolution(bundle: AuthoredBundle, verify: SolutionVerifier): Promise<Diagnostic[]> {
  const { scenario } = bundle;
  if (!scenario) return [];

  const out: Diagnostic[] = [];
  const profile = resolveExecutionProfile(scenario);
  const base = baseWorkspace(scenario, bundle);
  const database = databaseSources(bundle, profile);

  // The React engine renders under a DOM; install one (idempotent) BEFORE its
  // runtime loads. Backend engines (Node/Express/SQLite) need no DOM.
  if (profile.engine === "react") await ensureAuthoringDom();

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i]!;
    const at = `scenario.md → steps[${i}] (${step.id})`;
    const needsTests = step.verification === "automated-tests" || step.verification === "hybrid";
    if (!needsTests) continue;

    const testFiles = (step.verify.tests ?? [])
      .map((path) => ({ path, content: bundle.files[path] }))
      .filter((t): t is { path: string; content: string } => t.content !== undefined);
    if (testFiles.length === 0) continue; // missing tests already reported

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

    const context: ExecutionContext = {
      scenarioSlug: bundle.slug,
      scenario,
      step: {
        id: step.id,
        harness: step.verify.harness,
        functionName: step.verify.functionName,
        tests: step.verify.tests,
        timeoutMs: step.verify.timeoutMs,
      },
      workspaceFiles: applySolution(base, step, bundle),
      testFiles,
      profile,
      database,
      verificationOptions: { timeoutMs: step.verify.timeoutMs },
      environment: "server",
      metadata: {},
    };

    let result: VerificationResult;
    try {
      result = await verify(context);
    } catch (e) {
      out.push(
        diag.error(
          "solution/run-crashed",
          at,
          `running the reference solution against the tests threw: ${(e as Error).message}`,
          "Fix the reference solution or tests so they load without crashing.",
        ),
      );
      continue;
    }

    out.push(...diagnoseResult(result, at));
  }

  return out;
}

/** Map a `VerificationResult` from the platform into authoring diagnostics. The
 *  codes are stable across engines so React scenarios report exactly as before. */
function diagnoseResult(result: VerificationResult, at: string): Diagnostic[] {
  // The step's engine isn't implemented yet (placeholder / none) — advisory only,
  // never a failure, so a mixed library still validates.
  if (result.status === "unsupported" || result.status === "manual") {
    return [
      diag.suggestion(
        "solution/harness-not-runnable",
        at,
        result.message ?? "cannot auto-verify this step's engine in the toolkit yet.",
        "Verify this step's solution manually until its VerificationEngine lands.",
      ),
    ];
  }

  // The solution/tests failed to compile/load, or setup (schema/seed) failed.
  if (result.status === "errored" || result.errors.length > 0) {
    return [
      diag.error(
        "solution/load-error",
        at,
        `the reference solution / tests failed to load: ${result.errors.map((e) => e.message).join("; ") || "unknown error"}`,
        "Fix imports/syntax in the solution or test files (paths resolve, exports match).",
      ),
    ];
  }

  if (result.testResults.length === 0) {
    return [
      diag.warning(
        "solution/no-tests-ran",
        at,
        "no tests actually ran for this step.",
        "Ensure the test file registers tests (test/it) so the step is really verified.",
      ),
    ];
  }

  const failed = result.testResults.filter((t) => t.status !== "passed");
  if (failed.length > 0) {
    return [
      diag.error(
        "solution/tests-fail",
        at,
        `the reference solution does NOT pass its own tests: ${failed.map((t) => `"${t.name}"`).join(", ")}.`,
        "The official solution must pass every authored test. Fix the solution (solution/<step>/…) or the tests until green.",
      ),
    ];
  }

  return [];
}
