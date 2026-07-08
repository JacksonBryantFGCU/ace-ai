import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseScenario } from "@/lib/scenarios/parse";
import { findScenarioLocations } from "@/server/scenarios/load";
import { scenarioToCandidate } from "@/lib/scenarios/selection/adapters";
import { isPublicScenario } from "@/lib/scenarios/visibility";
import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import type { ScenarioPickerOption } from "@/lib/scenarios/types";
import type { ScenarioCandidate } from "@/lib/scenarios/selection/types";

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
  const candidates: ScenarioCandidate[] = [];
  for (const loc of findScenarioLocations()) {
    try {
      const raw = readFileSync(join(loc.dir, "scenario.md"), "utf8");
      const { scenario } = parseScenario(raw);
      if (!isPublicScenario(scenario)) continue;
      candidates.push(scenarioToCandidate(scenario, loc.slug));
    } catch (e) {
      console.warn(`Skipping invalid scenario '${loc.slug}': ${(e as Error).message}`);
    }
  }
  return candidates;
}

export async function listScenarioPickerOptions(): Promise<ScenarioPickerOption[]> {
  const options: ScenarioPickerOption[] = [];
  for (const loc of findScenarioLocations()) {
    try {
      const raw = readFileSync(join(loc.dir, "scenario.md"), "utf8");
      const { scenario } = parseScenario(raw);
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
    } catch (e) {
      console.warn(`Skipping invalid scenario '${loc.slug}': ${(e as Error).message}`);
    }
  }
  return options.sort((a, b) => a.title.localeCompare(b.title));
}
