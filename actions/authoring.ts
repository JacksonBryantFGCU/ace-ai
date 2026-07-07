"use server";

import {
  loadAllAuthoredBundles,
  loadAuthoredBundleBySlug,
  scenarioLastModifiedBySlug,
  validateScenarios,
} from "@/server/scenarios/authoring";
import { validateScenario, crossScenarioDiagnostics } from "@/lib/scenarios/authoring/validate";
import { computeScenarioStats } from "@/lib/scenarios/authoring/stats";
import { loadScenario } from "@/server/scenarios/load";
import type { ScenarioReport } from "@/lib/scenarios/authoring/types";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type {
  ScenarioDossier,
  StudioScenarioSummary,
} from "@/lib/scenarios/authoring/studio-types";

/**
 * Dev-only server actions backing the Scenario Authoring Studio. They ORCHESTRATE
 * existing systems (the authoring toolkit + loaders); no authoring/validation logic
 * lives here. Every action hard-fails outside development so this surface never
 * ships live (the `/playground` route is also 404 in production).
 */

function assertDev() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The Scenario Authoring Studio is development-only.");
  }
}

/**
 * Every scenario as a browser row: authored metadata + a FAST static-validation
 * summary (no solution execution) so the list loads instantly and can show a
 * validation status per scenario. Cross-scenario checks (duplicate slug/id) are
 * folded in so those errors surface in the list too.
 */
export async function listStudioScenarios(): Promise<StudioScenarioSummary[]> {
  assertDev();
  const bundles = loadAllAuthoredBundles();
  const cross = crossScenarioDiagnostics(bundles);
  const modified = scenarioLastModifiedBySlug();

  const summaries: StudioScenarioSummary[] = [];
  for (const bundle of bundles) {
    const report = await validateScenario(bundle); // static only
    const diagnostics = [...report.diagnostics, ...(cross.get(bundle.slug) ?? [])];
    const errorCount = diagnostics.filter((d) => d.level === "error").length;
    const warningCount = diagnostics.filter((d) => d.level === "warning").length;
    const s = bundle.scenario;

    summaries.push({
      slug: bundle.slug,
      category: bundle.category,
      title: s?.title ?? bundle.slug,
      summary: s?.summary ?? "",
      difficulty: s?.difficulty ?? "—",
      status: s?.status ?? "—",
      jobRoles: s?.jobRoles ?? [],
      skills: s?.skills ?? [],
      tags: s?.tags ?? [],
      runtime: s?.runtime,
      framework: s?.framework,
      estimatedMinutes: s?.estimatedMinutes ?? 0,
      stepCount: s?.steps.length ?? 0,
      lastModifiedMs: modified.get(bundle.slug) ?? 0,
      errorCount,
      warningCount,
      invalid: s === null,
    });
  }

  return summaries.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * The full authoring dossier for ONE scenario: the parsed definition (rubrics
 * included), all body sections, every file under the folder (workspace/tests/
 * solution), computed statistics, and last-modified. Null when the slug is unknown.
 */
export async function getScenarioDossier(slug: string): Promise<ScenarioDossier | null> {
  assertDev();
  const loaded = loadAuthoredBundleBySlug(slug);
  if (!loaded) return null;
  const { bundle, lastModifiedMs } = loaded;
  return {
    slug: bundle.slug,
    category: bundle.category,
    scenario: bundle.scenario,
    schemaError: bundle.schemaError,
    sections: bundle.sections,
    files: bundle.files,
    stats: bundle.scenario ? computeScenarioStats(bundle.scenario) : null,
    lastModifiedMs,
  };
}

/**
 * Load the CANDIDATE-facing model for the Preview Interview tab. Uses
 * `includeAuthorOnly: true` so an author previewing can see rubrics/hints — the
 * production route is the one that strips them. Reuses the real loader, so the
 * preview is exactly what the runtime serves. Null when the slug is unknown.
 */
export async function loadPreviewScenario(slug: string): Promise<LoadedScenario | null> {
  assertDev();
  try {
    return await loadScenario(slug, { includeAuthorOnly: true });
  } catch {
    return null;
  }
}

/**
 * Run the validator over one scenario and return its full report. When
 * `runSolution` is set, the official solution is executed against every authored
 * test (the same runner production grades with) — this powers both the Validation
 * panel's "run solution" and the Run Solution utility.
 */
export async function validateScenarioReport(
  slug: string,
  options: { runSolution?: boolean } = {},
): Promise<ScenarioReport> {
  assertDev();
  const reports = await validateScenarios({ slug, runSolution: options.runSolution });
  const report = reports[0];
  if (!report) throw new Error(`scenario not found: "${slug}"`);
  return report;
}
