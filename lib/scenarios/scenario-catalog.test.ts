import { describe, expect, it } from "vitest";
import {
  filterCatalogScenarios,
  groupCatalogScenarios,
  runtimeFrameworkValue,
  type CatalogScenario,
} from "@/lib/scenarios/scenario-catalog";

function scenario(partial: Partial<CatalogScenario> & { slug: string; title: string }): CatalogScenario {
  return {
    slug: partial.slug,
    title: partial.title,
    summary: partial.summary ?? "A scenario summary",
    category: partial.category ?? "frontend-react",
    type: partial.type,
    difficulty: partial.difficulty ?? "medium",
    jobRoles: partial.jobRoles ?? ["frontend"],
    skills: partial.skills ?? ["react"],
    tags: partial.tags ?? [],
    runtime: partial.runtime,
    framework: partial.framework,
    estimatedMinutes: partial.estimatedMinutes ?? 25,
  };
}

const catalog = [
  scenario({
    slug: "todo-list",
    title: "Todo List",
    summary: "Manage client state with React",
    category: "frontend-react",
    type: "frontend",
    difficulty: "easy",
    jobRoles: ["frontend"],
    tags: ["framework:react"],
    framework: "react",
  }),
  scenario({
    slug: "notes-rest-api",
    title: "Notes REST API",
    summary: "Build an Express API backed by SQLite",
    category: "backend-node",
    type: "backend",
    difficulty: "easy",
    jobRoles: ["backend"],
    skills: ["rest-api"],
    tags: ["framework:express", "database:sqlite"],
    runtime: "node",
    framework: "express",
  }),
  scenario({
    slug: "fullstack-dashboard",
    title: "Full-Stack Dashboard",
    summary: "Wire a React client to an API",
    category: "fullstack-node-react",
    type: "fullstack",
    difficulty: "hard",
    jobRoles: ["fullstack"],
    runtime: "node",
    framework: "next",
  }),
  scenario({
    slug: "kanban-board",
    title: "Kanban Board",
    summary: "Drag cards between columns",
    category: "frontend-react",
    type: "frontend",
    difficulty: "hard",
    jobRoles: ["frontend"],
    tags: ["drag-drop"],
    framework: "react",
  }),
];

describe("scenario catalog filtering", () => {
  it("search filters by title, summary, and tag", () => {
    expect(filterCatalogScenarios(catalog, { query: "notes" }).map((s) => s.slug)).toEqual(["notes-rest-api"]);
    expect(filterCatalogScenarios(catalog, { query: "SQLite" }).map((s) => s.slug)).toEqual(["notes-rest-api"]);
    expect(filterCatalogScenarios(catalog, { query: "drag-drop" }).map((s) => s.slug)).toEqual(["kanban-board"]);
  });

  it("difficulty, role, category, and runtime/framework filters work", () => {
    expect(filterCatalogScenarios(catalog, { difficulty: "easy" }).map((s) => s.slug)).toEqual([
      "todo-list",
      "notes-rest-api",
    ]);
    expect(filterCatalogScenarios(catalog, { role: "backend" }).map((s) => s.slug)).toEqual(["notes-rest-api"]);
    expect(filterCatalogScenarios(catalog, { category: "frontend-react" }).map((s) => s.slug)).toEqual([
      "todo-list",
      "kanban-board",
    ]);
    expect(filterCatalogScenarios(catalog, { runtimeFramework: "express" }).map((s) => s.slug)).toEqual([
      "notes-rest-api",
    ]);
    expect(filterCatalogScenarios(catalog, { scenarioType: "fullstack" }).map((s) => s.slug)).toEqual([
      "fullstack-dashboard",
    ]);
  });

  it("allowedRole is a hard boundary for setup pickers", () => {
    expect(filterCatalogScenarios(catalog, { allowedRole: "backend" }).map((s) => s.slug)).toEqual([
      "notes-rest-api",
    ]);
    expect(filterCatalogScenarios(catalog, { allowedRole: "fullstack" }).map((s) => s.slug)).toEqual([
      "fullstack-dashboard",
    ]);
  });

  it("groups by role family and sorts within each group by difficulty", () => {
    const groups = groupCatalogScenarios(catalog);
    expect(groups.map((group) => [group.label, group.scenarios.map((s) => s.slug)])).toEqual([
      ["Frontend", ["todo-list", "kanban-board"]],
      ["Backend", ["notes-rest-api"]],
      ["Full-Stack", ["fullstack-dashboard"]],
    ]);
  });

  it("runtimeFrameworkValue prefers framework over runtime", () => {
    expect(runtimeFrameworkValue(catalog[1]!)).toBe("express");
  });
});
