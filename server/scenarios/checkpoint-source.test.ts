import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Regression test: a real interview session applying a checkpoint must
 * receive the solution file with its imports rewritten for its new flat
 * location (`../../workspace/api` → `./api`) — the same rewrite the
 * authoring toolkit's solution validator already applies when overlaying a
 * checkpoint to verify it (`lib/scenarios/authoring/solution.ts`). Before
 * this fix, `filesystemCheckpointSource` served the raw, unrewritten file,
 * so "Use Checkpoint" during a real interview left the candidate with a
 * workspace file whose relative import couldn't resolve.
 */

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
  vi.doUnmock("@/server/scenarios/load");
});

function makeScenarioDir(): string {
  dir = mkdtempSync(join(tmpdir(), "checkpoint-source-"));
  mkdirSync(join(dir, "solution", "step-1"), { recursive: true });
  writeFileSync(
    join(dir, "scenario.md"),
    `---
id: fixture-scenario
title: Fixture Scenario
summary: "A fixture scenario for checkpoint-source tests."
category: frontend-react
skills: [state]
jobRoles: [frontend]
tags: [framework:react]
difficulty: medium
experienceMin: entry
experienceMax: senior
estimatedMinutes: 10
stack:
  languages: [typescript]
  harness: component
workspace:
  files:
    - { path: Widget.tsx, role: edit }
    - { path: api.ts, role: readonly }
  entry: Widget.tsx
rubric:
  - criterion: Correctness
    weight: 100
    detail: Works as specified.
status: review
version: 1
steps:
  - id: build
    kind: implement
    prompt: p
    verification: automated-tests
    verify: { harness: component, functionName: Widget, tests: [tests/build.test.tsx] }
    weight: 100
    checkpoint: { files: [solution/step-1/Widget.tsx] }
---

## Overview
Fixture.
`,
  );
  writeFileSync(
    join(dir, "solution", "step-1", "Widget.tsx"),
    'import { fetchThing } from "../../workspace/api";\nexport function Widget() { return fetchThing(); }',
  );
  return dir;
}

describe("filesystemCheckpointSource", () => {
  it("rewrites ../../workspace/ imports so the checkpoint file resolves at its flat workspace-root location", async () => {
    const scenarioDir = makeScenarioDir();
    vi.doMock("@/server/scenarios/load", () => ({ findScenarioDir: () => scenarioDir }));

    const { filesystemCheckpointSource } = await import("@/server/scenarios/checkpoint-source");
    const files = await filesystemCheckpointSource.resolve("fixture-scenario", "build");

    expect(files).toEqual([
      { path: "Widget.tsx", content: 'import { fetchThing } from "./api";\nexport function Widget() { return fetchThing(); }' },
    ]);
  });
});
