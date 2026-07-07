/**
 * buildContextUpdate — turn ONE runtime signal into the system/context nudge the
 * adapter injects mid-call, so the interviewer reacts to what actually happened in
 * the runtime (never to what it merely thinks happened). Returns `null` for signals
 * that need no narration (e.g. a recorded text response).
 *
 * These nudges are the mechanism that keeps the interviewer honest: it only says
 * "your tests passed" because a `VERIFICATION_COMPLETE` signal said so. It is never
 * told the fix — only the failing test's name — so it cannot leak the solution.
 */

import { buildStepBrief } from "@/lib/voice/prompt/step-brief";
import type { InterviewContext } from "@/lib/scenarios/interview-controller";
import type { RuntimeSignal } from "@/lib/scenarios/runtime-signal";

/** Adapt a STEP_STARTED signal to the shape `buildStepBrief` expects. */
function stepFromSignal(
  signal: Extract<RuntimeSignal, { type: "STEP_STARTED" }>,
): NonNullable<InterviewContext["step"]> {
  return {
    index: signal.stepIndex,
    total: signal.total,
    id: signal.stepId,
    kind: signal.kind,
    prompt: signal.prompt,
    hintsAvailable: signal.hintsAvailable,
    hintsRevealed: 0,
    verification: "",
    checkpointAvailable: signal.checkpointAvailable,
  };
}

export function buildContextUpdate(signal: RuntimeSignal): string | null {
  switch (signal.type) {
    case "INTERVIEW_STARTED":
      return `The interview is starting. It is "${signal.title}" and has ${signal.stepCount} steps. Introduce yourself briefly and set the candidate at ease before the first step.`;

    case "STEP_STARTED":
      return signal.restarted
        ? `The current step was just restarted. Re-orient the candidate.\n${buildStepBrief(stepFromSignal(signal))}`
        : buildStepBrief(stepFromSignal(signal));

    case "HINT_REVEALED":
      return `A hint was just revealed to the candidate. Read it naturally, then check their understanding. The hint is: "${signal.text}". ${
        signal.remaining > 0
          ? `There are ${signal.remaining} more hints left.`
          : "That was the last hint for this step."
      }`;

    case "VERIFICATION_STARTED":
      return "The candidate's tests are now running. Let them know you're checking, and wait for the result.";

    case "VERIFICATION_COMPLETE":
      if (signal.passed) {
        return "The candidate's tests just passed. Acknowledge it warmly and ask if they want to move on.";
      }
      return signal.firstFailure
        ? `The candidate's tests just ran and did not all pass. ${signal.passedCount} of ${signal.total} passed. The first failing case is "${signal.firstFailure}". Encourage them to reason about that case. Do not give them the fix.`
        : "The candidate's tests just ran and did not all pass. Encourage them to reason about what might be wrong. Do not give them the fix.";

    case "CHECKPOINT_OFFERED":
      return "A checkpoint has been offered to the candidate. Explain gently that it restores known-good code but means this step is not self-earned, and let them decide.";

    case "CHECKPOINT_APPLIED":
      return "The candidate applied a checkpoint; their workspace was restored to a known-good state. Acknowledge it without judgement and help them keep moving.";

    case "INTERVIEW_PAUSED":
      return "The interview is paused. Wait quietly until it resumes.";

    case "INTERVIEW_RESUMED":
      return "The interview has resumed. Gently pick back up where you left off.";

    case "INTERVIEW_COMPLETE":
      return `The interview is complete. The candidate passed ${signal.passedCount} of ${signal.total} steps. Give a short, encouraging summary of how it went and thank them.`;

    case "RESPONSE_RECORDED":
      // Silent: the candidate's typed/spoken response was recorded; no narration.
      return null;

    default:
      return null;
  }
}
