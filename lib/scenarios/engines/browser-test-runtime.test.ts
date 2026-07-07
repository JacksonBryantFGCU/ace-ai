// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup } from "@testing-library/react";
import { runAuthoredTests } from "@/lib/scenarios/engines/browser-test-runtime";
import type { SnapshotFile } from "@/lib/scenarios/verification";

/**
 * Faithfulness test for the browser runner: it must execute the canonical
 * scenario's REAL authored tests and reproduce the authoring contract —
 * reference solutions pass, and the step-1 code provably fails the step-2 race
 * test. Runs under jsdom (RTL needs a DOM).
 */

const ROOT = join(process.cwd(), "content", "interview-scenarios", "frontend-react", "user-directory-search");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
// Reference solutions were authored with `../../workspace/` imports; the runtime
// candidate file lives at `workspace/` and imports siblings via `./`.
const candidate = (rel: string) => read(rel).replaceAll("../../workspace/", "./");

const api = read("workspace/api.ts");
const types = read("workspace/types.ts");

function workspace(userSearch: string, extra: SnapshotFile[] = []): SnapshotFile[] {
  return [
    { path: "UserSearch.tsx", content: userSearch, role: "edit" },
    { path: "api.ts", content: api, role: "readonly" },
    { path: "types.ts", content: types, role: "readonly" },
    ...extra,
  ];
}

const step1Test = { path: "tests/step-1.test.tsx", content: read("tests/step-1.test.tsx") };
const step2Test = { path: "tests/step-2.test.tsx", content: read("tests/step-2.test.tsx") };

afterEach(() => cleanup());

describe("browser runner against the canonical scenario", () => {
  it("passes step-1 tests on the step-1 reference solution", async () => {
    const result = await runAuthoredTests({
      workspaceFiles: workspace(candidate("solution/step-1/UserSearch.tsx")),
      testFiles: [step1Test],
    });
    expect(result.errors).toEqual([]);
    expect(result.tests.length).toBe(3);
    expect(result.tests.every((t) => t.passed)).toBe(true);
  });

  it("FAILS the step-2 race test on the step-1 solution (the bug is real)", async () => {
    const result = await runAuthoredTests({
      workspaceFiles: workspace(candidate("solution/step-1/UserSearch.tsx")),
      testFiles: [step2Test],
    });
    expect(result.errors).toEqual([]);
    expect(result.tests.length).toBe(1);
    expect(result.tests[0]!.passed).toBe(false);
  });

  it("passes step-1 + step-2 tests on the step-2 reference solution", async () => {
    const result = await runAuthoredTests({
      workspaceFiles: workspace(candidate("solution/step-2/UserSearch.tsx")),
      testFiles: [step1Test, step2Test],
    });
    expect(result.errors).toEqual([]);
    expect(result.tests.every((t) => t.passed)).toBe(true);
    expect(result.tests.length).toBe(4);
  });

  it("passes carry-forward tests on the step-3 (multi-file hook) solution", async () => {
    const result = await runAuthoredTests({
      workspaceFiles: workspace(candidate("solution/step-3/UserSearch.tsx"), [
        { path: "useUserSearch.ts", content: candidate("solution/step-3/useUserSearch.ts"), role: "edit" },
      ]),
      testFiles: [step1Test, step2Test],
    });
    expect(result.errors).toEqual([]);
    expect(result.tests.every((t) => t.passed)).toBe(true);
  });

  it("fails on the unimplemented starter", async () => {
    const result = await runAuthoredTests({
      workspaceFiles: workspace(read("workspace/UserSearch.tsx")),
      testFiles: [step1Test],
    });
    expect(result.tests.some((t) => !t.passed)).toBe(true);
  });

  it("restores IS_REACT_ACT_ENVIRONMENT after a run (no global leak into the app)", async () => {
    const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown };
    const prev = g.IS_REACT_ACT_ENVIRONMENT;
    g.IS_REACT_ACT_ENVIRONMENT = false;
    await runAuthoredTests({
      workspaceFiles: workspace(candidate("solution/step-1/UserSearch.tsx")),
      testFiles: [step1Test],
    });
    // Must be back to what it was before the run — not left `true`.
    expect(g.IS_REACT_ACT_ENVIRONMENT).toBe(false);
    g.IS_REACT_ACT_ENVIRONMENT = prev;
  });
});
