import type { VerificationResult } from "@/lib/scenarios/verification";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";
import type { EngineCapabilities } from "@/lib/scenarios/execution/capabilities";
import type { EngineId, ExecutionProfile } from "@/lib/scenarios/execution/profile";

/**
 * The uniform contract EVERY verification engine implements — React today, and
 * Node/Python/Java/C#/SQL as they come online. Each engine receives exactly one
 * `ExecutionContext` and exposes the same four capabilities:
 *
 *   verify()            run the step and return a structured result
 *   validateWorkspace() pre-flight checks on the candidate's files
 *   supports()          whether this engine can handle a given profile
 *   capabilities()      what the engine can do (advertised even by placeholders)
 *
 * Unsupported engines NEVER throw — they return structured "not implemented"
 * responses, so the runtime and UI degrade gracefully.
 */
export interface ExecutionEngine {
  readonly id: EngineId;
  readonly displayName: string;

  capabilities(): EngineCapabilities;
  supports(profile: ExecutionProfile): boolean;
  validateWorkspace(context: ExecutionContext): Promise<WorkspaceValidation>;
  verify(context: ExecutionContext): Promise<VerificationResult>;
}

/** Structured pre-flight result. `ok` is false when a `blocker` is present. */
export interface WorkspaceValidation {
  ok: boolean;
  diagnostics: WorkspaceDiagnostic[];
}

export interface WorkspaceDiagnostic {
  level: "blocker" | "warning" | "info";
  message: string;
  file?: string;
}

/** Base result skeleton (mirrors the private helper in verification.ts). */
function baseResult(engine: string): VerificationResult {
  return {
    engine,
    status: "manual",
    passed: false,
    testResults: [],
    durationMs: 0,
    errors: [],
    finishedAt: Date.now(),
  };
}

/**
 * The canonical "this engine is a registered placeholder" response. Returned by
 * every not-yet-implemented engine's `verify()`/`validateWorkspace()` so callers
 * get a typed, non-throwing signal they can render.
 */
export function notImplementedResult(engineId: EngineId, displayName: string): VerificationResult {
  return {
    ...baseResult(engineId),
    status: "unsupported",
    message: `Not implemented: the ${displayName} engine is registered as a placeholder and cannot execute code yet.`,
    meta: { notImplemented: true, engineId },
  };
}

export function notImplementedWorkspace(displayName: string): WorkspaceValidation {
  return {
    ok: true,
    diagnostics: [
      {
        level: "info",
        message: `Workspace validation is not implemented for the ${displayName} engine yet.`,
      },
    ],
  };
}
