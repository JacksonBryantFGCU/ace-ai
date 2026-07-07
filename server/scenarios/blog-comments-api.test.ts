import { describe, expect, it } from "vitest";
import { checkpointSource } from "@/server/scenarios/checkpoint-source";
import { loadScenario, listScenarioOptions } from "@/server/scenarios/load";
import { verifyStepOnServer } from "@/server/scenarios/verification-service";
import { applyCheckpoint } from "@/lib/scenarios/session";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { SnapshotFile } from "@/lib/scenarios/verification";

const SLUG = "blog-comments-api";

function snapshot(files: LoadedScenario["files"]): SnapshotFile[] {
  return files.map((file) => ({ path: file.path, content: file.content, role: file.role }));
}

describe("blog-comments-api backend scenario", () => {
  it("is public as a medium backend scenario", async () => {
    const options = await listScenarioOptions();

    expect(options.find((scenario) => scenario.slug === SLUG)).toMatchObject({
      title: "Blog Comments API",
      difficulty: "medium",
      category: "backend-node",
      runtime: "node",
      framework: "express",
      status: "verified",
    });
  });

  it("applies and verifies every checkpoint through the production verification path", async () => {
    const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
    const expectedTestCounts = new Map([
      ["list-visible-comments", 4],
      ["create-comments", 4],
      ["moderate-comments", 5],
    ]);

    for (const step of loaded.scenario.steps) {
      const checkpointFiles = await checkpointSource.resolve(SLUG, step.id);
      expect(checkpointFiles).toHaveLength(1);
      expect(checkpointFiles[0]).toMatchObject({ path: "app.ts" });
      expect(checkpointFiles[0]!.content).toContain('import { db } from "./db";');
      expect(checkpointFiles[0]!.content).not.toContain("../../workspace/db");

      const session = applyCheckpoint(loaded.files, loaded.entry, checkpointFiles);
      const result = await verifyStepOnServer({
        scenarioSlug: SLUG,
        step: {
          id: step.id,
          harness: step.verify.harness,
          functionName: step.verify.functionName,
          tests: step.verify.tests,
          timeoutMs: step.verify.timeoutMs,
        },
        files: snapshot(session.files),
      });

      expect(result.engine).toBe("node");
      expect(result.status).toBe("passed");
      expect(result.errors).toEqual([]);
      expect(result.testResults).toHaveLength(expectedTestCounts.get(step.id)!);
      expect(result.testResults.every((test) => test.status === "passed")).toBe(true);
    }
  });
});
