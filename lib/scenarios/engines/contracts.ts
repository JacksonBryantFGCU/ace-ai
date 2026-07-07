import type { SnapshotFile, VerificationRequest, VerificationResult } from "@/lib/scenarios/verification";

/**
 * STABLE CONTRACTS between the interview runtime and execution engines.
 *
 * These interfaces are intended to be long-lived: every future engine (Node,
 * SQL, Docker, browser-automation, AI evaluation, …) plugs into them without the
 * runtime or the VerificationService changing. See
 * `docs/README.md` for the narrative.
 *
 * Layering:
 *   VerificationService  (generic; in verification.ts)
 *     └─ VerificationEngine.verify(VerificationRequest) → VerificationResult   [generic]
 *          └─ TestSource.resolve(...)        → AuthoredTestFile[]   [how an engine gets its tests]
 *          └─ <engine-internal runner>       → TestRunResult        [how an engine executes]
 *
 * The first two are already defined in `verification.ts` and re-exported here so
 * engine code has a single import site. The last two are engine-facing contracts.
 */

export type { SnapshotFile, VerificationRequest, VerificationResult };

/** One authored test file: a workspace-relative path + its verbatim source. */
export interface AuthoredTestFile {
  /** e.g. `tests/step-1.test.tsx` (as declared in the step's `verify.tests`). */
  path: string;
  content: string;
}

/**
 * How an engine obtains the authored tests for a step. Decoupled from *where*
 * they live (filesystem today; DB/remote/generated later). Implementations are
 * server-side; the client reaches them through a server action.
 */
export interface TestSource {
  resolve(scenarioSlug: string, stepId: string): Promise<AuthoredTestFile[]>;
}

/** A single test's outcome, engine-neutral. */
export interface TestOutcome {
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

/** A load/transform/harness failure that prevented tests from running. */
export interface TestRunError {
  message: string;
  /** e.g. "transform" | "load" | "timeout" | "harness". */
  kind?: string;
  stack?: string;
}

/**
 * The normalized result of executing a set of tests against a workspace snapshot.
 * Every execution backend (browser runner, Node VM, container, …) returns this
 * shape; the engine maps it into a `VerificationResult`.
 */
export interface TestRunResult {
  tests: TestOutcome[];
  errors: TestRunError[];
}

/** Input to an execution backend: the candidate's files + the authored tests. */
export interface TestRunInput {
  workspaceFiles: SnapshotFile[];
  testFiles: AuthoredTestFile[];
  timeoutMs?: number;
}

/** An execution backend — one concrete way to run `TestRunInput` → `TestRunResult`. */
export type TestRunner = (input: TestRunInput) => Promise<TestRunResult>;
