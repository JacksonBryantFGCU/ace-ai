import { describe, expect, it } from "vitest";
import { runNodeTests, type NodeRunInput } from "@/lib/scenarios/execution/engines/node/runtime";
import { nodeEngine } from "@/lib/scenarios/execution/engines/node-engine";
import { executionPlatform } from "@/server/scenarios/execution-platform";
import { profileFromHarness } from "@/lib/scenarios/execution/profile";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";

/** Helper: a workspace file + a single test file that imports it. */
function run(files: NodeRunInput["workspaceFiles"], test: string, limits?: NodeRunInput["limits"]) {
  return runNodeTests({ workspaceFiles: files, testFiles: [{ path: "tests/s.test.ts", content: test }], limits });
}

const MATH = { path: "math.ts", content: "export function add(a: number, b: number) { return a + b; }", role: "edit" };

describe("node runtime — successful execution", () => {
  it("runs a passing test against a pure TypeScript module", async () => {
    const result = await run(
      [MATH],
      `import { add } from "../workspace/math";
       test("adds", () => { expect(add(2, 3)).toBe(5); });`,
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0]).toMatchObject({ name: "adds", passed: true });
  });

  it("supports the narrow crypto builtin for auth scenarios", async () => {
    const result = await run(
      [
        {
          path: "auth.ts",
          content: `import { randomBytes, scryptSync } from "node:crypto";
            export function makeToken() { return randomBytes(16).toString("hex"); }
            export function hash(password: string, salt: string) { return scryptSync(password, salt, 16).toString("hex"); }`,
          role: "edit",
        },
      ],
      `import { makeToken, hash } from "../workspace/auth";
       test("crypto works", () => {
         expect(makeToken()).toHaveLength(32);
         expect(hash("Password123!", "salt")).toHaveLength(32);
       });`,
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.tests[0]).toMatchObject({ passed: true });
  });

  it("supports describe blocks, beforeEach/afterEach, and multiple tests", async () => {
    const result = await run(
      [MATH],
      `let calls = 0;
       beforeEach(() => { calls++; });
       describe("add", () => {
         test("2+3", () => { expect(add(2,3)).toBe(5); });
         test("uses beforeEach", () => { expect(calls).toBeGreaterThan(0); });
       });
       import { add } from "../workspace/math";`,
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.tests.map((t) => t.passed)).toEqual([true, true]);
    expect(result.tests[0]!.name).toContain("add");
  });
});

describe("node runtime — multiple modules & resolution", () => {
  it("resolves relative imports across multiple workspace modules", async () => {
    const files = [
      { path: "a.ts", content: `import { b } from "./b"; export const a = () => b() + 1;`, role: "edit" },
      { path: "b.ts", content: `export const b = () => 41;`, role: "readonly" },
    ];
    const result = await run(files, `import { a } from "../workspace/a"; test("a", () => { expect(a()).toBe(42); });`);
    expect(result.diagnostics).toEqual([]);
    expect(result.tests[0]!.passed).toBe(true);
  });

  it("resolves index.ts for a directory import", async () => {
    const files = [
      { path: "util/index.ts", content: `export const answer = 42;`, role: "readonly" },
      { path: "main.ts", content: `import { answer } from "./util"; export const get = () => answer;`, role: "edit" },
    ];
    const result = await run(files, `import { get } from "../workspace/main"; test("i", () => { expect(get()).toBe(42); });`);
    expect(result.diagnostics).toEqual([]);
    expect(result.tests[0]!.passed).toBe(true);
  });
});

describe("node runtime — structured diagnostics", () => {
  it("reports a compilation error with category, file, and line", async () => {
    const result = await run(
      [{ path: "broken.ts", content: "export const x: number = ;", role: "edit" }],
      `import { x } from "../workspace/broken"; test("t", () => { expect(x).toBe(1); });`,
    );
    expect(result.tests).toHaveLength(0);
    expect(result.diagnostics[0]).toMatchObject({ category: "compilation", file: "workspace/broken.ts" });
    expect(result.diagnostics[0]!.line).toBeGreaterThan(0);
  });

  it("reports an import error for a missing relative module", async () => {
    const result = await run([MATH], `import { z } from "../workspace/nope"; test("t", () => { expect(z).toBe(1); });`);
    expect(result.diagnostics[0]!.category).toBe("import");
  });

  it("detects unsupported features (a Node/npm import) instead of crashing", async () => {
    const result = await run(
      [{ path: "bad.ts", content: `import * as fs from "fs"; export const read = () => fs.readFileSync("x");`, role: "edit" }],
      `import { read } from "../workspace/bad"; test("t", () => { expect(read).toBeDefined(); });`,
    );
    expect(result.diagnostics[0]!.category).toBe("unsupported");
    expect(result.diagnostics[0]!.message).toMatch(/fs/);
  });

  it("categorizes an assertion failure as a failed test (not a crash)", async () => {
    const result = await run([MATH], `import { add } from "../workspace/math"; test("t", () => { expect(add(2,2)).toBe(5); });`);
    expect(result.tests[0]).toMatchObject({ passed: false, category: "assertion" });
  });

  it("categorizes a thrown runtime exception as a failed test", async () => {
    const result = await run([MATH], `test("t", () => { throw new Error("boom"); });`);
    expect(result.tests[0]).toMatchObject({ passed: false, category: "runtime", message: "boom" });
  });

  it("times out an async test that never settles", async () => {
    const result = await run(
      [MATH],
      `test("hangs", async () => { await new Promise(() => {}); });`,
      { testTimeoutMs: 40, totalTimeoutMs: 500 },
    );
    expect(result.tests[0]).toMatchObject({ passed: false, category: "timeout" });
  });

  it("reports when no tests are found", async () => {
    const result = await run([MATH], `import { add } from "../workspace/math"; const two = add(1,1);`);
    expect(result.diagnostics[0]!.category).toBe("internal");
  });
});

