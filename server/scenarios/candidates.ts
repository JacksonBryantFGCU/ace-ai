import "server-only";

import { listScenarioFrontmatterEntries } from "@/server/scenarios/load";
import { scenarioToCandidate } from "@/lib/scenarios/selection/adapters";
import { isPublicScenario } from "@/lib/scenarios/visibility";
import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import type { ScenarioPickerOption } from "@/lib/scenarios/types";
import type { ScenarioCandidate } from "@/lib/scenarios/selection/types";
import { timePerf } from "@/server/scenarios/perf";

/**
 * Server-side data half of the selection service: every scenario's frontmatter as
 * a `ScenarioCandidate`. Parses `scenario.md` only (no workspace files, tests, or
 * solutions), so it's cheap to load the whole pool for the selector. Invalid
 * scenarios are skipped with a warning rather than breaking selection.
 *
 * This is IO only — the selection LOGIC lives in the pure `selectScenario`
 * (`lib/scenarios/selection`). A route hands the result to the runtime; it never
 * contains selection logic itself.
 */
export async function listScenarioCandidates(): Promise<ScenarioCandidate[]> {
  return timePerf("scenario.listCandidates", async () => {
    const candidates: ScenarioCandidate[] = [];
    for (const { loc, scenario } of listScenarioFrontmatterEntries()) {
      if (!isPublicScenario(scenario)) continue;
      candidates.push(scenarioToCandidate(scenario, loc.slug));
    }
    return candidates;
  });
}

export async function listScenarioPickerOptions(): Promise<ScenarioPickerOption[]> {
  return timePerf("scenario.listPickerOptions", async () => {
    const options: ScenarioPickerOption[] = [];
    for (const { loc, scenario } of listScenarioFrontmatterEntries()) {
      if (!isPublicScenario(scenario)) continue;
      options.push({
        slug: loc.slug,
        category: scenario.category,
        type: scenarioTypeOf(scenario),
        title: scenario.title,
        summary: scenario.summary,
        difficulty: scenario.difficulty,
        skills: [...scenario.skills],
        tags: [...(scenario.tags ?? [])],
        jobRoles: [...scenario.jobRoles],
        runtime: scenario.runtime,
        framework: scenario.framework,
        estimatedMinutes: scenario.estimatedMinutes,
        status: scenario.status,
        stepPreview: scenario.steps.slice(0, 3).map((step) => ({
          id: step.id,
          kind: step.kind,
          prompt: step.prompt,
        })),
      });
    }
    return options.sort((a, b) => a.title.localeCompare(b.title));
  });
}
