import type { Scenario, ScenarioType } from "@/lib/scenarios/schema";

export interface ScenarioTypeMetadata {
  type?: string;
  category?: string;
  jobRoles?: readonly string[];
  frontend?: unknown;
  backend?: unknown;
  execution?: { mode?: string } | unknown;
}

function normalizeType(value: string | undefined): ScenarioType | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "frontend" || normalized === "backend" || normalized === "fullstack") return normalized;
  return null;
}

function categoryType(category: string | undefined): ScenarioType | null {
  const normalized = category?.trim().toLowerCase() ?? "";
  if (normalized.includes("fullstack") || normalized.includes("full-stack")) return "fullstack";
  if (normalized.includes("backend")) return "backend";
  if (normalized.includes("frontend")) return "frontend";
  return null;
}

function jobRoleType(jobRoles: readonly string[] | undefined): ScenarioType | null {
  const roles = (jobRoles ?? []).map((role) => role.trim().toLowerCase());
  if (roles.some((role) => role === "fullstack" || role === "full-stack" || role === "full stack")) {
    return "fullstack";
  }
  const hasFrontend = roles.some((role) => role.includes("frontend") || role.includes("front-end"));
  const hasBackend = roles.some((role) => role.includes("backend") || role.includes("back-end"));
  if (hasFrontend && hasBackend) return "fullstack";
  if (hasBackend) return "backend";
  if (hasFrontend) return "frontend";
  return null;
}

export function scenarioTypeOf(input: Scenario | ScenarioTypeMetadata): ScenarioType {
  const explicit = normalizeType(input.type);
  if (explicit) return explicit;
  const execution = input.execution as { mode?: string } | undefined;
  if (execution?.mode === "fullstack") return "fullstack";
  if (input.frontend && input.backend) return "fullstack";
  return categoryType(input.category) ?? jobRoleType(input.jobRoles) ?? "frontend";
}
