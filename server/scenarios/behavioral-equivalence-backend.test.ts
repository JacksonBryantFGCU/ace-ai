import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadScenario } from "@/server/scenarios/load";
import { verifyStepOnServer } from "@/server/scenarios/verification-service";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { SnapshotFile } from "@/lib/scenarios/verification";

/**
 * Proves that verification for banking-transfers-api's "create-transfers"
 * step is behavioral (it checks HTTP routes/status codes/response
 * shapes/DB persistence), not implementation-coupled (it does not care about
 * internal helper names, control-flow shape, or file organization).
 *
 * Both fixtures below are real, hand-written candidate implementations of
 * workspace/app.ts (accounts reads + POST /transfers), run through the
 * production verifyStepOnServer path with no mocking of the harness, the
 * SQLite database, or the test runner.
 *
 * - alt-passing-app.ts: behaviorally equivalent to
 *   solution/step-2/app.ts but independently written with different helper
 *   names (e.g. `toPositiveInt` vs `parseId`, `serializeTransfer` vs
 *   `transferResponse`), different types/interfaces, and a differently
 *   organized validation flow. It must PASS.
 *
 * - invalid-lookalike-app.ts: structurally close to the reference (in fact
 *   derived from the alt-passing fixture) but has one genuine behavioral
 *   bug: the debit/credit ledger directions are swapped relative to which
 *   account gains vs loses money, while balances themselves stay correct.
 *   This breaks double-entry bookkeeping and must be caught by the
 *   authored hidden tests, so it must NOT pass.
 */

const SLUG = "banking-transfers-api";
const STEP_ID = "create-transfers";
const FIXTURE_DIR = path.join(process.cwd(), "server", "scenarios", "__fixtures__", "behavioral-equivalence-backend");

function snapshot(files: LoadedScenario["files"]): SnapshotFile[] {
  return files.map((file) => ({ path: file.path, content: file.content, role: file.role }));
}

function withAppOverride(files: LoadedScenario["files"], appContent: string): SnapshotFile[] {
  return snapshot(files).map((file) => (file.path === "app.ts" ? { ...file, content: appContent } : file));
}

describe("banking-transfers-api create-transfers: behavioral vs implementation-coupled verification", () => {
  it("passes an alternative, independently-structured passing implementation", async () => {
    const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
    const step = loaded.scenario.steps.find((s) => s.id === STEP_ID)!;
    const altPassingApp = readFileSync(path.join(FIXTURE_DIR, "alt-passing-app.ts"), "utf8");

    // Sanity check: fixture deliberately diverges from the reference solution's
    // private helper names, so this is not just a renamed copy.
    const referenceApp = readFileSync(
      path.join(
        process.cwd(),
        "content",
        "interview-scenarios",
        "backend-node",
        "banking-transfers-api",
        "solution",
        "step-2",
        "app.ts",
      ),
      "utf8",
    );
    expect(altPassingApp).not.toContain("function parseId");
    expect(altPassingApp).not.toContain("function transferResponse");
    expect(altPassingApp).not.toContain("function findAccount(");
    expect(referenceApp).toContain("function parseId");

    const result = await verifyStepOnServer({
      scenarioSlug: SLUG,
      step: {
        id: step.id,
        harness: step.verify.harness,
        functionName: step.verify.functionName,
        tests: step.verify.tests,
        timeoutMs: step.verify.timeoutMs,
      },
      files: withAppOverride(loaded.files, altPassingApp),
    });

    expect(result.engine).toBe("node");
    expect(result.errors).toEqual([]);
    expect(result.status).toBe("passed");
    expect(result.testResults.length).toBeGreaterThan(0);
    expect(result.testResults.every((test) => test.status === "passed")).toBe(true);
  });

  it("fails an invalid lookalike implementation with a real ledger-direction bug", async () => {
    const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
    const step = loaded.scenario.steps.find((s) => s.id === STEP_ID)!;
    const invalidLookalikeApp = readFileSync(path.join(FIXTURE_DIR, "invalid-lookalike-app.ts"), "utf8");

    const result = await verifyStepOnServer({
      scenarioSlug: SLUG,
      step: {
        id: step.id,
        harness: step.verify.harness,
        functionName: step.verify.functionName,
        tests: step.verify.tests,
        timeoutMs: step.verify.timeoutMs,
      },
      files: withAppOverride(loaded.files, invalidLookalikeApp),
    });

    expect(result.engine).toBe("node");
    expect(result.status).not.toBe("passed");

    const failing = result.testResults.filter((test) => test.status !== "passed");
    expect(failing.length).toBeGreaterThan(0);
    // The swapped debit/credit ledger directions should surface specifically
    // in the test that asserts the transfer's ledger entry shape/order.
    expect(
      failing.some((test) => /ledger/i.test(test.name) || /atomically/i.test(test.name)),
    ).toBe(true);
  });
});
