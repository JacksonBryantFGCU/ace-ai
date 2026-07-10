import type { VerificationGroupResult, VerificationMode } from "@/lib/scenarios/verification";

/**
 * Machine Learning scenario contract (Phase 1: authoring/schema/discovery only —
 * no Python runtime execution yet, see docs on `execution.mode: python-ml`).
 *
 * This module is the single source of truth for ML-specific constants, mirroring
 * how `lib/scenarios/execution/profile.ts` centralizes the generalized execution
 * metadata. Structural validation lives in
 * `lib/scenarios/authoring/machine-learning.ts`; this file only holds constants
 * and the (not-yet-produced) verification result type.
 */

export const ML_SCENARIO_TYPE = "machine-learning" as const;
export const ML_EXECUTION_MODE = "python-ml" as const;
export const ML_VERIFICATION_MODES = ["python-step", "python-final"] as const;
export type MlVerificationMode = (typeof ML_VERIFICATION_MODES)[number];

/** The candidate's fixed entrypoint — mirrors `workspace.entry` for every ML scenario. */
export const ML_ENTRYPOINT = "main.py";

/** Workspace-relative folders every ML scenario structure must/can have. */
export const ML_REQUIRED_WORKSPACE_FOLDERS = ["data/"] as const;
export const ML_OPTIONAL_WORKSPACE_FOLDERS = ["src/"] as const;

/** Optional dataset files under `workspace/data/` beyond the required `train.csv`. */
export const ML_REQUIRED_DATA_FILES = ["train.csv"] as const;
export const ML_OPTIONAL_DATA_FILES = ["test.csv", "sample_submission.csv"] as const;

/** Authored-only step test/solution naming convention (1-based step number). */
export function mlStepTestPath(stepNumber: number): string {
  return `tests/step-${stepNumber}.test.py`;
}
export function mlStepSolutionDir(stepNumber: number): string {
  return `solution/step-${stepNumber}`;
}

/** Allowed dependency categories for V1 (metadata/docs only — not enforced yet). */
export const ML_SUPPORTED_DEPENDENCIES = [
  "python-stdlib",
  "numpy",
  "pandas",
  "scikit-learn",
  "matplotlib",
  "pytest",
] as const;

/** Supported runtime metadata for V1 — Python-script based, no notebooks/GPU. */
export const ML_RUNTIME_METADATA = {
  language: "python",
  pythonVersion: "3.11",
} as const;

/**
 * Expected shape of a future ML step/final verification result. Reuses
 * `VerificationGroupResult` (extended with the "python"/"metrics" group names in
 * `lib/scenarios/verification.ts`) so it's structurally compatible with the
 * existing grouped verification model. Type/schema only — no producer exists
 * yet; runtime execution is Phase 2.
 */
export interface MlVerificationResult {
  ok: boolean;
  scenarioSlug: string;
  stepIndex?: number;
  mode: Extract<VerificationMode, MlVerificationMode>;
  summary: string;
  groups: VerificationGroupResult[];
}
