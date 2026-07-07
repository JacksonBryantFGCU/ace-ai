import { validateFrontmatter } from "@/lib/scenarios/authoring/frontmatter";
import { validateExecution, validateDatabase } from "@/lib/scenarios/authoring/execution";
import { validateWorkspace } from "@/lib/scenarios/authoring/workspace";
import { validateSteps } from "@/lib/scenarios/authoring/steps";
import { validateRubric } from "@/lib/scenarios/authoring/rubric";
import { validatePreview } from "@/lib/scenarios/authoring/preview";
import { validateSolution, type SolutionVerifier } from "@/lib/scenarios/authoring/solution";
import { diag, type AuthoredBundle, type Diagnostic, type ScenarioReport } from "@/lib/scenarios/authoring/types";

export interface ValidateOptions {
  /** Also execute the reference solution against every test (slower). */
  runSolution?: boolean;
  /**
   * How to execute a step — the seam onto the `ExecutionPlatform`. Required for
   * `runSolution`; the composition root (`server/scenarios/authoring.ts`) injects
   * the process-wide platform so engine selection is identical to production.
   */
  verify?: SolutionVerifier;
}

/** Static (no-execution) validators. */
const STATIC_VALIDATORS = [
  validateFrontmatter,
  validateExecution,
  validateWorkspace,
  validateSteps,
  validateRubric,
  validatePreview,
];

/**
 * Validate ONE scenario bundle. Runs the static validators always; runs the
 * (executing) solution validator only when `runSolution` is set. Never throws —
 * every problem is a diagnostic. `ok` is true iff there are no `error`s.
 */
export async function validateScenario(
  bundle: AuthoredBundle,
  options: ValidateOptions = {},
): Promise<ScenarioReport> {
  const diagnostics: Diagnostic[] = STATIC_VALIDATORS.flatMap((v) => v(bundle));
  // Real-database validation (SQLite scenarios only; a no-op otherwise).
  diagnostics.push(...(await validateDatabase(bundle)));
  // Execute the reference solution through the ExecutionPlatform. Skipped when no
  // verifier is injected (static-only callers), so it never runs without a platform.
  if (options.runSolution && options.verify) {
    diagnostics.push(...(await validateSolution(bundle, options.verify)));
  }
  return {
    slug: bundle.slug,
    category: bundle.category,
    diagnostics,
    ok: !diagnostics.some((d) => d.level === "error"),
  };
}

/**
 * Cross-scenario checks (need the whole set): duplicate slugs (ambiguous loads) and
 * duplicate ids. Returns diagnostics keyed by slug so callers can fold them into
 * each scenario's report.
 */
export function crossScenarioDiagnostics(bundles: AuthoredBundle[]): Map<string, Diagnostic[]> {
  const result = new Map<string, Diagnostic[]>();
  const push = (slug: string, d: Diagnostic) => {
    const arr = result.get(slug) ?? [];
    arr.push(d);
    result.set(slug, arr);
  };

  const bySlug = new Map<string, AuthoredBundle[]>();
  const byId = new Map<string, AuthoredBundle[]>();
  for (const b of bundles) {
    bySlug.set(b.slug, [...(bySlug.get(b.slug) ?? []), b]);
    const id = b.scenario?.id;
    if (id) byId.set(id, [...(byId.get(id) ?? []), b]);
  }

  for (const [slug, group] of bySlug) {
    if (group.length > 1) {
      const where = group.map((b) => `${b.category}/${slug}`).join(", ");
      push(
        slug,
        diag.error(
          "cross/duplicate-slug",
          "scenario.md",
          `slug "${slug}" is used by ${group.length} scenarios (${where}) — loads are ambiguous.`,
          "Rename one folder so every scenario slug is unique across the whole content tree.",
        ),
      );
    }
  }

  for (const [id, group] of byId) {
    if (group.length > 1) {
      const slugs = [...new Set(group.map((b) => b.slug))];
      if (slugs.length > 1) {
        for (const b of group) {
          push(
            b.slug,
            diag.error(
              "cross/duplicate-id",
              "scenario.md → id",
              `id "${id}" is shared by scenarios: ${slugs.join(", ")}.`,
              "Give every scenario a globally-unique id (it must equal its folder name).",
            ),
          );
        }
      }
    }
  }

  return result;
}

/**
 * Validate a whole set of bundles: per-scenario diagnostics + cross-scenario
 * diagnostics folded in. This is what the CLI drives.
 */
export async function validateAll(
  bundles: AuthoredBundle[],
  options: ValidateOptions = {},
): Promise<ScenarioReport[]> {
  const cross = crossScenarioDiagnostics(bundles);
  const reports: ScenarioReport[] = [];
  for (const bundle of bundles) {
    const report = await validateScenario(bundle, options);
    const extra = cross.get(bundle.slug) ?? [];
    const diagnostics = [...report.diagnostics, ...extra];
    reports.push({ ...report, diagnostics, ok: !diagnostics.some((d) => d.level === "error") });
  }
  return reports;
}
