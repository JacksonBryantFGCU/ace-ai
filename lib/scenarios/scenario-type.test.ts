import { describe, expect, it } from "vitest";
import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";

describe("scenarioTypeOf — machine-learning detection", () => {
  it("prefers an explicit type field", () => {
    expect(scenarioTypeOf({ type: "machine-learning", category: "frontend-react" })).toBe("machine-learning");
  });

  it("detects execution.mode: python-ml when type is omitted", () => {
    expect(scenarioTypeOf({ category: "other", execution: { mode: "python-ml" } })).toBe("machine-learning");
  });

  it("detects runtime: python combined with an ML category", () => {
    expect(scenarioTypeOf({ category: "machine-learning-python", runtime: "python" })).toBe("machine-learning");
  });

  it("does not misclassify a plain python backend scenario without ML category signals", () => {
    expect(scenarioTypeOf({ category: "backend-python", runtime: "python" })).toBe("backend");
  });

  it("infers from category text", () => {
    expect(scenarioTypeOf({ category: "machine-learning-python" })).toBe("machine-learning");
    expect(scenarioTypeOf({ category: "Machine Learning / Python" })).toBe("machine-learning");
  });

  it("infers from job roles when category is uninformative", () => {
    expect(scenarioTypeOf({ category: "misc", jobRoles: ["machine-learning"] })).toBe("machine-learning");
    expect(scenarioTypeOf({ category: "misc", jobRoles: ["ML"] })).toBe("machine-learning");
  });

  it("still resolves existing types unaffected by the new branch", () => {
    expect(scenarioTypeOf({ type: "backend" })).toBe("backend");
    expect(scenarioTypeOf({ execution: { mode: "fullstack" } })).toBe("fullstack");
    expect(scenarioTypeOf({ category: "frontend-react" })).toBe("frontend");
  });
});
