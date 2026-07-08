import type { FileRole, Scenario, ScenarioType } from "@/lib/scenarios/schema";
import type { ServedPreviewBundle } from "@/lib/scenarios/preview/types";

/**
 * Shared runtime types for scenarios. Kept UI- and server-free so both the
 * server-only loader and client session/UI can import them without pulling in
 * `server-only` (fs) or React.
 */

/** A workspace file as served to the candidate (authored seed contents). */
export interface ServedWorkspaceFile {
  path: string;
  role: FileRole;
  content: string;
}

/** Candidate-facing loaded scenario: definition + served workspace, no authored artifacts. */
export interface LoadedScenario {
  slug: string;
  category: string;
  scenario: Scenario;
  /** Candidate-facing body sections keyed by heading (authored sections stripped). */
  sections: Record<string, string>;
  files: ServedWorkspaceFile[];
  entry: string;
  /** The scenario's optional authored preview bundle. `undefined` when the
   *  scenario has no `preview/` folder — every scenario without one behaves
   *  exactly as it did before the Preview Runtime existed. */
  preview?: ServedPreviewBundle;
}

/** Lightweight summary for the dev scenario picker. */
export interface ScenarioSummary {
  slug: string;
  category: string;
  type: ScenarioType;
  title: string;
  summary: string;
  difficulty: string;
  status: string;
}

/**
 * Candidate-facing scenario metadata for the setup **scenario picker** — enough to
 * present and filter a scenario without loading its workspace. No authored
 * artifacts (tests/solutions) or grading data.
 */
export interface ScenarioOption {
  slug: string;
  category: string;
  type: ScenarioType;
  title: string;
  summary: string;
  difficulty: string;
  skills: string[];
  tags: string[];
  jobRoles: string[];
  runtime?: string;
  framework?: string;
  estimatedMinutes: number;
  status: string;
}

export interface ScenarioStepPreview {
  id: string;
  kind: string;
  prompt: string;
}

export interface ScenarioPickerOption extends ScenarioOption {
  stepPreview: ScenarioStepPreview[];
}

/**
 * A file in the live runtime session — the ONLY place candidate edits live
 * (frozen §4). `id` is stable across renames; `origin` distinguishes the
 * authored seed from files the candidate created.
 */
export interface SessionFile {
  id: string;
  path: string;
  content: string;
  role: FileRole;
  origin: "authored" | "created";
}

/** Per-attempt workspace state: the file set plus open-tab / active-file view. */
export interface WorkspaceSession {
  files: SessionFile[];
  activeFileId: string | null;
  openFileIds: string[];
}

/** Result of a session mutation that can fail validation (create/rename/delete). */
export type SessionResult =
  | { ok: true; session: WorkspaceSession }
  | { ok: false; error: string };

/**
 * A checkpoint file resolved to its workspace-relative target path + contents.
 * Sourced from authored `solution/` files (immutable) and copied into the
 * session. The `path` is where it lands in the workspace (e.g. `UserSearch.tsx`),
 * NOT the `solution/step-N/...` origin path.
 */
export interface CheckpointFile {
  path: string;
  content: string;
}
