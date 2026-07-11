import { describe, expect, it } from "vitest";
import { scenarioTaskTypeOf } from "@/lib/scenarios/scenario-task-type";

describe("scenarioTaskTypeOf", () => {
  it("prefers an explicit taskType field", () => {
    expect(
      scenarioTaskTypeOf({ taskType: "debug", steps: [{ kind: "implement" }, { kind: "implement" }] }),
    ).toBe("debug");
  });

  it("derives the majority step kind when taskType is omitted", () => {
    expect(
      scenarioTaskTypeOf({ steps: [{ kind: "implement" }, { kind: "implement" }, { kind: "debug" }] }),
    ).toBe("implement");
  });

  it("ties are broken by first occurrence order", () => {
    expect(
      scenarioTaskTypeOf({ steps: [{ kind: "debug" }, { kind: "implement" }] }),
    ).toBe("debug");
  });

  it("defaults to implement for a scenario with no recognizable step kinds", () => {
    expect(scenarioTaskTypeOf({ steps: [] })).toBe("implement");
  });

  it("ignores an invalid explicit taskType and falls back to derivation", () => {
    expect(
      scenarioTaskTypeOf({ taskType: "bogus", steps: [{ kind: "refactor" }] }),
    ).toBe("refactor");
  });

  it("matches the current catalog's all-implement backend/fullstack/ML scenarios", () => {
    expect(
      scenarioTaskTypeOf({ steps: [{ kind: "implement" }, { kind: "implement" }, { kind: "implement" }] }),
    ).toBe("implement");
  });

  it("matches the current catalog's frontend implement/debug/explain pattern", () => {
    expect(
      scenarioTaskTypeOf({
        steps: [{ kind: "implement" }, { kind: "debug" }, { kind: "refactor" }, { kind: "explain" }],
      }),
    ).toBe("implement");
  });
});
