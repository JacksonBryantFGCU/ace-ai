export type ScenarioRoleFamily = "frontend" | "backend" | "fullstack" | "other";

export interface ScenarioRoleMetadata {
  jobRoles: readonly string[];
  category: string;
  type?: string;
}

export interface ScenarioRoleMatch {
  allowed: boolean;
  exact: boolean;
  fallback: boolean;
  family: ScenarioRoleFamily;
}

export interface ScenarioTrackMatch {
  allowed: boolean;
  family: ScenarioRoleFamily;
}

const ROLE_ALIASES: Record<string, "frontend" | "backend" | "fullstack" | null> = {
  frontend: "frontend",
  "front-end": "frontend",
  "frontend engineer": "frontend",
  backend: "backend",
  "back-end": "backend",
  "backend engineer": "backend",
  fullstack: "fullstack",
  "full-stack": "fullstack",
  "full stack": "fullstack",
  "full-stack engineer": "fullstack",
};

export function normalizeScenarioRole(value: string | undefined): "frontend" | "backend" | "fullstack" | null {
  if (!value) return null;
  return ROLE_ALIASES[value.trim().toLowerCase()] ?? null;
}

export function categoryRoleFamily(category: string): ScenarioRoleFamily {
  const normalized = category.trim().toLowerCase();
  if (normalized.startsWith("frontend") || normalized.includes("frontend")) return "frontend";
  if (normalized.startsWith("backend") || normalized.includes("backend")) return "backend";
  if (normalized.includes("fullstack") || normalized.includes("full-stack")) return "fullstack";
  return "other";
}

export function scenarioRoleFamily(scenario: ScenarioRoleMetadata): ScenarioRoleFamily {
  if (scenario.type === "fullstack") return "fullstack";
  if (scenario.type === "backend") return "backend";
  if (scenario.type === "frontend") return "frontend";
  const roles = scenario.jobRoles.map((role) => normalizeScenarioRole(role)).filter(Boolean);
  const hasFrontend = roles.includes("frontend");
  const hasBackend = roles.includes("backend");
  const hasFullstack = roles.includes("fullstack");
  if (hasFullstack || (hasFrontend && hasBackend)) return "fullstack";
  if (hasBackend) return "backend";
  if (hasFrontend) return "frontend";
  return categoryRoleFamily(scenario.category);
}

export function roleMatchForScenario(scenario: ScenarioRoleMetadata, requestedRole: string | undefined): ScenarioRoleMatch {
  const requested = normalizeScenarioRole(requestedRole);
  const family = scenarioRoleFamily(scenario);
  if (!requested) {
    return { allowed: true, exact: false, fallback: false, family };
  }

  if (scenario.type === "fullstack" && requested !== "fullstack") {
    return { allowed: false, exact: false, fallback: false, family };
  }
  if (scenario.type === "backend" && requested === "frontend") {
    return { allowed: false, exact: false, fallback: false, family };
  }
  if (scenario.type === "frontend" && requested === "backend") {
    return { allowed: false, exact: false, fallback: false, family };
  }

  const roles = scenario.jobRoles.map((role) => normalizeScenarioRole(role)).filter(Boolean);
  const hasAuthoredRoles = roles.length > 0;
  const exact = roles.includes(requested);

  if (requested === "frontend") {
    const fallback = !hasAuthoredRoles && categoryRoleFamily(scenario.category) === "frontend";
    return { allowed: exact || fallback, exact, fallback, family };
  }

  if (requested === "backend") {
    const fallback = !hasAuthoredRoles && categoryRoleFamily(scenario.category) === "backend";
    return { allowed: exact || fallback, exact, fallback, family };
  }

  const broadMatch =
    roles.includes("fullstack") ||
    roles.includes("frontend") ||
    roles.includes("backend") ||
    categoryRoleFamily(scenario.category) === "frontend" ||
    categoryRoleFamily(scenario.category) === "backend" ||
    categoryRoleFamily(scenario.category) === "fullstack";
  return { allowed: broadMatch, exact, fallback: !exact && broadMatch, family };
}

export function interviewTrackMatchForScenario(
  scenario: ScenarioRoleMetadata,
  requestedRole: string | undefined,
): ScenarioTrackMatch {
  const requested = normalizeScenarioRole(requestedRole);
  const family = scenarioRoleFamily(scenario);
  if (!requested) return { allowed: true, family };

  if (requested === "fullstack") {
    return { allowed: family === "fullstack", family };
  }

  return { allowed: roleMatchForScenario(scenario, requested).allowed, family };
}

export function noScenarioMessage(role: string | undefined): string {
  const normalized = normalizeScenarioRole(role);
  if (normalized === "frontend") return "No frontend scenarios are available yet.";
  if (normalized === "backend") return "No backend scenarios are available yet.";
  if (normalized === "fullstack") return "No full-stack scenarios are available yet.";
  return "No scenarios are available yet.";
}
