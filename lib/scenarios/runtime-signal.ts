/**
 * RuntimeSignal — the CLIENT-NEUTRAL outbound event stream (runtime → clients).
 *
 * This is one half of the interview's outward contract (the inbound half is each
 * client's own concern — e.g. `VoiceIntent` for the voice client). A signal states
 * a FACT in the past tense: "step two started", "the tests passed". It is a PURE
 * DERIVATION of the interview machine's append-only log (`deriveSignals`), enriched
 * with the frozen scenario so a client can narrate without re-reading the schema.
 *
 * Design commitments (mirror the runtime's):
 *   - No React, no voice, no Vapi. Voice depends on this; this depends on nothing
 *     client-shaped (see docs/README.md).
 *   - Reproducible: replaying the same log yields the same signals, so replay,
 *     analytics, and multiplayer fall out for free.
 *
 * NOTE: `INTERVIEW_STARTED` and `VERIFICATION_STARTED` are NOT log-derived (the log
 * has no "mounted" or "verification began" event). The controller emits those two
 * imperatively; everything else is produced here from the log delta.
 */

import { interviewReducer } from "@/lib/scenarios/interview-machine";
import type {
  InterviewEvent,
  InterviewState,
  StepStatus,
} from "@/lib/scenarios/interview-machine";
import type { StepKind } from "@/lib/scenarios/schema";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { VerificationResult } from "@/lib/scenarios/verification";

export type RuntimeSignal =
  | {
      type: "INTERVIEW_STARTED";
      scenarioId: string;
      title: string;
      summary: string;
      stepCount: number;
    }
  | {
      type: "STEP_STARTED";
      stepIndex: number;
      total: number;
      stepId: string;
      kind: StepKind;
      prompt: string;
      isFirst: boolean;
      isLast: boolean;
      hintsAvailable: number;
      checkpointAvailable: boolean;
      /** True when re-entered via restart-step rather than first arrival. */
      restarted: boolean;
    }
  | { type: "HINT_REVEALED"; stepId: string; index: number; text: string; remaining: number }
  | { type: "RESPONSE_RECORDED"; stepId: string; length: number }
  | { type: "VERIFICATION_STARTED"; stepId: string }
  | {
      type: "VERIFICATION_COMPLETE";
      stepId: string;
      passed: boolean;
      passedCount: number;
      total: number;
      /** Name of the first failing test, if the result carried per-test detail. */
      firstFailure: string | null;
    }
  | { type: "CHECKPOINT_OFFERED"; stepId: string }
  | { type: "CHECKPOINT_APPLIED"; stepId: string; priorStatus: StepStatus }
  | { type: "INTERVIEW_PAUSED" }
  | { type: "INTERVIEW_RESUMED" }
  | { type: "INTERVIEW_COMPLETE"; passedCount: number; total: number };

/**
 * Minimal projection of a scenario the signal enrichment needs — decoupled from
 * the full frozen schema, exactly like the machine's `StepDescriptor`.
 */
export interface SignalStep {
  id: string;
  kind: StepKind;
  prompt: string;
  hints: string[];
  checkpointAvailable: boolean;
}

export interface SignalScenario {
  id: string;
  title: string;
  summary: string;
  steps: SignalStep[];
}

/** Build the signal-enrichment projection from a loaded scenario. */
export function toSignalScenario(loaded: LoadedScenario): SignalScenario {
  return {
    id: loaded.scenario.id,
    title: loaded.scenario.title,
    summary: loaded.scenario.summary,
    steps: loaded.scenario.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      prompt: step.prompt,
      hints: step.hints ?? [],
      checkpointAvailable: (step.checkpoint?.files.length ?? 0) > 0,
    })),
  };
}

/** The initial signals a client should narrate on attach (not log-derived). */
export function initialSignals(scenario: SignalScenario, state: InterviewState): RuntimeSignal[] {
  const started: RuntimeSignal = {
    type: "INTERVIEW_STARTED",
    scenarioId: scenario.id,
    title: scenario.title,
    summary: scenario.summary,
    stepCount: scenario.steps.length,
  };
  const step = stepStartedSignal(scenario, state.stepIndex, false);
  return step ? [started, step] : [started];
}

function passedCount(state: InterviewState): number {
  return state.steps.filter((s) => s.status === "passed").length;
}

