// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScenarioBrowser } from "@/components/scenario/studio/scenario-browser";
import type { StudioScenarioSummary } from "@/lib/scenarios/authoring/studio-types";

afterEach(cleanup);

function summary(partial: Partial<StudioScenarioSummary> & { slug: string; title: string }): StudioScenarioSummary {
  return {
    slug: partial.slug,
    category: partial.category ?? "frontend-react",
    title: partial.title,
    summary: partial.summary ?? "A scenario summary",
    difficulty: partial.difficulty ?? "medium",
    status: partial.status ?? "verified",
    jobRoles: partial.jobRoles ?? ["frontend"],
    skills: partial.skills ?? ["react"],
    tags: partial.tags ?? [],
    runtime: partial.runtime,
    framework: partial.framework,
    estimatedMinutes: partial.estimatedMinutes ?? 25,
    stepCount: partial.stepCount ?? 3,
    lastModifiedMs: partial.lastModifiedMs ?? 0,
    errorCount: partial.errorCount ?? 0,
    warningCount: partial.warningCount ?? 0,
    invalid: partial.invalid ?? false,
  };
}

const scenarios = [
  summary({ slug: "todo-list", title: "Todo List", difficulty: "easy", jobRoles: ["frontend"] }),
  summary({
    slug: "notes-rest-api",
    title: "Notes REST API",
    category: "backend-node",
    difficulty: "easy",
    jobRoles: ["backend"],
    tags: ["framework:express"],
    runtime: "node",
    framework: "express",
  }),
  summary({ slug: "kanban-board", title: "Kanban Board", difficulty: "hard", jobRoles: ["frontend"] }),
];

describe("ScenarioBrowser", () => {
  it("lists every scenario by default in the playground browser", () => {
    render(createElement(ScenarioBrowser, { scenarios, selectedSlug: null, onSelect: vi.fn() }));

    expect(screen.getByText("Todo List")).toBeInTheDocument();
    expect(screen.getByText("Notes REST API")).toBeInTheDocument();
    expect(screen.getByText("Kanban Board")).toBeInTheDocument();
  });

  it("supports search, role, difficulty, category, and runtime/framework filters", () => {
    render(createElement(ScenarioBrowser, { scenarios, selectedSlug: null, onSelect: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Search scenarios"), { target: { value: "express" } });
    expect(screen.getByText("Notes REST API")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search scenarios"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "frontend" } });
    expect(screen.getByText("Todo List")).toBeInTheDocument();
    expect(screen.queryByText("Notes REST API")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "hard" } });
    expect(screen.getByText("Kanban Board")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "__all__" } });
    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "__all__" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "backend-node" } });
    expect(screen.getByText("Notes REST API")).toBeInTheDocument();
    expect(screen.queryByText("Kanban Board")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "__all__" } });
    fireEvent.change(screen.getByLabelText("Runtime/framework"), { target: { value: "express" } });
    expect(screen.getByText("Notes REST API")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();
  });

  it("groups by role, sorts by difficulty, and constrains the list scroll area", () => {
    render(createElement(ScenarioBrowser, { scenarios, selectedSlug: null, onSelect: vi.fn() }));

    const frontendGroup = screen.getByRole("region", { name: "Frontend scenarios" });
    const frontendButtons = within(frontendGroup).getAllByRole("button");
    expect(frontendButtons[0]).toHaveTextContent("Todo List");
    expect(frontendButtons[1]).toHaveTextContent("Kanban Board");
    expect(screen.getByTestId("studio-scenario-scroll")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("studio-scenario-scroll").className).toContain("max-h-");
  });
});
