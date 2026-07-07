/**
 * buildStepBrief — the per-step briefing injected as a system/context message when
 * a `STEP_STARTED` signal arrives, telling the interviewer what this step is (its
 * kind, prompt, hint availability, checkpoint availability). Derived purely from the
 * frozen scenario's step data, so a new scenario needs no prompt code (C7).
 *
 * It states FACTS + how to open the step; it never contains the solution, rubric,
 * or hint text (hints are read only after a `HINT_REVEALED` signal).
 */

import type { InterviewContext } from "@/lib/scenarios/interview-controller";

type Step = NonNullable<InterviewContext["step"]>;

const KIND_FRAMING: Record<Step["kind"], string> = {
  implement: "They need to write the implementation.",
  debug: "There is a bug for them to find and fix.",
  refactor: "Working code needs to be improved without changing its behavior.",
  explain: "This is a discussion step. There is no code to run. Talk it through with them.",
};

export function buildStepBrief(step: Step): string {
  const position = `Step ${step.index + 1} of ${step.total}.`;
  const framing = KIND_FRAMING[step.kind];
  const hints =
    step.hintsAvailable > 0
      ? `There are ${step.hintsAvailable} hints available if they get stuck. Do not volunteer them. Offer one only if they ask or are clearly blocked, and reveal it through the request_hint tool.`
      : "There are no hints for this step.";
  const checkpoint = step.checkpointAvailable
    ? "A checkpoint is available for this step, but only offer it if they are badly stuck. Using it means the step is not self-earned."
    : "";

  return [
    `${position} ${framing}`,
    `Introduce the step in your own words, then read the task to them:`,
    `"${step.prompt}"`,
    `Encourage them to think out loud as they work.`,
    hints,
    checkpoint,
  ]
    .filter(Boolean)
    .join("\n");
}