function firstFailingTest(result: VerificationResult | undefined): string | null {
  if (!result) return null;
  return result.testResults.find((t) => t.status === "failed")?.name ?? null;
}

function stepStartedSignal(
  scenario: SignalScenario,
  index: number,
  restarted: boolean,
): RuntimeSignal | null {
  const def = scenario.steps[index];
  if (!def) return null;
  return {
    type: "STEP_STARTED",
    stepIndex: index,
    total: scenario.steps.length,
    stepId: def.id,
    kind: def.kind,
    prompt: def.prompt,
    isFirst: index === 0,
    isLast: index === scenario.steps.length - 1,
    hintsAvailable: def.hints.length,
    checkpointAvailable: def.checkpointAvailable,
    restarted,
  };
}

/**
 * Map ONE machine event (with the state it produced) to zero or more signals.
 * `before`/`after` bracket the single transition so index/phase changes are exact.
 */
function signalsForEvent(
  event: InterviewEvent,
  before: InterviewState,
  after: InterviewState,
  scenario: SignalScenario,
  verificationByStep: Record<string, VerificationResult>,
): RuntimeSignal[] {
  const stepId = scenario.steps[after.stepIndex]?.id ?? "";

  switch (event.type) {
    case "reveal-hint": {
      const step = after.steps[after.stepIndex];
      if (!step || step.revealedHints <= before.steps[before.stepIndex]!.revealedHints) return [];
      const index = step.revealedHints - 1;
      const text = scenario.steps[after.stepIndex]?.hints[index] ?? "";
      return [{ type: "HINT_REVEALED", stepId, index, text, remaining: step.hintCount - step.revealedHints }];
    }

    case "set-response":
      return [{ type: "RESPONSE_RECORDED", stepId, length: event.text.length }];

    case "record-result":
    case "override-result": {
      const result = verificationByStep[stepId];
      return [
        {
          type: "VERIFICATION_COMPLETE",
          stepId,
          passed: event.passed,
          passedCount: result?.testResults.filter((t) => t.status === "passed").length ?? 0,
          total: result?.testResults.length ?? 0,
          firstFailure: firstFailingTest(result),
        },
      ];
    }

    case "offer-checkpoint":
      return [{ type: "CHECKPOINT_OFFERED", stepId: event.stepId }];

    case "apply-checkpoint":
      return [{ type: "CHECKPOINT_APPLIED", stepId: event.stepId, priorStatus: event.priorStatus }];

    case "restart-step": {
      const signal = stepStartedSignal(scenario, after.stepIndex, true);
      return signal ? [signal] : [];
    }

    case "next":
    case "prev":
    case "go-to": {
      // A completing `next` (last step) doesn't move the index — detect via phase.
      if (after.phase === "completed" && before.phase !== "completed") {
        return [{ type: "INTERVIEW_COMPLETE", passedCount: passedCount(after), total: after.steps.length }];
      }
      if (after.stepIndex === before.stepIndex) return [];
      const signal = stepStartedSignal(scenario, after.stepIndex, false);
      return signal ? [signal] : [];
    }

    case "complete":
      if (before.phase === "completed") return [];
      return [{ type: "INTERVIEW_COMPLETE", passedCount: passedCount(after), total: after.steps.length }];

    case "pause":
      return after.phase === "paused" && before.phase !== "paused" ? [{ type: "INTERVIEW_PAUSED" }] : [];

    case "resume":
      return after.phase === "in_progress" && before.phase === "paused" ? [{ type: "INTERVIEW_RESUMED" }] : [];

    default:
      return [];
  }
}

/**
 * Derive the signals produced by the transition from `prev` to `next`. Because the
 * machine log is append-only, the newly-applied events are the tail of `next.log`;
 * we replay them one at a time so per-event enrichment (hint text, step metadata,
 * completion) is exact even when several events were dispatched together.
 */
export function deriveSignals(
  prev: InterviewState,
  next: InterviewState,
  scenario: SignalScenario,
  verificationByStep: Record<string, VerificationResult> = {},
): RuntimeSignal[] {
  const newEvents = next.log.slice(prev.log.length);
  const signals: RuntimeSignal[] = [];
  let cursor = prev;
  for (const event of newEvents) {
    const after = interviewReducer(cursor, event);
    signals.push(...signalsForEvent(event, cursor, after, scenario, verificationByStep));
    cursor = after;
  }
  return signals;
}
