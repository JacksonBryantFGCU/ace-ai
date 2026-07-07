import { describe, expect, it } from "vitest";
import {
  canRevealHint,
  checkpointAudits,
  currentStep,
  initInterview,
  interviewReducer,
  isComplete,
  isLastStep,
  isPaused,
  passedCount,
  replayInterview,
  type InterviewEvent,
  type InterviewState,
  type StepDescriptor,
} from "@/lib/scenarios/interview-machine";

const STEPS: StepDescriptor[] = [
  { id: "build", hintCount: 3 },
  { id: "debug", hintCount: 2 },
  { id: "explain", hintCount: 1 },
];

const start = () => initInterview(STEPS);
/** Fold a sequence of events over a fresh interview. */
const run = (events: InterviewEvent[], init: InterviewState = start()) =>
  events.reduce(interviewReducer, init);

describe("initInterview", () => {
  it("starts on step 0, in_progress, with the rest not_started and an empty log", () => {
    const s = start();
    expect(s.stepIndex).toBe(0);
    expect(s.phase).toBe("in_progress");
    expect(s.steps.map((x) => x.status)).toEqual(["in_progress", "not_started", "not_started"]);
    expect(s.log).toEqual([]);
  });

  it("is immediately completed when there are no steps", () => {
    expect(isComplete(initInterview([]))).toBe(true);
  });
});

describe("append-only log & replay", () => {
  it("appends every event, including no-ops", () => {
    const events: InterviewEvent[] = [
      { type: "reveal-hint" },
      { type: "go-to", index: 99 }, // out-of-range no-op, still logged
      { type: "next" },
    ];
    const s = run(events);
    expect(s.log).toEqual(events);
  });

  it("reconstructs identical state from its own log", () => {
    const s = run([
      { type: "reveal-hint" },
      { type: "record-result", passed: true },
      { type: "next" },
      { type: "set-response", text: "notes" },
    ]);
    const replayed = replayInterview(STEPS, s.log);
    expect(replayed).toEqual(s);
  });
});

describe("hints", () => {
  it("reveals hints up to the step's count and no further", () => {
    let s = run([{ type: "reveal-hint" }, { type: "reveal-hint" }]);
    expect(currentStep(s)?.revealedHints).toBe(2);
    expect(canRevealHint(s)).toBe(true);
    s = run([{ type: "reveal-hint" }, { type: "reveal-hint" }], s);
    expect(currentStep(s)?.revealedHints).toBe(3);
    expect(canRevealHint(s)).toBe(false);
  });
});

describe("navigation", () => {
  it("advances through steps and completes past the last", () => {
    let s = run([{ type: "next" }]);
    expect(s.stepIndex).toBe(1);
    expect(currentStep(s)?.status).toBe("in_progress");
    s = run([{ type: "next" }, { type: "next" }], s);
    expect(isComplete(s)).toBe(true);
  });

  it("go-to and prev move focus and are bounded", () => {
    let s = run([{ type: "go-to", index: 2 }]);
    expect(isLastStep(s)).toBe(true);
    s = run([{ type: "prev" }], s);
    expect(s.stepIndex).toBe(1);
    s = run([{ type: "go-to", index: 99 }], s);
    expect(s.stepIndex).toBe(1);
  });
});

describe("results, checkpoints & overrides", () => {
  it("records pass/fail on the current step", () => {
    const s = run([{ type: "record-result", passed: true }]);
    expect(currentStep(s)?.status).toBe("passed");
    expect(passedCount(s)).toBe(1);
  });

  it("apply-checkpoint yields the checkpoint_applied status", () => {
    const s = run([
      { type: "record-result", passed: false },
      { type: "apply-checkpoint", stepId: "build", priorStatus: "failed" },
    ]);
    expect(currentStep(s)?.status).toBe("checkpoint_applied");
  });

  it("records a full checkpoint audit trail (offered, accepted, prior status)", () => {
    const s = run([
      { type: "record-result", passed: false },
      { type: "offer-checkpoint", stepId: "build" },
      { type: "apply-checkpoint", stepId: "build", priorStatus: "failed" },
      { type: "next" },
      { type: "offer-checkpoint", stepId: "debug" },
      { type: "decline-checkpoint", stepId: "debug" },
    ]);
    const audits = checkpointAudits(s);
    expect(audits).toContainEqual({ stepId: "build", offered: true, accepted: true, priorStatus: "failed" });
    expect(audits).toContainEqual({ stepId: "debug", offered: true, accepted: false, priorStatus: null });
  });

  it("override-result sets status like a recorded result", () => {
    const s = run([{ type: "override-result", passed: true }]);
    expect(currentStep(s)?.status).toBe("passed");
  });

  it("restart-step resets status, hints, and response", () => {
    const s = run([
      { type: "reveal-hint" },
      { type: "set-response", text: "x" },
      { type: "record-result", passed: false },
      { type: "restart-step" },
    ]);
    expect(currentStep(s)?.status).toBe("in_progress");
    expect(currentStep(s)?.revealedHints).toBe(0);
    expect(currentStep(s)?.response).toBe("");
  });
});

describe("pause / resume", () => {
  it("toggles between in_progress and paused", () => {
    let s = run([{ type: "pause" }]);
    expect(isPaused(s)).toBe(true);
    s = run([{ type: "resume" }], s);
    expect(s.phase).toBe("in_progress");
  });
});
