import { checkpointAudits } from "@/lib/scenarios/interview-machine";
import type {
  InterviewEvent,
  InterviewPhase,
  InterviewState,
  StepStatus,
} from "@/lib/scenarios/interview-machine";
import type { ConversationEntry } from "@/lib/scenarios/conversation";
import type { RubricCriterion, StepKind } from "@/lib/scenarios/schema";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { SnapshotFile, VerificationResult } from "@/lib/scenarios/verification";

/**
 * `InterviewResult` — the structured, serializable output the interview RUNTIME
 * produces at completion. It is the sole contract between the runtime and the
 * evaluation subsystem: the `EvaluationEngine` consumes an `InterviewResult` and
 * knows nothing about React, the session, or the machine internals.
 *
 * It is deliberately rich (per-step outcomes, authored rubrics, the full event
 * log, checkpoint audits, verification results, timings, final workspace) so that
 * NEW scorers — AI, interviewer, communication, rubric, timing — can be added to
 * the evaluation pipeline WITHOUT any change to the interview runtime.
 */

export interface InterviewResultStep {
  id: string;
  kind: StepKind;
  weight: number;
  verification: string;
  /** True when the step has an automated component (`automated-tests` | `hybrid`). */
  autoScorable: boolean;
  status: StepStatus;
  revealedHints: number;
  hintCount: number;
  /** Candidate's typed response/notes (explain steps). */
  response: string;
  /** Authored per-step rubric (empty when none) — input for rubric/AI scorers. */
  rubric: RubricCriterion[];
  checkpoint: {
    available: boolean;
    offered: boolean;
    accepted: boolean;
    priorStatus: StepStatus | null;
  };
  /** Latest verification result for the step, if one was run. */
  verificationResult: VerificationResult | null;
}

export interface InterviewTimings {
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
}

export interface InterviewResult {
  scenarioSlug: string;
  scenarioId: string;
  title: string;
  /** Authored holistic rubric — input for rubric/AI scorers. */
  scenarioRubric: RubricCriterion[];
  phase: InterviewPhase;
  steps: InterviewResultStep[];
  /** The append-only event history (offers, hints, results, checkpoints, …). */
  log: InterviewEvent[];
  /**
   * Rich record of the interaction around the interview — utterances, narrated
   * context, tool calls/results, and runtime signals, timestamped. Empty when no
   * client recorded one (e.g. a voiceless, button-only run). Input for replay and
   * AI/communication scorers, additive to the machine `log`.
   */
  conversation: ConversationEntry[];
  /** Final workspace snapshot. */
  workspace: SnapshotFile[];
  timings: InterviewTimings;
  generatedAt: number;
}

export interface BuildInterviewResultInput {
  loaded: LoadedScenario;
  state: InterviewState;
  files: SnapshotFile[];
  verificationByStep?: Record<string, VerificationResult>;
  conversation?: ConversationEntry[];
  timings?: { startedAt: number | null; completedAt: number | null };
}

/** Assemble an `InterviewResult` from the runtime's authored + session + machine state. */
export function buildInterviewResult(input: BuildInterviewResultInput): InterviewResult {
  const { loaded, state, files } = input;
  const audits = new Map(checkpointAudits(state).map((a) => [a.stepId, a]));
  const verByStep = input.verificationByStep ?? {};

  const steps: InterviewResultStep[] = loaded.scenario.steps.map((def, i) => {
    const progress = state.steps[i];
    const audit = audits.get(def.id);
    return {
      id: def.id,
      kind: def.kind,
      weight: def.weight,
      verification: def.verification,
      autoScorable: def.verification === "automated-tests" || def.verification === "hybrid",
      status: progress?.status ?? "not_started",
      revealedHints: progress?.revealedHints ?? 0,
      hintCount: progress?.hintCount ?? def.hints?.length ?? 0,
      response: progress?.response ?? "",
      rubric: def.rubric ?? [],
      checkpoint: {
        available: (def.checkpoint?.files.length ?? 0) > 0,
        offered: audit?.offered ?? false,
        accepted: audit?.accepted ?? false,
        priorStatus: audit?.priorStatus ?? null,
      },
      verificationResult: verByStep[def.id] ?? null,
    };
  });

  const startedAt = input.timings?.startedAt ?? null;
  const completedAt = input.timings?.completedAt ?? null;
  const durationMs = startedAt !== null && completedAt !== null ? completedAt - startedAt : null;

  return {
    scenarioSlug: loaded.slug,
    scenarioId: loaded.scenario.id,
    title: loaded.scenario.title,
    scenarioRubric: loaded.scenario.rubric,
    phase: state.phase,
    steps,
    log: state.log,
    conversation: input.conversation ?? [],
    workspace: files,
    timings: { startedAt, completedAt, durationMs },
    generatedAt: Date.now(),
  };
}