describe("node runtime — isolation & determinism", () => {
  it("does not leak module state between separate runs (fresh environment each time)", async () => {
    const files = [{ path: "counter.ts", content: `let n = 0; export const inc = () => ++n;`, role: "edit" }];
    const test = `import { inc } from "../workspace/counter"; test("first call is 1", () => { expect(inc()).toBe(1); });`;
    const first = await run(files, test);
    const second = await run(files, test);
    expect(first.tests[0]!.passed).toBe(true);
    expect(second.tests[0]!.passed).toBe(true); // would be 2 if state leaked
  });

  it("does not leak sandbox globals across runs", async () => {
    await run([MATH], `(globalThis as any).__leak = 123; test("set", () => { expect((globalThis as any).__leak).toBe(123); });`);
    const second = await run([MATH], `test("clean", () => { expect((globalThis as any).__leak).toBeUndefined(); });`);
    expect(second.tests[0]!.passed).toBe(true);
  });

  it("produces identical results across repeated verification runs", async () => {
    const test = `import { add } from "../workspace/math"; test("adds", () => { expect(add(2,3)).toBe(5); });`;
    const a = await run([MATH], test);
    const b = await run([MATH], test);
    expect(a.tests[0]!.passed).toBe(b.tests[0]!.passed);
  });
});

describe("node engine — through the execution context", () => {
  function context(workspace: NodeRunInput["workspaceFiles"], testContent: string): ExecutionContext {
    return {
      scenarioSlug: "s",
      step: { id: "impl", harness: "node-vm", functionName: "add" },
      workspaceFiles: workspace.map((f) => ({ path: f.path, content: f.content, role: (f.role as "edit" | "readonly") ?? "edit" })),
      testFiles: [{ path: "tests/s.test.ts", content: testContent }],
      profile: profileFromHarness("node-vm"),
      verificationOptions: {},
      environment: "server",
      metadata: {},
    };
  }

  it("verifies a passing Node scenario and returns a react/component-shaped result under engine 'node'", async () => {
    const result = await nodeEngine.verify(
      context([MATH], `import { add } from "../workspace/math"; test("adds", () => { expect(add(2,3)).toBe(5); });`),
    );
    expect(result.engine).toBe("node");
    expect(result.status).toBe("passed");
    expect(result.passed).toBe(true);
    expect(result.testResults).toHaveLength(1);
  });

  it("maps a failing assertion to status 'failed'", async () => {
    const result = await nodeEngine.verify(
      context([MATH], `import { add } from "../workspace/math"; test("adds", () => { expect(add(2,3)).toBe(6); });`),
    );
    expect(result.status).toBe("failed");
    expect(result.passed).toBe(false);
  });

  it("maps a compilation problem to status 'errored' with a structured error (file/line/kind)", async () => {
    const result = await nodeEngine.verify(
      context(
        [{ path: "broken.ts", content: "export const x: number = ;", role: "edit" }],
        `import { x } from "../workspace/broken"; test("t", () => { expect(x).toBe(1); });`,
      ),
    );
    expect(result.status).toBe("errored");
    expect(result.errors[0]).toMatchObject({ kind: "compilation", file: "workspace/broken.ts" });
  });

  it("advertises v1 capabilities and supports only the node profile", () => {
    expect(nodeEngine.capabilities().supportsMultipleFiles).toBe(true);
    expect(nodeEngine.capabilities().supportsFilesystem).toBe(false);
    expect(nodeEngine.supports(profileFromHarness("node-vm"))).toBe(true);
    expect(nodeEngine.supports(profileFromHarness("component"))).toBe(false);
  });

  it("executes a Node context end-to-end through the shared ExecutionPlatform (same platform React uses)", async () => {
    const result = await executionPlatform.verify(
      context([MATH], `import { add } from "../workspace/math"; test("adds", () => { expect(add(2,3)).toBe(5); });`),
    );
    expect(result.engine).toBe("node");
    expect(result.status).toBe("passed");
  });
});
