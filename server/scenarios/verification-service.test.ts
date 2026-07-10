import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyFinalOnServer, verifyStepOnServer } from "@/server/scenarios/verification-service";
import type { SnapshotFile } from "@/lib/scenarios/verification";

/**
 * End-to-end proof of the PRODUCTION execution layer: run the canonical scenario's
 * REAL authored tests through the server-side service (jsdom installed by
 * `ensureDomEnv`, tests resolved from the filesystem `TestSource`), and reproduce
 * the authoring contract — reference solutions pass, and the naive step-1 solution
 * provably fails the step-2 race test. This is the browser-runtime faithfulness
 * test, but exercised through the server path candidates actually hit.
 *
 * Runs in the default `node` environment (no vitest jsdom), so it also proves the
 * server DOM setup works with no test-runner help.
 */
const ROOT = join(process.cwd(), "content", "interview-scenarios", "frontend-react", "user-directory-search");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
// Reference solutions import from `../../workspace/`; the runtime candidate file
// lives at `workspace/` and imports siblings via `./` (mirrors the runtime test).
const candidate = (rel: string) => read(rel).replaceAll("../../workspace/", "./");

function workspace(userSearch: string, extra: SnapshotFile[] = []): SnapshotFile[] {
  return [
    { path: "UserSearch.tsx", content: userSearch, role: "edit" },
    { path: "api.ts", content: read("workspace/api.ts"), role: "readonly" },
    { path: "types.ts", content: read("workspace/types.ts"), role: "readonly" },
    ...extra,
  ];
}

const componentStep = (id: string) => ({ id, harness: "component", functionName: "UserSearch" });

describe("server verification service (production execution layer)", () => {
  it("passes step-1 tests on the step-1 reference solution", async () => {
    const result = await verifyStepOnServer({
      scenarioSlug: "user-directory-search",
      step: componentStep("build-search"),
      files: workspace(candidate("solution/step-1/UserSearch.tsx")),
    });
    expect(result.engine).toBe("react");
    expect(result.status).toBe("passed");
    expect(result.passed).toBe(true);
    expect(result.testResults.length).toBe(3);
  });

  it("FAILS on the step-1 solution when the step-2 race test is included (the bug is real)", async () => {
    const result = await verifyStepOnServer({
      scenarioSlug: "user-directory-search",
      step: componentStep("fix-stale-results"), // declares step-1 + step-2 tests
      files: workspace(candidate("solution/step-1/UserSearch.tsx")),
    });
    expect(result.errors).toEqual([]);
    expect(result.status).toBe("failed");
    expect(result.passed).toBe(false);
  });

  it("passes the step-2 tests on the step-2 reference solution", async () => {
    const result = await verifyStepOnServer({
      scenarioSlug: "user-directory-search",
      step: componentStep("fix-stale-results"),
      files: workspace(candidate("solution/step-2/UserSearch.tsx")),
    });
    expect(result.status).toBe("passed");
    expect(result.testResults.every((t) => t.status === "passed")).toBe(true);
  });

  it("returns `unsupported` for a harness whose engine is an unimplemented placeholder", async () => {
    const result = await verifyStepOnServer({
      scenarioSlug: "user-directory-search",
      step: { id: "build-search", harness: "python" },
      files: workspace(candidate("solution/step-1/UserSearch.tsx")),
    });
    expect(result.status).toBe("unsupported");
  });

  it("serializes concurrent runs without cross-run interference", async () => {
    const [a, b] = await Promise.all([
      verifyStepOnServer({
        scenarioSlug: "user-directory-search",
        step: componentStep("build-search"),
        files: workspace(candidate("solution/step-1/UserSearch.tsx")),
      }),
      verifyStepOnServer({
        scenarioSlug: "user-directory-search",
        step: componentStep("fix-stale-results"),
        files: workspace(candidate("solution/step-1/UserSearch.tsx")),
      }),
    ]);
    expect(a.status).toBe("passed"); // step-1 tests only
    expect(b.status).toBe("failed"); // step-1 + step-2 → race fails
  });
});

describe("verifyFinalOnServer (Phase 4 — compatibility)", () => {
  it("leaves a non-ML (single-file) scenario's final validation as a clear manual result, not a crash", async () => {
    const result = await verifyFinalOnServer({
      scenarioSlug: "user-directory-search",
      files: workspace(candidate("solution/step-1/UserSearch.tsx")),
    });
    expect(result.status).toBe("manual");
    expect(result.message).toBe("Final validation is not available for this scenario type yet.");
  });
});
