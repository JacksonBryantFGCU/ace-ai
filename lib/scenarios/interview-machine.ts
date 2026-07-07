/**
 * Pure interview progression state machine — the engine that drives a scenario
 * attempt, deliberately independent of React and of any specific scenario shape.
 *
 * Design commitments (per roadmap):
 *
 * 1. APPEND-ONLY EVENT LOG. Every dispatched event is appended to `state.log`.
 *    Because the reducer is pure, `replayInterview(steps, log)` reconstructs the
 *    exact state — the basis for future replay, debugging, and resume. The log is
 *    the source of truth; `state` is a fold of it.
 *
 * 2. EXPLICIT STATE ENUMS over boolean flags. Step status is a single enum
 *    (`not_started | in_progress | passed | failed | checkpoint_applied`) and the
 *    interview has an explicit `phase` (`in_progress | paused | completed`). No
 *    flag combinations — one state per concern, so analytics/controls stay simple.
 *
 * 3. STABLE EXTENSION POINTS. Interviewer-control events (`pause`, `resume`,
 *    `restart-step`, `override-result`) and navigation (`go-to` == jump-to-step)
 *    have stable event types + reducer structure now, ready to grow (branching =
 *    a different `next` resolver; timers = a `tick`/`time-up` event).
 *
 * It is fed a minimal `StepDescriptor[]` projection so it never couples to the
 * full frozen schema. It owns progression only — not the workspace files (session
 * model) and not verification execution (Phase 4 dispatches a result into it).
 */

export type StepStatus =
  | "not_started"
  | "in_progress"
  | "passed"
  | "failed"
  | "checkpoint_applied";

export type InterviewPhase = "in_progress" | "paused" | "completed";

/** Minimal projection of a scenario step the machine needs (decouples from the schema). */
export interface StepDescriptor {
  id: string;
  hintCount: number;
}

/** Per-step runtime progress. `status` is the single source of truth (no flags). */
export interface StepProgress {
  id: string;
  status: StepStatus;
  revealedHints: number;
  hintCount: number;
  /** Candidate's typed response/notes (used by `explain` steps; empty otherwise). */
  response: string;
}

export interface InterviewState {
  steps: StepProgress[];
  stepIndex: number;
  phase: InterviewPhase;
  /** Append-only history of every event applied — enables deterministic replay. */
  log: InterviewEvent[];
}

/**
 * Every way the interview state can change. Candidate/system events plus stable
 * interviewer-control events. `go-to` doubles as jump-to-step.
 */
export type InterviewEvent =
  // candidate / system
  | { type: "reveal-hint" }
  | { type: "record-result"; passed: boolean }
  | { type: "set-response"; text: string }
  | { type: "next" }
  | { type: "prev" }
  | { type: "go-to"; index: number }
  | { type: "complete" }
  // checkpoints — audit-rich so evaluation can see the full offer→outcome trail
  | { type: "offer-checkpoint"; stepId: string }
  | { type: "decline-checkpoint"; stepId: string }
  | { type: "apply-checkpoint"; stepId: string; priorStatus: StepStatus }
  // interviewer controls (stable types; minimal behavior today)
  | { type: "pause" }
  | { type: "resume" }
  | { type: "restart-step" }
  | { type: "override-result"; passed: boolean };

/** Build the initial state from the scenario's step descriptors. */
export function initInterview(steps: StepDescriptor[]): InterviewState {
  return {
    steps: steps.map((step, i) => ({
      id: step.id,
      status: i === 0 ? "in_progress" : "not_started",
      revealedHints: 0,
      hintCount: step.hintCount,
      response: "",
    })),
    stepIndex: 0,
    phase: steps.length === 0 ? "completed" : "in_progress",
    log: [],
  };
}

/** Immutably patch the step at `index`. */
function patchStep(
  state: InterviewState,
  index: number,
  patch: Partial<StepProgress>,
): InterviewState {
  return {
    ...state,
    steps: state.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
  };
}

/** Move focus to `index`, marking a fresh step in_progress. Out-of-range is a no-op. */
function enterStep(state: InterviewState, index: number): InterviewState {
  if (index < 0 || index >= state.steps.length) return state;
  const target = state.steps[index]!;
  const moved: InterviewState = { ...state, stepIndex: index, phase: "in_progress" };
  return target.status === "not_started" ? patchStep(moved, index, { status: "in_progress" }) : moved;
}

