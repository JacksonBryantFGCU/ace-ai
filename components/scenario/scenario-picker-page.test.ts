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

  it("machine learning role shows a clean empty state when no public ML scenarios exist", () => {
    renderPicker({ role: "ml" });

    expect(screen.getByText("No machine learning scenarios are available yet.")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();
    expect(screen.queryByText("Notes REST API")).not.toBeInTheDocument();
    expect(screen.queryByText("Customer Ops Dashboard")).not.toBeInTheDocument();
  });

  it("machine learning role only shows machine-learning scenarios once they exist", () => {
    render(
      createElement(ScenarioPickerPage, {
        config: { ...config, role: "ml" },
        scenarios: [
          ...scenarios,
          option({
            slug: "churn-model-baseline",
            title: "Churn Model Baseline",
            summary: "Train and evaluate a baseline churn classifier",
            category: "machine-learning-python",
            type: "machine-learning",
            difficulty: "medium",
            jobRoles: ["machine-learning"],
            skills: ["pandas", "scikit-learn"],
            runtime: "python",
            framework: "scikit-learn",
          }),
        ],
        recommendedSlug: null,
      }),
    );

    expect(screen.getByText("Churn Model Baseline")).toBeInTheDocument();
    expect(screen.queryByText("Todo List")).not.toBeInTheDocument();
    expect(screen.queryByText("Notes REST API")).not.toBeInTheDocument();
    expect(screen.queryByText("Customer Ops Dashboard")).not.toBeInTheDocument();
  });

  it("backend and fullstack roles never show machine-learning scenarios", () => {
    const withMl = [
      ...scenarios,
      option({
        slug: "churn-model-baseline",
        title: "Churn Model Baseline",
        category: "machine-learning-python",
        type: "machine-learning",
        jobRoles: ["machine-learning"],
        runtime: "python",
      }),
    ];

    const backendRender = render(
      createElement(ScenarioPickerPage, { config: { ...config, role: "backend" }, scenarios: withMl, recommendedSlug: null }),
    );
    expect(screen.queryByText("Churn Model Baseline")).not.toBeInTheDocument();
    backendRender.unmount();

    render(
      createElement(ScenarioPickerPage, { config: { ...config, role: "fullstack" }, scenarios: withMl, recommendedSlug: null }),
    );
    expect(screen.queryByText("Churn Model Baseline")).not.toBeInTheDocument();
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

  it("ML scenario card shows title, difficulty, estimated time, and a readable category/track label", () => {
    render(
      createElement(ScenarioPickerPage, {
        config: { ...config, role: "ml" },
        scenarios: [
          option({
            slug: "churn-model-baseline",
            title: "Churn Model Baseline",
            summary: "Train and evaluate a baseline churn classifier",
            category: "machine-learning-python",
            type: "machine-learning",
            difficulty: "hard",
            jobRoles: ["machine-learning"],
            skills: ["pandas", "scikit-learn"],
            runtime: "python",
            framework: "scikit-learn",
            estimatedMinutes: 45,
          }),
        ],
        recommendedSlug: null,
      }),
    );

    expect(screen.getByText("Churn Model Baseline")).toBeInTheDocument();
    expect(screen.getByText("hard")).toBeInTheDocument();
    expect(screen.getByText("Machine-learning")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Churn Model Baseline/ }));
    expect(screen.getAllByText("Machine learning / Python / Scikit-learn").length).toBeGreaterThan(0);
  });

  it("launching a machine-learning scenario fixture submits its slug the same way any other scenario does", async () => {
    vi.mocked(chooseTechnicalScenario).mockResolvedValue(undefined);
    render(
      createElement(ScenarioPickerPage, {
        config: { ...config, role: "ml" },
        scenarios: [
          option({
            slug: "churn-model-baseline",
            title: "Churn Model Baseline",
            category: "machine-learning-python",
            type: "machine-learning",
            jobRoles: ["machine-learning"],
            runtime: "python",
          }),
        ],
        recommendedSlug: null,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Churn Model Baseline/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start Interview" }));

    expect(chooseTechnicalScenario).toHaveBeenCalledWith("churn-model-baseline");
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
