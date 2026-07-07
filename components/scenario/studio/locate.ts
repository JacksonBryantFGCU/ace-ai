import type { StudioTab } from "@/components/scenario/studio/tabs";

/** Where a diagnostic points, so clicking it can jump to the right tab/target. */
export interface DiagnosticTarget {
  tab: StudioTab;
  /** Zero-based step index when the diagnostic is about a specific step. */
  stepIndex?: number;
  /** Scenario-relative file path when the diagnostic is about a specific file. */
  file?: string;
}

/**
 * Map a diagnostic `location` string (e.g. `scenario.md → steps[1].verify.tests`,
 * `workspace/UserSearch.tsx`) to a Studio navigation target. Pure + best-effort:
 * step diagnostics open the Step Explorer at that step; file diagnostics open the
 * Workspace preview at that file; everything else lands on the Dashboard.
 */
export function locateDiagnostic(location: string): DiagnosticTarget {
  const step = location.match(/steps\[(\d+)\]/);
  if (step) return { tab: "steps", stepIndex: Number(step[1]) };

  const file = location.match(/((?:workspace|tests|solution)\/[^\s,)]+)/);
  if (file) return { tab: "workspace", file: file[1] };

  return { tab: "dashboard" };
}
