// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { scenarioSchema } from "@/lib/scenarios/schema";
import { validateSolution } from "@/lib/scenarios/authoring/solution";
import { createExecutionPlatform } from "@/lib/scenarios/execution/platform-factory";
import type { AuthoredBundle, Diagnostic } from "@/lib/scenarios/authoring/types";

const codes = (ds: Diagnostic[]) => ds.map((d) => d.code);

// Execute solutions through the real (shared) ExecutionPlatform, exactly as the
// CLI does — engine selection comes from each scenario's profile.
const { platform } = createExecutionPlatform();
const verify = (context: Parameters<typeof platform.verify>[0]) => platform.verify(context);

const TEST_SRC = `
import { render, screen } from "@testing-library/react";
import { Widget } from "../workspace/Widget";
test("renders the ready label", () => {
  render(<Widget />);
  expect(screen.getByText("ready")).toBeInTheDocument();
});`;

function componentBundle(overrides: {
  solution?: string;
  test?: string;
  checkpoint?: boolean;
}): AuthoredBundle {
  const fm = {
    id: "sample",
    title: "Sample",
    summary: "Authoring toolkit solution-validation fixture, self-contained here.",
    category: "frontend-react",
    skills: ["state"],
    jobRoles: ["frontend"],
    difficulty: "medium",
    experienceMin: "entry",
    experienceMax: "senior",
    estimatedMinutes: 25,
    stack: { languages: ["typescript"], harness: "component" },
    workspace: { files: [{ path: "Widget.tsx", role: "edit" }], entry: "Widget.tsx" },
    rubric: [{ criterion: "Correctness", weight: 100, detail: "Renders the label." }],
    status: "review",
    version: 1,
    steps: [
      {
        id: "build",
        kind: "implement",
        prompt: "Render a div with the text ready.",
        verification: "automated-tests",
        verify: { harness: "component", functionName: "Widget", tests: ["tests/build.test.tsx"] },
        weight: 100,
        ...(overrides.checkpoint === false ? {} : { checkpoint: { files: ["solution/build/Widget.tsx"] } }),
      },
    ],
  };
  const parsed = scenarioSchema.safeParse(fm);
  if (!parsed.success) throw new Error("fixture frontmatter invalid: " + parsed.error.message);

  return {
    slug: "sample",
    category: "frontend-react",
    raw: "(test)",
    frontmatter: fm,
    scenario: parsed.data,
    schemaError: null,
    sections: {},
    files: {
      "workspace/Widget.tsx": "export function Widget() { return null; }",
      "tests/build.test.tsx": overrides.test ?? TEST_SRC,
      "solution/build/Widget.tsx": overrides.solution ?? "export function Widget() { return <div>ready</div>; }",
    },
  };
}

// Executing real React through the platform pays a one-time RTL host-module
// cold-start; allow ample time so the first run isn't a false timeout.
const EXEC_TIMEOUT = 30000;

describe("solution validation (executes tests)", () => {
  it("passes when the reference solution satisfies every test", async () => {
    const ds = await validateSolution(componentBundle({}), verify);
    expect(ds.filter((d) => d.level === "error")).toEqual([]);
  }, EXEC_TIMEOUT);

  it("fails when the reference solution does NOT pass its tests", async () => {
    const ds = await validateSolution(componentBundle({ solution: "export function Widget() { return <div>WRONG</div>; }" }), verify);
    expect(codes(ds)).toContain("solution/tests-fail");
  }, EXEC_TIMEOUT);

  it("reports a load error when a test imports a missing module", async () => {
    const badTest = `import { Nope } from "../workspace/DoesNotExist";\ntest("x", () => { Nope(); });`;
    const ds = await validateSolution(componentBundle({ test: badTest }), verify);
    expect(codes(ds)).toContain("solution/load-error");
  }, EXEC_TIMEOUT);

  it("warns when a verification step has no reference solution/checkpoint", async () => {
    const ds = await validateSolution(componentBundle({ checkpoint: false }), verify);
    expect(codes(ds)).toContain("solution/no-reference-solution");
  }, EXEC_TIMEOUT);
});
