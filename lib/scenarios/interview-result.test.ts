import { describe, expect, it } from "vitest";
import { loadScenario } from "@/server/scenarios/load";
import { initInterview, interviewReducer, type InterviewState } from "@/lib/scenarios/interview-machine";
import { buildInterviewResult } from "@/lib/scenarios/interview-result";

const CANONICAL = "user-directory-search";

/** Drive the canonical scenario's machine through a representative attempt. */
async function scenarioAndState() {
  const loaded = await loadScenario(CANONICAL);
  const descriptors = loaded.scenario.steps.map((s) => ({ id: s.id, hintCount: s.hints?.length ?? 0 }));
  let state: InterviewState = initInterview(descriptors);
  state = interviewReducer(state, { type: "record-result", passed: true }); // step 1 passed
  state = interviewReducer(state, { type: "reveal-hint" });
  state = interviewReducer(state, { type: "next" });
  state = interviewReducer(state, { type: "offer-checkpoint", stepId: "fix-stale-results" });
  state = interviewReducer(state, { type: "apply-checkpoint", stepId: "fix-stale-results", priorStatus: "in_progress" });
  return { loaded, state };
}

describe("buildInterviewResult", () => {
  it("projects the runtime state into a structured result", async () => {
    const { loaded, state } = await scenarioAndState();
    const result = buildInterviewResult({
      loaded,
      state,
      files: loaded.files.map((f) => ({ path: f.path, content: f.content, role: f.role })),
      timings: { startedAt: 1000, completedAt: 61000 },
    });

    expect(result.scenarioSlug).toBe(CANONICAL);
    expect(result.steps).toHaveLength(4);
    expect(result.timings.durationMs).toBe(60000);

    const build = result.steps.find((s) => s.id === "build-search")!;
    expect(build.status).toBe("passed");
    expect(build.autoScorable).toBe(true);
    expect(build.revealedHints).toBe(1);

    const fix = result.steps.find((s) => s.id === "fix-stale-results")!;
    expect(fix.status).toBe("checkpoint_applied");
    expect(fix.checkpoint).toEqual({
      available: true,
      offered: true,
      accepted: true,
      priorStatus: "in_progress",
    });

    // The explain step is rubric-only (not auto-scorable).
    const explain = result.steps.find((s) => s.kind === "explain")!;
    expect(explain.autoScorable).toBe(false);

    // The final workspace + full log come through.
    expect(result.workspace.map((f) => f.path)).toContain("UserSearch.tsx");
    expect(result.log.length).toBeGreaterThan(0);
  });
});
