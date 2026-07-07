import "server-only";

import { executionPlatform } from "@/server/scenarios/execution-platform";
import { databaseSource } from "@/server/scenarios/database-source";
import { loadScenario } from "@/server/scenarios/load";
import { resolveExecutionProfile } from "@/lib/scenarios/execution/profile";
import { isApiPreviewMethod, type ApiPreviewError, type ApiPreviewRequestConfig, type ApiPreviewResponse, type ApiPreviewResult } from "@/lib/scenarios/preview/api";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";
import type { SnapshotFile, VerificationError, TestCaseResult } from "@/lib/scenarios/verification";

export interface RunApiPreviewInput {
  scenarioSlug: string;
  files: readonly SnapshotFile[];
  request: ApiPreviewRequestConfig;
}

export async function runApiPreviewOnServer(input: RunApiPreviewInput): Promise<ApiPreviewResult> {
  const startedAt = Date.now();
  if (!isApiPreviewMethod(input.request.method)) {
    return errorResult("unsupported", `Unsupported method "${input.request.method}".`, startedAt);
  }
  if (!input.request.path.startsWith("/")) {
    return errorResult("unsupported", "Request path must start with '/'.", startedAt);
  }

  const parsedBody = parseBody(input.request.bodyText);
  if (!parsedBody.ok) {
    return errorResult("invalid-json", parsedBody.message, startedAt);
  }

  const loaded = await loadScenario(input.scenarioSlug, { includeAuthorOnly: false });
  const profile = resolveExecutionProfile(loaded.scenario);
  if (profile.engine !== "node" || profile.runtime !== "node" || profile.framework !== "express") {
    return errorResult("unsupported", "API preview is only available for Node/Express scenarios.", startedAt);
  }

  const database = profile.database ? databaseSource.resolve(input.scenarioSlug) : undefined;
  const context: ExecutionContext = {
    scenarioSlug: input.scenarioSlug,
    scenario: loaded.scenario,
    step: { id: "api-preview", harness: "node-vm", functionName: loaded.entry },
    workspaceFiles: input.files,
    testFiles: [],
    profile,
    database,
    verificationOptions: {},
    environment: "server",
    metadata: {
      apiPreviewRequest: {
        method: input.request.method,
        path: input.request.path,
        body: parsedBody.body,
      },
    },
  };

  const result = await executionPlatform.verify(context);
  const response = result.meta?.apiPreviewResponse;
  if (response && typeof response === "object") {
    return {
      ok: true,
      response: response as ApiPreviewResponse,
      durationMs: result.durationMs,
      reset: true,
    };
  }

  const firstError = result.errors[0];
  const firstFailed = result.testResults.find((test) => test.status !== "passed");
  return {
    ok: false,
    error: mapPreviewError(firstError, firstFailed, result.message),
    durationMs: result.durationMs || Date.now() - startedAt,
    reset: true,
  };
}

function parseBody(bodyText: string | undefined): { ok: true; body?: unknown } | { ok: false; message: string } {
  if (bodyText == null || bodyText.trim() === "") return { ok: true };
  try {
    return { ok: true, body: JSON.parse(bodyText) };
  } catch (e) {
    return {
      ok: false,
      message: `Request body is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function mapPreviewError(error: VerificationError | undefined, failed: TestCaseResult | undefined, fallback?: string): ApiPreviewError {
  const rawKind = error?.kind ?? "runtime";
  const kind =
    rawKind === "schema" || rawKind === "seed"
      ? rawKind
      : rawKind === "compilation"
        ? "compile"
        : rawKind === "import" || rawKind === "unsupported"
          ? rawKind
          : rawKind === "query" || rawKind === "constraint" || rawKind === "foreign-key"
            ? "sqlite"
            : "runtime";
  return {
    kind,
    message: error?.message ?? failed?.message ?? fallback ?? "The API preview request failed.",
    details: error?.stack,
    file: error?.file,
    line: error?.line,
  };
}

function errorResult(kind: "invalid-json" | "unsupported", message: string, startedAt: number): ApiPreviewResult {
  return {
    ok: false,
    error: { kind, message },
    durationMs: Date.now() - startedAt,
    reset: true,
  };
}
