import type { Scenario } from "@/lib/scenarios/schema";
import type { AuthoredTestFile } from "@/lib/scenarios/engines/contracts";
import type { SnapshotFile, VerificationStepRef } from "@/lib/scenarios/verification";
import type { ExecutionProfile } from "@/lib/scenarios/execution/profile";

/**
 * The ONE object every execution engine receives — the foundation the whole
 * platform is built on. Instead of threading many independent parameters through
 * each engine, callers assemble a single `ExecutionContext`; adding a new engine
 * (or a new future capability) never changes any interview controller.
 *
 * It is intentionally general so the SAME context can back not just verification
 * but future execution tooling: AI hints, AI debugging, reference-solution
 * execution, profiling, preview generation, static analysis, and linting all
 * operate over "these files, in this language/runtime/framework, for this step."
 */
export interface ExecutionContext {
  /** Slug of the scenario under execution. */
  scenarioSlug: string;
  /** The full authored scenario when available (server paths). Absent on the
   *  minimal server-action path that only carries a step reference. */
  scenario?: Scenario | null;
  /** The step being executed (id + engine-facing verify projection). */
  step: VerificationStepRef;

  /** The candidate's current workspace snapshot. */
  workspaceFiles: readonly SnapshotFile[];
  /** Authored tests/spec files for this step, pre-resolved by the caller. */
  testFiles: readonly AuthoredTestFile[];

  /** Language / runtime / framework / engine selection for this run. */
  profile: ExecutionProfile;

  /** Provisioned database sources for the run (Phase 9). Present when
   *  `profile.database` is set; the engine applies `schema` (+ optional `seed`)
   *  to a fresh in-memory database before executing. */
  database?: {
    schema: string;
    seed?: string;
  };

  /** Knobs an engine may honor (timeout, cancellation). */
  verificationOptions: {
    timeoutMs?: number;
    signal?: AbortSignal;
  };

  /** Where the context is being executed from. */
  environment: "server" | "browser";

  /** Free-form, forward-compatible bag for future tooling (AI payloads, profiling
   *  config, …) without a breaking change to this contract. */
  metadata: Record<string, unknown>;
}