/** The core transition (no logging) — pure state change for one event. */
function applyEvent(state: InterviewState, event: InterviewEvent): InterviewState {
  const i = state.stepIndex;
  const step = state.steps[i];

  switch (event.type) {
    case "reveal-hint":
      if (!step || step.revealedHints >= step.hintCount) return state;
      return patchStep(state, i, { revealedHints: step.revealedHints + 1 });

    case "record-result":
    case "override-result":
      // Same effect; provenance (candidate result vs interviewer override) is
      // preserved in the event log.
      if (!step) return state;
      return patchStep(state, i, { status: event.passed ? "passed" : "failed" });

    case "set-response":
      if (!step) return state;
      return patchStep(state, i, { response: event.text });

    case "offer-checkpoint":
    case "decline-checkpoint":
      // Audit-only: no state change, but the wrapper appends it to the log so the
      // offer/decline trail is preserved for evaluation.
      return state;

    case "apply-checkpoint":
      // Recovers CODE, not score (frozen §5): the distinct `checkpoint_applied`
      // status lets evaluation credit it differently from a self-earned pass. The
      // event carries `priorStatus` so the pre-checkpoint verification state is
      // permanently recorded in the log.
      if (!step) return state;
      return patchStep(state, i, { status: "checkpoint_applied" });

    case "restart-step":
      if (!step) return state;
      return patchStep(state, i, { status: "in_progress", revealedHints: 0, response: "" });

    case "go-to":
      return enterStep(state, event.index);

    case "prev":
      return enterStep(state, i - 1);

    case "next":
      if (i >= state.steps.length - 1) return { ...state, phase: "completed" };
      return enterStep(state, i + 1);

    case "complete":
      return { ...state, phase: "completed" };

    case "pause":
      return state.phase === "in_progress" ? { ...state, phase: "paused" } : state;

    case "resume":
      return state.phase === "paused" ? { ...state, phase: "in_progress" } : state;

    default:
      return state;
  }
}

/**
 * The single pure reducer. Applies the transition, then appends the event to the
 * append-only log so `state` always carries its own reconstructable history.
 */
export function interviewReducer(state: InterviewState, event: InterviewEvent): InterviewState {
  const next = applyEvent(state, event);
  return { ...next, log: [...state.log, event] };
}

/** Reconstruct interview state by replaying a full event log over fresh steps. */
export function replayInterview(steps: StepDescriptor[], log: InterviewEvent[]): InterviewState {
  return log.reduce(interviewReducer, initInterview(steps));
}

// ── Selectors (pure derivations) ────────────────────────────────────────────

export function currentStep(state: InterviewState): StepProgress | null {
  return state.steps[state.stepIndex] ?? null;
}

export function passedCount(state: InterviewState): number {
  return state.steps.filter((s) => s.status === "passed").length;
}

export function isComplete(state: InterviewState): boolean {
  return state.phase === "completed";
}

export function isPaused(state: InterviewState): boolean {
  return state.phase === "paused";
}

export function isLastStep(state: InterviewState): boolean {
  return state.stepIndex === state.steps.length - 1;
}

export function canRevealHint(state: InterviewState): boolean {
  const step = currentStep(state);
  return step !== null && step.revealedHints < step.hintCount;
}

/** Per-step checkpoint audit, derived from the append-only log (for evaluation). */
export interface CheckpointAudit {
  stepId: string;
  offered: boolean;
  accepted: boolean;
  /** Verification status at the moment the checkpoint was applied (else null). */
  priorStatus: StepStatus | null;
}

export function checkpointAudits(state: InterviewState): CheckpointAudit[] {
  const byStep = new Map<string, CheckpointAudit>();
  const get = (stepId: string): CheckpointAudit => {
    let audit = byStep.get(stepId);
    if (!audit) {
      audit = { stepId, offered: false, accepted: false, priorStatus: null };
      byStep.set(stepId, audit);
    }
    return audit;
  };

  for (const event of state.log) {
    if (event.type === "offer-checkpoint" || event.type === "decline-checkpoint") {
      get(event.stepId).offered = true;
    } else if (event.type === "apply-checkpoint") {
      const audit = get(event.stepId);
      audit.offered = true;
      audit.accepted = true;
      audit.priorStatus = event.priorStatus;
    }
  }
  return [...byStep.values()];
}
