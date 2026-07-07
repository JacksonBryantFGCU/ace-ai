import type { CheckpointFile } from "@/lib/scenarios/types";

/**
 * Checkpoint source abstraction. A source resolves a step's authored checkpoint
 * into workspace-relative files. Today the only implementation reads the
 * filesystem (`solution/`), but the UI depends only on this interface (via a
 * server action), so future sources — database, remote storage, or LLM-generated
 * checkpoints — plug in WITHOUT any UI change.
 */
export interface CheckpointSource {
  resolve(scenarioSlug: string, stepId: string): Promise<CheckpointFile[]>;
}

/**
 * Map an authored checkpoint path to its workspace-relative target by stripping
 * the `solution/<step-dir>/` prefix:
 *   `solution/step-1/UserSearch.tsx`      → `UserSearch.tsx`
 *   `solution/step-3/hooks/useSearch.ts`  → `hooks/useSearch.ts`
 * Paths that don't start with `solution/` are returned unchanged.
 */
export function checkpointTargetPath(solutionPath: string): string {
  const normalized = solutionPath.replace(/\\/g, "/");
  if (!normalized.startsWith("solution/")) return normalized;
  return normalized.split("/").slice(2).join("/");
}

/**
 * Authoring convention: reference solutions live two folders deeper than the
 * workspace root (`solution/step-N/...`), so they import sibling workspace
 * files via `../../workspace/…`. Once a checkpoint copies that content to
 * its flat `checkpointTargetPath` (the workspace root), those imports must
 * be rewritten to `./…` or they resolve to a path that doesn't exist there.
 * Shared by both the authoring toolkit's solution validator (`solution.ts`,
 * which overlays checkpoints to verify them) and the real checkpoint source
 * (`server/scenarios/checkpoint-source.ts`, which serves them to a live
 * interview session) — the exact same rewrite must apply in both places, or
 * a checkpoint that validates clean in the toolkit can still break at
 * interview time.
 */
export function normalizeSolutionImports(content: string): string {
  return content.replaceAll("../../workspace/", "./");
}
