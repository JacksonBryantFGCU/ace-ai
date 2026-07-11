import { describe, expect, it } from "vitest";
import { parseScenario, splitFrontmatter, splitSections } from "@/lib/scenarios/parse";

/**
 * A minimal, valid scenario used as the base for validation tests. Individual
 * tests clone-and-break one field to assert the invariant that guards it.
 */
const VALID = `---
id: sample-scenario
title: Sample Scenario
summary: A small sample used to exercise the scenario schema and parser.
category: frontend-react
skills: [react-state]
jobRoles: [frontend]
difficulty: medium
experienceMin: entry
experienceMax: senior
estimatedMinutes: 25
stack:
  languages: [typescript]
  harness: component
workspace:
  files:
    - { path: Widget.tsx, role: edit }
    - { path: api.ts, role: readonly }
  entry: Widget.tsx
rubric:
  - { criterion: Coherence, weight: 60, detail: "stays coherent" }
  - { criterion: Communication, weight: 40, detail: "explains well" }
status: draft
version: 1
steps:
  - id: build
    kind: implement
    prompt: Build the widget.
    verification: automated-tests
    verify: { harness: component, functionName: Widget, tests: [tests/step-1.test.tsx] }
    weight: 60
  - id: discuss
    kind: explain
    prompt: Explain the tradeoffs.
    verification: rubric
    verify: { harness: none }
    rubric:
      - { criterion: Insight, weight: 100, detail: "shows insight" }
    weight: 40
---

## Overview

An overview of the sample.

## Reference Solutions

Authored-only content that must be stripped by the loader.
`;

describe("splitFrontmatter", () => {
  it("splits frontmatter and body", () => {
    const { frontmatter, body } = splitFrontmatter(VALID);
    expect((frontmatter as { id: string }).id).toBe("sample-scenario");
    expect(body).toContain("## Overview");
  });

  it("throws when the frontmatter fence is missing", () => {
    expect(() => splitFrontmatter("no frontmatter here")).toThrow(/missing YAML frontmatter/);
  });
});

describe("splitSections", () => {
  it("keys sections by their level-2 heading", () => {
    const sections = splitSections("## A\nalpha\n## B\nbeta");
    expect(sections).toEqual({ A: "alpha", B: "beta" });
  });
});

describe("parseScenario", () => {
  it("parses a valid scenario", () => {
    const { scenario, sections } = parseScenario(VALID);
    expect(scenario.id).toBe("sample-scenario");
    expect(scenario.steps).toHaveLength(2);
    expect(sections["Overview"]).toContain("overview of the sample");
  });

  it("rejects summary equal to title", () => {
    const broken = VALID.replace(
      "summary: A small sample used to exercise the scenario schema and parser.",
      "summary: Sample Scenario",
    );
    expect(() => parseScenario(broken)).toThrow(/summary must differ from title/);
  });

  it("rejects step weights that do not sum to 100", () => {
    const broken = VALID.replace("weight: 40\n---", "weight: 30\n---");
    expect(() => parseScenario(broken)).toThrow(/step weights must sum to 100/);
  });

  it("rejects an explain step that declares tests", () => {
    const broken = VALID.replace(
      "verify: { harness: none }",
      "verify: { harness: none, tests: [tests/x.test.tsx] }",
    );
    expect(() => parseScenario(broken)).toThrow(/explain steps/);
  });

  it("rejects an entry that is not among workspace files", () => {
    const broken = VALID.replace("entry: Widget.tsx", "entry: Missing.tsx");
    expect(() => parseScenario(broken)).toThrow(/not among workspace.files/);
  });

  it("rejects an implement step missing tests", () => {
    const broken = VALID.replace(
      "verify: { harness: component, functionName: Widget, tests: [tests/step-1.test.tsx] }",
      "verify: { harness: component, functionName: Widget }",
    );
    expect(() => parseScenario(broken)).toThrow(/must declare tests/);
  });

  it("parses an explicit scenario-level taskType", () => {
    const withTaskType = VALID.replace("status: draft", "status: draft\ntaskType: debug");
    const { scenario } = parseScenario(withTaskType);
    expect(scenario.taskType).toBe("debug");
  });

  it("leaves taskType undefined when omitted (backward compatible)", () => {
    const { scenario } = parseScenario(VALID);
    expect(scenario.taskType).toBeUndefined();
  });

  it("rejects an invalid taskType value", () => {
    const broken = VALID.replace("status: draft", "status: draft\ntaskType: invalid-kind");
    expect(() => parseScenario(broken)).toThrow();
  });
});
