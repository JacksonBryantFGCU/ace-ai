import {
  interviewTrackMatchForScenario,
  roleMatchForScenario,
  scenarioRoleFamily,
  type ScenarioRoleFamily,
} from "@/lib/scenarios/selection/roles";
import type { ScenarioType } from "@/lib/scenarios/schema";

export const ALL_FILTER = "__all__";
export const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;
export const ROLE_GROUP_ORDER: ScenarioRoleFamily[] = ["frontend", "backend", "fullstack", "other"];

export interface CatalogScenario {
  slug: string;
  title: string;
  summary: string;
  category: string;
  type?: ScenarioType;
  difficulty: string;
  jobRoles: readonly string[];
  skills?: readonly string[];
  tags?: readonly string[];
  runtime?: string;
  framework?: string;
  estimatedMinutes?: number;
}

export interface ScenarioCatalogFilters {
  query?: string;
  role?: string;
  scenarioType?: string;
  difficulty?: string;
  category?: string;
  runtimeFramework?: string;
  allowedRole?: string;
}

export interface ScenarioCatalogGroup<T extends CatalogScenario> {
  family: ScenarioRoleFamily;
  label: string;
  scenarios: T[];
}

const ROLE_GROUP_LABELS: Record<ScenarioRoleFamily, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Full-Stack",
  other: "Other",
};

export function difficultyRank(difficulty: string): number {
  const index = DIFFICULTY_ORDER.indexOf(difficulty as (typeof DIFFICULTY_ORDER)[number]);
  return index === -1 ? 99 : index;
}

export function runtimeFrameworkValue(scenario: CatalogScenario): string {
  return scenario.framework ?? scenario.runtime ?? "";
}

export function scenarioMatchesCatalogFilters<T extends CatalogScenario>(
  scenario: T,
  filters: ScenarioCatalogFilters,
): boolean {
  if (filters.allowedRole && !interviewTrackMatchForScenario(scenario, filters.allowedRole).allowed) return false;
  if (filters.role && filters.role !== ALL_FILTER && !roleMatchForScenario(scenario, filters.role).allowed) {
    return false;
  }
  if (filters.difficulty && filters.difficulty !== ALL_FILTER && scenario.difficulty !== filters.difficulty) {
    return false;
  }
  if (filters.scenarioType && filters.scenarioType !== ALL_FILTER && scenario.type !== filters.scenarioType) {
    return false;
  }
  if (filters.category && filters.category !== ALL_FILTER && scenario.category !== filters.category) return false;
  if (
    filters.runtimeFramework &&
    filters.runtimeFramework !== ALL_FILTER &&
    runtimeFrameworkValue(scenario) !== filters.runtimeFramework
  ) {
    return false;
  }

  const query = filters.query?.trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    scenario.title,
    scenario.summary,
    scenario.category,
    scenario.type,
    scenario.difficulty,
    scenario.runtime,
    scenario.framework,
    ...scenario.jobRoles,
    ...(scenario.skills ?? []),
    ...(scenario.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function filterCatalogScenarios<T extends CatalogScenario>(
  scenarios: readonly T[],
  filters: ScenarioCatalogFilters,
): T[] {
  return scenarios.filter((scenario) => scenarioMatchesCatalogFilters(scenario, filters));
}

export function sortCatalogScenarios<T extends CatalogScenario>(scenarios: readonly T[]): T[] {
  return [...scenarios].sort(
    (a, b) =>
      difficultyRank(a.difficulty) - difficultyRank(b.difficulty) ||
      a.title.localeCompare(b.title) ||
      a.slug.localeCompare(b.slug),
  );
}

export function groupCatalogScenarios<T extends CatalogScenario>(
  scenarios: readonly T[],
): ScenarioCatalogGroup<T>[] {
  const groups = new Map<ScenarioRoleFamily, T[]>();
  for (const scenario of sortCatalogScenarios(scenarios)) {
    const family = scenarioRoleFamily(scenario);
    groups.set(family, [...(groups.get(family) ?? []), scenario]);
  }
  return ROLE_GROUP_ORDER.filter((family) => groups.has(family)).map((family) => ({
    family,
    label: ROLE_GROUP_LABELS[family],
    scenarios: groups.get(family)!,
  }));
}

export function distinctCatalogValues(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}
