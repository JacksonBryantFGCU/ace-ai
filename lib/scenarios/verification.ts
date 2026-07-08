import type { FileRole } from "@/lib/scenarios/schema";

/**
 * Harness-agnostic verification layer.
 *
 *   Interview UI → VerificationService → VerificationEngine → VerificationResult
 *
 * The UI knows nothing about Vitest, RTL, or any test tech: it submits a snapshot
 * of the current workspace + a step reference and receives a structured result.
 * Each engine (component / node / sql / docker / …) plugs into the same interface
 * and is selected by `step.harness`. The service:
 *   - takes an immutable SNAPSHOT so a run can never mutate candidate files,
 *   - is STATELESS so every run is independent (no leakage between runs),
 *   - returns a typed, OPEN result model (reserved fields for rubric/interviewer/
 *     AI scoring so future evaluation can extend it without a breaking change).
 */

// ── Result model ────────────────────────────────────────────────────────────

export type VerificationStatus =
  | "passed" // all tests passed
  | "failed" // ran, but at least one test failed
  | "errored" // the engine could not run (transform/harness error)
  | "manual" // no automated engine yet — awaiting human confirmation
  | "unsupported"; // no engine registered for this harness

export type VerificationMode = "single-file" | "scenario-step" | "scenario-final";
export type VerificationGroupName = "backend" | "frontend" | "integration";

export type TestCaseStatus = "passed" | "failed" | "skipped";

export interface TestCaseResult {
  name: string;
  status: TestCaseStatus;
  message?: string;
  durationMs?: number;
}

export interface VerificationError {
  message: string;
  /** Coarse category, e.g. "transform" | "runtime" | "timeout" | "harness". */
  kind?: string;
  stack?: string;
  /** Source file this error is attributed to (when known). */
  file?: string;
  /** 1-based line within `file` (when known). */
  line?: number;
}

/** Reserved for future rubric / interviewer / AI scoring (Phase 6+). */
export interface RubricScore {
  criterion: string;
  score: number;
  max: number;
  notes?: string;
}

export interface VerificationGroupResult {
  name: VerificationGroupName;
  ok: boolean;
  command?: string;
  output?: string;
  durationMs?: number;
  skipped?: boolean;
  reason?: string;
}

export interface VerificationResult {
  /** Harness id that produced this result (e.g. "component"). */
  engine: string;
  status: VerificationStatus;
  /** Convenience mirror of `status === "passed"`. */
  passed: boolean;
  testResults: TestCaseResult[];
  durationMs: number;
  errors: VerificationError[];
  /** Human-facing note (e.g. why a result is manual). */
  message?: string;
  finishedAt: number;
  mode?: VerificationMode;
  scenarioSlug?: string;
  stepIndex?: number;
  groups?: VerificationGroupResult[];

  // ── Reserved for future evaluation combinations (kept optional & additive) ──
  /** Automated/interviewer rubric scores. */
  rubric?: RubricScore[];
  /** Free-form engine metadata / future AI reasoning payload. */
  meta?: Record<string, unknown>;
}

// ── Request / snapshot ──────────────────────────────────────────────────────

export interface SnapshotFile {
  path: string;
  content: string;
  role: FileRole;
}

export interface WorkspaceSnapshot {
  readonly files: readonly Readonly<SnapshotFile>[];
  takenAt: number;
}

/** The step fields an engine needs — projected from the scenario's `verify` block. */
export interface VerificationStepRef {
  id: string;
  harness: string;
  functionName?: string;
  tests?: string[];
  timeoutMs?: number;
}

export interface VerificationRequest {
  scenarioSlug: string;
  step: VerificationStepRef;
  snapshot: WorkspaceSnapshot;
  signal?: AbortSignal;
}

/** A pluggable execution engine for one harness type. */
export interface VerificationEngine {
  readonly harness: string;
  verify(request: VerificationRequest): Promise<VerificationResult>;
}

// ── Snapshot + service ──────────────────────────────────────────────────────

/** Deep-copy the candidate's files into a frozen snapshot (isolation). */
export function takeSnapshot(files: readonly SnapshotFile[]): WorkspaceSnapshot {
  const copied = files.map((f) => Object.freeze({ path: f.path, content: f.content, role: f.role }));
  return Object.freeze({ files: Object.freeze(copied), takenAt: Date.now() });
}

export interface VerifyInput {
  scenarioSlug: string;
  step: VerificationStepRef;
  files: readonly SnapshotFile[];
  signal?: AbortSignal;
}

export interface VerificationService {
  verify(input: VerifyInput): Promise<VerificationResult>;
}

function baseResult(engine: string): VerificationResult {
  return { engine, status: "manual", passed: false, testResults: [], durationMs: 0, errors: [], finishedAt: Date.now() };
}

function unsupportedResult(harness: string): VerificationResult {
  return {
    ...baseResult(harness),
    status: "unsupported",
    message: `No verification engine is registered for the "${harness}" harness.`,
  };
}

function erroredResult(harness: string, error: unknown, startedAt: number): VerificationResult {
  const e = error instanceof Error ? error : new Error(String(error));
  return {
    ...baseResult(harness),
    status: "errored",
    durationMs: Date.now() - startedAt,
    errors: [{ message: e.message, kind: "harness", stack: e.stack }],
  };
}

/**
 * Create a stateless verification service over a set of engines. The service is
 * harness-agnostic: it snapshots, dispatches to the engine matching
 * `step.harness`, and normalizes failures into structured results.
 */
export function createVerificationService(engines: VerificationEngine[]): VerificationService {
  const registry = new Map(engines.map((engine) => [engine.harness, engine]));

  return {
    async verify(input) {
      const engine = registry.get(input.step.harness);
      if (!engine) return unsupportedResult(input.step.harness);

      // Fresh, isolated snapshot per run — no mutation, no leakage between runs.
      const snapshot = takeSnapshot(input.files);
      const startedAt = Date.now();
      try {
        return await engine.verify({
          scenarioSlug: input.scenarioSlug,
          step: input.step,
          snapshot,
          signal: input.signal,
        });
      } catch (error) {
        return erroredResult(engine.harness, error, startedAt);
      }
    },
  };
}
