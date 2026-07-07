import type {
  VerificationEngine,
  VerificationRequest,
  VerificationResult,
} from "@/lib/scenarios/verification";
import type { TestSource, TestRunResult } from "@/lib/scenarios/engines/contracts";

/**
 * The React `component` engine — ONE implementation of the generic
 * `VerificationEngine`. It knows nothing about the VerificationService and adds
 * no React-isms to it; the service simply dispatches to it by `harness`.
 *
 * Responsibilities:
 *   1. Fetch the step's authored tests via an injected `TestSource` (decoupled
 *      from where tests live).
 *   2. Lazily load the heavy browser runner and execute those tests against the
 *      request's workspace snapshot.
 *   3. Map the neutral `TestRunResult` into a `VerificationResult`.
 *
 * The runner is imported dynamically so RTL + `typescript` never enter the main
 * bundle — they load on first verification only.
 */
export function createComponentEngine(deps: { testSource: TestSource }): VerificationEngine {
  return {
    harness: "component",
    async verify(request: VerificationRequest): Promise<VerificationResult> {
      const startedAt = Date.now();
      const workspaceFiles = request.snapshot.files.map((f) => ({ path: f.path, content: f.content, role: f.role }));

      const testFiles = await deps.testSource.resolve(request.scenarioSlug, request.step.id);
      const { runAuthoredTests } = await import("@/lib/scenarios/engines/browser-test-runtime");
      const run: TestRunResult = await runAuthoredTests({
        workspaceFiles,
        testFiles,
        timeoutMs: request.step.timeoutMs,
      });

      const durationMs = Date.now() - startedAt;
      const testResults = run.tests.map((t) => ({
        name: t.name,
        status: (t.passed ? "passed" : "failed") as "passed" | "failed",
        message: t.message,
        durationMs: t.durationMs,
      }));

      const hadError = run.errors.length > 0;
      const allPassed = run.tests.length > 0 && run.tests.every((t) => t.passed);
      const status: VerificationResult["status"] = hadError
        ? "errored"
        : allPassed
          ? "passed"
          : "failed";

      return {
        engine: "component",
        status,
        passed: status === "passed",
        testResults,
        durationMs,
        errors: run.errors,
        finishedAt: Date.now(),
        meta: { functionName: request.step.functionName ?? null },
      };
    },
  };
}
