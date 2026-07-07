import type { VerificationResult } from "@/lib/scenarios/verification";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";
import type { EngineCapabilities } from "@/lib/scenarios/execution/capabilities";
import type { WorkspaceValidation } from "@/lib/scenarios/execution/engine";
import type { EngineRegistry } from "@/lib/scenarios/execution/registry";
import type { EngineId } from "@/lib/scenarios/execution/profile";

/**
 * The Execution Platform — the language-agnostic front door.
 *
 *   Interview → ExecutionPlatform → EngineRegistry → <selected engine>
 *
 * Its ONLY responsibilities are (1) select the engine named by the context's
 * profile and (2) delegate to it, normalizing failures. It contains no
 * language-specific logic and no branching per language — every decision comes
 * from the registry, so interview controllers never learn about languages.
 */
export class ExecutionPlatform {
  constructor(private readonly registry: EngineRegistry) {}

  async verify(context: ExecutionContext): Promise<VerificationResult> {
    const engineId = context.profile.engine;
    const engine = this.registry.get(engineId);
    if (!engine) return unsupportedResult(engineId);

    const startedAt = Date.now();
    try {
      return await engine.verify(context);
    } catch (error) {
      return erroredResult(engine.id, error, startedAt);
    }
  }

  async validateWorkspace(context: ExecutionContext): Promise<WorkspaceValidation> {
    const engine = this.registry.get(context.profile.engine);
    if (!engine) {
      return {
        ok: false,
        diagnostics: [{ level: "blocker", message: unsupportedMessage(context.profile.engine) }],
      };
    }
    return engine.validateWorkspace(context);
  }

  /** Advertised capabilities for an engine (or `undefined` if not registered). */
  capabilitiesFor(engineId: EngineId): EngineCapabilities | undefined {
    return this.registry.get(engineId)?.capabilities();
  }
}

function unsupportedMessage(engineId: EngineId | null): string {
  return engineId
    ? `No verification engine is registered for "${engineId}".`
    : `This step has no executable engine (discussion-only).`;
}

function unsupportedResult(engineId: EngineId | null): VerificationResult {
  return {
    engine: engineId ?? "none",
    status: "unsupported",
    passed: false,
    testResults: [],
    durationMs: 0,
    errors: [],
    message: unsupportedMessage(engineId),
    finishedAt: Date.now(),
  };
}

function erroredResult(engine: string, error: unknown, startedAt: number): VerificationResult {
  const e = error instanceof Error ? error : new Error(String(error));
  return {
    engine,
    status: "errored",
    passed: false,
    testResults: [],
    durationMs: Date.now() - startedAt,
    errors: [{ message: e.message, kind: "harness", stack: e.stack }],
    finishedAt: Date.now(),
  };
}
