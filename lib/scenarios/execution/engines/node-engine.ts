import type { VerificationResult, TestCaseResult, VerificationError } from "@/lib/scenarios/verification";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";
import type { ExecutionEngine, WorkspaceValidation } from "@/lib/scenarios/execution/engine";
import { NO_CAPABILITIES, type EngineCapabilities } from "@/lib/scenarios/execution/capabilities";
import type { ExecutionProfile } from "@/lib/scenarios/execution/profile";
import type { NodeRunResult } from "@/lib/scenarios/execution/engines/node/runtime";
import type { ApiPreviewMethod, ApiPreviewResponse } from "@/lib/scenarios/preview/api";

/**
 * The Node verification engine (v1) — the first production BACKEND engine.
 *
 * It runs pure TypeScript module interviews entirely server-side: candidate code
 * never touches the browser. It consumes the SAME `ExecutionContext` as the React
 * engine and returns the SAME `VerificationResult`, so the platform, registry,
 * and interview runtime treat it identically — nothing branches on language.
 *
 * The heavy runtime (TypeScript + vm linker + harness) is imported dynamically so
 * it only loads on first Node verification, never entering the main bundle.
 */
const NODE_CAPABILITIES: EngineCapabilities = {
  ...NO_CAPABILITIES,
  // v1 supports multiple TS modules + a fresh isolated environment per run.
  // Everything else (browser/preview/filesystem/network/database/terminal) is
  // intentionally out of scope — see the engine's diagnostics for rejections.
  supportsMultipleFiles: true,
  supportsSnapshots: true,
  // The engine can provision an in-memory database (SQLite) for a run.
  supportsDatabase: true,
};

export const nodeEngine: ExecutionEngine = {
  id: "node",
  displayName: "Node",

  capabilities: () => NODE_CAPABILITIES,

  supports: (profile: ExecutionProfile) => profile.engine === "node",

  async validateWorkspace(context: ExecutionContext): Promise<WorkspaceValidation> {
    const editable = context.workspaceFiles.filter((f) => f.role === "edit");
    if (editable.length === 0) {
      return { ok: false, diagnostics: [{ level: "blocker", message: "No editable workspace file to verify." }] };
    }
    if (context.testFiles.length === 0) {
      return { ok: false, diagnostics: [{ level: "blocker", message: "No test files were provided for this step." }] };
    }
    return { ok: true, diagnostics: [] };
  },

  async verify(context: ExecutionContext): Promise<VerificationResult> {
    const startedAt = Date.now();
    const apiPreviewRequest = apiPreviewFromMetadata(context.metadata);
    let apiPreviewResponse: ApiPreviewResponse | null = null;
    const testFiles = apiPreviewRequest
      ? [{ path: "tests/api-preview.test.ts", content: apiPreviewTestSource(apiPreviewRequest) }]
      : context.testFiles.map((f) => ({ path: f.path, content: f.content }));
    const extraGlobals = apiPreviewRequest
      ? {
          __captureApiPreviewResponse(response: ApiPreviewResponse) {
            apiPreviewResponse = response;
          },
        }
      : undefined;
    const runInput = {
      workspaceFiles: context.workspaceFiles.map((f) => ({ path: f.path, content: f.content, role: f.role })),
      testFiles,
      limits: (context.metadata.nodeLimits as Record<string, number> | undefined) ?? undefined,
      extraGlobals,
    };

    // Compose the runtime from the profile: SQLite (which itself layers in
    // Express when the framework is express) → Express → plain Node. Each is a
    // thin wrapper over the same Node runtime; these are the only framework/db
    // branches and they live inside the engine, not the platform.
    const express = context.profile.framework === "express";
    let run: NodeRunResult;
    if (context.profile.database?.engine === "sqlite") {
      const { runSqliteTests } = await import("@/lib/scenarios/execution/engines/node/sqlite/run");
      run = await runSqliteTests(runInput, {
        schema: context.database?.schema ?? "",
        seed: context.database?.seed,
        withExpress: express,
      });
    } else if (express) {
      const { runExpressTests } = await import("@/lib/scenarios/execution/engines/node/express/run");
      run = await runExpressTests(runInput);
    } else {
      const { runNodeTests } = await import("@/lib/scenarios/execution/engines/node/runtime");
      run = await runNodeTests(runInput);
    }

    return mapRunToResult(run, Date.now() - startedAt, context.step.functionName ?? null, apiPreviewResponse);
  },
};

/** Map the neutral Node run into the shared `VerificationResult`. Per-test
 *  outcomes (assertion/runtime/timeout) become test results; run-level
 *  diagnostics (compilation/import/unsupported/internal) become engine errors. */
function mapRunToResult(
  run: NodeRunResult,
  durationMs: number,
  functionName: string | null,
  apiPreviewResponse: ApiPreviewResponse | null = null,
): VerificationResult {
  const testResults: TestCaseResult[] = run.tests.map((t) => ({
    name: t.name,
    status: t.passed ? "passed" : "failed",
    message: t.message,
    durationMs: t.durationMs,
  }));

  const errors: VerificationError[] = run.diagnostics.map((d) => ({
    message: d.message,
    kind: d.category,
    file: d.file,
    line: d.line,
    stack: d.stack,
  }));

  const hadError = errors.length > 0;
  const allPassed = run.tests.length > 0 && run.tests.every((t) => t.passed);
  const status: VerificationResult["status"] = hadError ? "errored" : allPassed ? "passed" : "failed";

  return {
    engine: "node",
    status,
    passed: status === "passed",
    testResults,
    durationMs,
    errors,
    finishedAt: Date.now(),
    meta: { functionName, ...(apiPreviewResponse ? { apiPreviewResponse } : {}) },
  };
}

interface ApiPreviewRequestMeta {
  method: ApiPreviewMethod;
  path: string;
  body?: unknown;
}

function apiPreviewFromMetadata(metadata: Record<string, unknown>): ApiPreviewRequestMeta | null {
  const raw = metadata.apiPreviewRequest;
  if (!raw || typeof raw !== "object") return null;
  const request = raw as Partial<ApiPreviewRequestMeta>;
  if (typeof request.method !== "string" || typeof request.path !== "string") return null;
  return { method: request.method as ApiPreviewMethod, path: request.path, body: request.body };
}

function apiPreviewTestSource(request: ApiPreviewRequestMeta): string {
  const method = request.method.toLowerCase();
  const path = JSON.stringify(request.path);
  const body = request.body === undefined ? null : JSON.stringify(request.body);
  const send = body === null ? "" : `.send(${body})`;
  return `import app from "../workspace/app";

test("API preview request", async () => {
  const response = await request(app)[${JSON.stringify(method)}](${path})${send};
  __captureApiPreviewResponse(response);
});
`;
}
