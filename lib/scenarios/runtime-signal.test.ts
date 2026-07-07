import { describe, expect, it } from "vitest";
import { initInterview, interviewReducer } from "@/lib/scenarios/interview-machine";
import type { InterviewEvent, InterviewState, StepDescriptor } from "@/lib/scenarios/interview-machine";
import {
  deriveSignals,
  initialSignals,
  type RuntimeSignal,
  type SignalScenario,
} from "@/lib/scenarios/runtime-signal";
import type { VerificationResult } from "@/lib/scenarios/verification";

const SCENARIO: SignalScenario = {
  id: "demo",
  title: "Demo",
  summary: "A demo scenario",
  steps: [
    { id: "a", kind: "implement", prompt: "Build it", hints: ["first hint", "second hint"], checkpointAvailable: true },
    { id: "b", kind: "explain", prompt: "Explain it", hints: [], checkpointAvailable: false },
  ],
};

const DESCRIPTORS: StepDescriptor[] = [
  { id: "a", hintCount: 2 },
  { id: "b", hintCount: 0 },
];

const start = () => initInterview(DESCRIPTORS);

/** Apply one event and derive the signals for that single transition. */
function transition(state: InterviewState, event: InterviewEvent, ver: Record<string, VerificationResult> = {}) {
  const next = interviewReducer(state, event);
  return { next, signals: deriveSignals(state, next, SCENARIO, ver) };
}

function verResult(over: Partial<VerificationResult> = {}): VerificationResult {
  return {
    engine: "component",
    status: "failed",
    passed: false,
    testResults: [
      { name: "renders", status: "passed" },
      { name: "handles empty query", status: "failed" },
    ],
    durationMs: 5,
    errors: [],
    finishedAt: 0,
    ...over,
  };
}

describe("initialSignals", () => {
  it("emits INTERVIEW_STARTED then STEP_STARTED for step 0", () => {
    const signals = initialSignals(SCENARIO, start());
    expect(signals.map((s) => s.type)).toEqual(["INTERVIEW_STARTED", "STEP_STARTED"]);
    const [started, step] = signals;
    expect(started).toMatchObject({ type: "INTERVIEW_STARTED", scenarioId: "demo", stepCount: 2 });
    expect(step).toMatchObject({ type: "STEP_STARTED", stepIndex: 0, total: 2, isFirst: true, isLast: false, restarted: false });
  });
});

describe("deriveSignals — hints", () => {
  it("reveals the correct hint text and remaining count", () => {
    const { signals } = transition(start(), { type: "reveal-hint" });
    expect(signals).toEqual<RuntimeSignal[]>([
      { type: "HINT_REVEALED", stepId: "a", index: 0, text: "first hint", remaining: 1 },
    ]);
  });

  it("advances to the second hint on the next reveal", () => {
    const afterOne = interviewReducer(start(), { type: "reveal-hint" });
    const { signals } = transition(afterOne, { type: "reveal-hint" });
    expect(signals[0]).toMatchObject({ index: 1, text: "second hint", remaining: 0 });
  });

  it("emits nothing when no hints remain", () => {
    let s = start();
    s = interviewReducer(s, { type: "reveal-hint" });
    s = interviewReducer(s, { type: "reveal-hint" });
    const { signals } = transition(s, { type: "reveal-hint" });
    expect(signals).toEqual([]);
  });
});

describe("deriveSignals — verification", () => {
  it("maps record-result to VERIFICATION_COMPLETE with counts + first failure", () => {
    const { signals } = transition(start(), { type: "record-result", passed: false }, { a: verResult() });
    expect(signals).toEqual<RuntimeSignal[]>([
      { type: "VERIFICATION_COMPLETE", stepId: "a", passed: false, passedCount: 1, total: 2, firstFailure: "handles empty query" },
    ]);
  });

  it("reports a pass with no failing test", () => {
    const passing = verResult({ status: "passed", passed: true, testResults: [{ name: "renders", status: "passed" }] });
    const { signals } = transition(start(), { type: "record-result", passed: true }, { a: passing });
    expect(signals[0]).toMatchObject({ passed: true, passedCount: 1, total: 1, firstFailure: null });
  });

  it("still emits a signal without a verification result on record", () => {
    const { signals } = transition(start(), { type: "override-result", passed: true });
    expect(signals[0]).toMatchObject({ type: "VERIFICATION_COMPLETE", passed: true, total: 0, firstFailure: null });
  });
});

describe("deriveSignals — navigation & lifecycle", () => {
  it("emits STEP_STARTED when advancing", () => {
    const { signals } = transition(start(), { type: "next" });
    expect(signals[0]).toMatchObject({ type: "STEP_STARTED", stepIndex: 1, isLast: true });
  });

  it("emits INTERVIEW_COMPLETE when next runs off the last step", () => {
    const onLast = interviewReducer(start(), { type: "next" });
    const { signals } = transition(onLast, { type: "next" });
    expect(signals).toEqual<RuntimeSignal[]>([{ type: "INTERVIEW_COMPLETE", passedCount: 0, total: 2 }]);
  });

  it("emits INTERVIEW_COMPLETE on explicit complete", () => {
    const { signals } = transition(start(), { type: "complete" });
    expect(signals[0]).toMatchObject({ type: "INTERVIEW_COMPLETE" });
  });

  it("emits STEP_STARTED with restarted:true on restart-step", () => {
    const { signals } = transition(start(), { type: "restart-step" });
    expect(signals[0]).toMatchObject({ type: "STEP_STARTED", stepIndex: 0, restarted: true });
  });

  it("maps pause/resume", () => {
    const paused = transition(start(), { type: "pause" });
    expect(paused.signals).toEqual([{ type: "INTERVIEW_PAUSED" }]);
    expect(transition(paused.next, { type: "resume" }).signals).toEqual([{ type: "INTERVIEW_RESUMED" }]);
  });
});

describe("deriveSignals — checkpoints & responses", () => {
  it("maps offer + apply checkpoint (with prior status)", () => {
    expect(transition(start(), { type: "offer-checkpoint", stepId: "a" }).signals).toEqual([
      { type: "CHECKPOINT_OFFERED", stepId: "a" },
    ]);
    expect(transition(start(), { type: "apply-checkpoint", stepId: "a", priorStatus: "failed" }).signals).toEqual([
      { type: "CHECKPOINT_APPLIED", stepId: "a", priorStatus: "failed" },
    ]);
  });

  it("maps set-response to RESPONSE_RECORDED with length", () => {
    const { signals } = transition(start(), { type: "set-response", text: "hello" });
    expect(signals).toEqual([{ type: "RESPONSE_RECORDED", stepId: "a", length: 5 }]);
  });
});

describe("deriveSignals — batches", () => {
  it("produces signals for several events in order", () => {
    const s0 = start();
    const s1 = [
      { type: "reveal-hint" } as const,
      { type: "record-result", passed: true } as const,
      { type: "next" } as const,
    ].reduce(interviewReducer, s0);
    const signals = deriveSignals(s0, s1, SCENARIO);
    expect(signals.map((s) => s.type)).toEqual(["HINT_REVEALED", "VERIFICATION_COMPLETE", "STEP_STARTED"]);
  });

  it("is empty when nothing new was appended", () => {
    const s = start();
    expect(deriveSignals(s, s, SCENARIO)).toEqual([]);
  });
});
