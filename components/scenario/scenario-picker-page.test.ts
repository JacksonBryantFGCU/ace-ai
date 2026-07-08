// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseTechnicalScenario } from "@/actions/interview";
import { ScenarioPickerPage } from "@/components/scenario/scenario-picker-page";
import type { ScenarioPickerOption } from "@/lib/scenarios/types";
import type { VapiInterviewConfig } from "@/types/interview";

vi.mock("@/actions/interview", () => ({
  chooseTechnicalScenario: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(chooseTechnicalScenario).mockReset();
});

function option(partial: Partial<ScenarioPickerOption> & { slug: string; title: string }): ScenarioPickerOption {
  return {
    slug: partial.slug,
    category: partial.category ?? "frontend-react",
    type: partial.type ?? "frontend",
    title: partial.title,
    summary: partial.summary ?? "A scenario summary",
    difficulty: partial.difficulty ?? "medium",
    skills: partial.skills ?? ["react"],
    tags: partial.tags ?? [],
    jobRoles: partial.jobRoles ?? ["frontend"],
    runtime: partial.runtime,
    framework: partial.framework,
    estimatedMinutes: partial.estimatedMinutes ?? 25,
    status: partial.status ?? "verified",
    stepPreview: partial.stepPreview ?? [{ id: "step-1", kind: "implement", prompt: "Build the first step." }],
  };
}

const scenarios = [
  option({
    slug: "todo-list",
    title: "Todo List",
    summary: "Build a React todo app",
    difficulty: "easy",
    jobRoles: ["frontend"],
    framework: "react",
    tags: ["state"],
  }),
  option({
    slug: "notes-rest-api",
    title: "Notes REST API",
    summary: "Build an Express API with SQLite",
    category: "backend-node",
    type: "backend",
    difficulty: "easy",
    jobRoles: ["backend"],
    skills: ["rest-api"],
    tags: ["framework:express", "database:sqlite"],
    runtime: "node",
    framework: "express",
  }),
  option({
    slug: "kanban-board",
    title: "Kanban Board",
    summary: "Move cards between columns",
    difficulty: "hard",
    jobRoles: ["frontend"],
    framework: "react",
  }),
  option({
    slug: "customer-ops-dashboard",
    title: "Customer Ops Dashboard",
    summary: "Wire a React app to a Node API backed by SQLite",
    category: "fullstack-react-node",
    type: "fullstack",
    difficulty: "medium",
    jobRoles: ["fullstack"],
    runtime: "node",
    tags: ["framework:react", "database:sqlite"],
    framework: "express",
  }),
];

const config: VapiInterviewConfig = {
  role: "backend",
  difficulty: "medium",
  experience: "junior",
  strictness: "balanced",
  questionType: "technical",
  interviewer: "cassidy",
};

function renderPicker(overrides: Partial<VapiInterviewConfig> = {}) {
  return render(
    createElement(ScenarioPickerPage, {
      config: { ...config, ...overrides },
      scenarios,
      recommendedSlug: null,
    }),
  );
}

describe("ScenarioPickerPage", () => {
  it("backend role only shows backend scenarios", () => {
    renderPicker({ role: "backend" });

    expect(screen.getByText("Notes REST API")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();
    expect(screen.queryByText("Kanban Board")).not.toBeInTheDocument();
  });

  it("frontend role only shows frontend scenarios", () => {
    renderPicker({ role: "frontend" });

    expect(screen.getByText("Todo List")).toBeInTheDocument();
    expect(screen.getByText("Kanban Board")).toBeInTheDocument();
    expect(screen.queryByText("Notes REST API")).not.toBeInTheDocument();
  });

  it("full-stack role only shows fullstack scenarios in the live interview picker", () => {
    renderPicker({ role: "fullstack" });

    expect(screen.getByText("Customer Ops Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();
    expect(screen.queryByText("Kanban Board")).not.toBeInTheDocument();
    expect(screen.queryByText("Notes REST API")).not.toBeInTheDocument();
  });

  it("search filters scenarios by text and tags", () => {
    renderPicker({ role: "fullstack" });

    fireEvent.change(screen.getByLabelText("Search scenarios"), { target: { value: "sqlite" } });

    expect(screen.getByText("Customer Ops Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();
  });

  it("difficulty, category, and stack filters work", () => {
    renderPicker({ role: "fullstack" });

    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "medium" } });
    expect(screen.getByText("Customer Ops Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "__all__" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "fullstack-react-node" } });
    expect(screen.getByText("Customer Ops Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Kanban Board")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "__all__" } });
    fireEvent.change(screen.getByLabelText("Stack/runtime"), { target: { value: "express" } });
    expect(screen.getByText("Customer Ops Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Notes REST API")).not.toBeInTheDocument();
  });

  it("scenario type filter works", () => {
    renderPicker({ role: "fullstack" });

    fireEvent.change(screen.getByLabelText("Scenario type"), { target: { value: "fullstack" } });

    expect(screen.getByText("Customer Ops Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();
    expect(screen.queryByText("Kanban Board")).not.toBeInTheDocument();
  });

  it("renders a readable fullstack category label", () => {
    renderPicker({ role: "fullstack" });

    fireEvent.click(screen.getByRole("button", { name: /Customer Ops Dashboard/ }));

    expect(screen.getAllByText("Fullstack / React / Node / Express / SQLite").length).toBeGreaterThan(0);
  });

  it("selected scenario enables Start Interview and submits the slug", async () => {
    vi.mocked(chooseTechnicalScenario).mockResolvedValue(undefined);
    renderPicker({ role: "backend" });

    const start = screen.getByRole("button", { name: "Start Interview" });
    expect(start).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Notes REST API/ }));
    const enabledStart = screen.getByRole("button", { name: "Start Interview" });
    expect(enabledStart).toBeEnabled();
    fireEvent.click(enabledStart);

    expect(chooseTechnicalScenario).toHaveBeenCalledWith("notes-rest-api");
  });

  it("uses an internal scroll container for the scenario list", () => {
    renderPicker({ role: "fullstack" });

    const scroll = screen.getByTestId("scenario-picker-scroll");
    expect(scroll).toHaveClass("overflow-y-auto");
    expect(scroll).toHaveClass("min-h-0");
  });
});
