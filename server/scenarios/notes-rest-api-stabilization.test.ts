import { describe, expect, it } from "vitest";
import { listStudioScenarios } from "@/actions/authoring";
import { checkpointSource } from "@/server/scenarios/checkpoint-source";
import { loadScenario, listScenarioOptions } from "@/server/scenarios/load";
import { verifyStepOnServer } from "@/server/scenarios/verification-service";
import { defaultEvaluationEngine } from "@/lib/scenarios/evaluation/engine";
import { applyCheckpoint } from "@/lib/scenarios/session";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { SnapshotFile, VerificationResult } from "@/lib/scenarios/verification";

const SLUG = "notes-rest-api";

function snapshot(files: LoadedScenario["files"]): SnapshotFile[] {
  return files.map((file) => ({ path: file.path, content: file.content, role: file.role }));
}

describe("notes-rest-api backend stabilization", () => {
  it("is discoverable in the Playground and loadable for the Technical Interview runtime", async () => {
    const playground = await listStudioScenarios();
    expect(playground.find((scenario) => scenario.slug === SLUG)).toMatchObject({
      title: "Notes REST API",
      errorCount: 0,
    });

    const options = await listScenarioOptions();
    expect(options.find((scenario) => scenario.slug === SLUG)).toMatchObject({
      title: "Notes REST API",
      difficulty: "easy",
      status: "verified",
    });

    const candidate = await loadScenario(SLUG, { includeAuthorOnly: false });
    expect(candidate.slug).toBe(SLUG);
    expect(candidate.entry).toBe("app.ts");
    expect(candidate.files.map((file) => file.path).sort()).toEqual([
      "app.ts",
      "backend-types.d.ts",
      "db.ts",
    ]);
    expect(JSON.stringify(candidate.files)).not.toContain("solution/step-");
    expect(JSON.stringify(candidate.files)).not.toContain("step-1.test");
    expect(candidate.scenario.rubric).toEqual([]);
    expect(candidate.scenario.steps.every((step) => step.rubric === undefined)).toBe(true);
  });

  it("applies and verifies every backend checkpoint through the production verification path", async () => {
    const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
    const expectedTestCounts = new Map([
      ["return-notes", 3],
      ["create-notes", 3],
      ["delete-notes", 4],
    ]);
    const results: Record<string, VerificationResult> = {};

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
      expect(result.passed).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.testResults).toHaveLength(expectedTestCounts.get(step.id)!);
      expect(result.testResults.every((test) => test.status === "passed")).toBe(true);
      results[step.id] = result;
    }

    const report = await defaultEvaluationEngine.evaluate({
      scenarioSlug: SLUG,
      scenarioId: loaded.scenario.id,
      title: loaded.scenario.title,
      scenarioRubric: loaded.scenario.rubric,
      phase: "completed",
      steps: loaded.scenario.steps.map((step) => ({
        id: step.id,
        kind: step.kind,
        weight: step.weight,
        verification: step.verification,
        autoScorable: true,
        status: "passed",
        revealedHints: 0,
        hintCount: step.hints?.length ?? 0,
        response: "",
        rubric: step.rubric ?? [],
        checkpoint: { available: true, offered: false, accepted: false, priorStatus: null },
        verificationResult: results[step.id] ?? null,
      })),
      log: [],
      conversation: [],
      workspace: snapshot(loaded.files),
      timings: { startedAt: 1, completedAt: 2, durationMs: 1 },
      generatedAt: Date.now(),
    });

    expect(report.overallScore).toBe(100);
    expect(report.stepBreakdown.map((step) => step.status)).toEqual(["passed", "passed", "passed"]);
  });
});
