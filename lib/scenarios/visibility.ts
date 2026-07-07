import type { Scenario } from "@/lib/scenarios/schema";

export type ScenarioVisibility = "public" | "internal";

export function scenarioVisibility(scenario: Scenario): ScenarioVisibility {
  return scenario.visibility === "internal" ? "internal" : "public";
}

export function isPublicScenario(scenario: Scenario): boolean {
  return scenarioVisibility(scenario) === "public";
}
