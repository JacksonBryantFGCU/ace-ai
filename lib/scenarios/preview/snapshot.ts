import type { Scenario } from "@/lib/scenarios/schema";
import type { SessionFile } from "@/lib/scenarios/types";

/**
 * `PreviewSnapshot` — the adapter boundary between the interview runtime and
 * the Preview Runtime (docs/README.md).
 * Everything downstream of `createPreviewSnapshot` only ever sees this shape:
 * it has no idea whether the files came from the live session, a checkpoint,
 * the reference solution, or anything else, and it never sees the session,
 * the interview controller, or any runtime internals.
 *
 * Only readonly, plain data — no controller methods, no way to mutate
 * interview state.
 */
export interface PreviewSnapshot {
  readonly scenario: Readonly<Scenario>;
  readonly files: readonly Readonly<SessionFile>[];
  /** Path to treat as "the" entry/focus; defaults to `scenario.workspace.entry`. */
  readonly activeFile: string;
  /** UI chrome only, e.g. "Live" | "Checkpoint: step 2" | "Reference solution". */
  readonly label?: string;
}

export interface CreatePreviewSnapshotInput {
  scenario: Scenario;
  files: SessionFile[];
  activeFile?: string;
  label?: string;
}

/**
 * Build a `PreviewSnapshot` from a set of files — today the live session's
 * `SessionFile[]`, but any future producer (checkpoint, solution, historical
 * submission, replay, AI-generated) calls this the same way. Pure: no I/O, no
 * React, no server-only. Copies and freezes its inputs (mirrors
 * `takeSnapshot` in `lib/scenarios/verification.ts`) so the snapshot can never
 * be mutated after it's handed to the Preview Runtime, and so freezing it
 * never reaches back into the live session's own file objects.
 */
export function createPreviewSnapshot(input: CreatePreviewSnapshotInput): PreviewSnapshot {
  const activeFile = input.activeFile ?? input.scenario.workspace.entry;
  const files = input.files.map((f) => Object.freeze({ ...f }));
  return Object.freeze({
    scenario: input.scenario,
    files: Object.freeze(files),
    activeFile,
    label: input.label,
  });
}
