import type { InterviewResult } from "@/lib/scenarios/interview-result";
import type { Scorer } from "@/lib/scenarios/evaluation/types";

/**
 * The scorers implementable deterministically today. Each reads only the
 * `InterviewResult`. Future scorers — interviewer scoring, AI reasoning, rubric
 * scoring, communication scoring — implement the same `Scorer` interface and are
 * appended to the registry with no other change.
 *
 * Overall-score contribution is expressed via each dimension's `weight`
 * (0 = informational). Today only automated correctness carries weight; when a
 * rubric/AI scorer lands and adds weighted dimensions, the overall recomputes
 * automatically.
 */

/** Correctness from automated-testable steps: passed → full step weight, else 0. */
export const automatedTestsScorer: Scorer = {
  id: "automated-tests",
  label: "Automated correctness",
  score(result: InterviewResult) {
    const autoSteps = result.steps.filter((s) => s.autoScorable);
    const max = autoSteps.reduce((n, s) => n + s.weight, 0);
    const earned = autoSteps.reduce((n, s) => n + (s.status === "passed" ? s.weight : 0), 0);

    const strengths: string[] = [];
    const improvements: string[] = [];
    for (const s of autoSteps) {
      if (s.status === "passed") strengths.push(`Passed the automated checks on "${s.id}".`);
      else if (s.status === "checkpoint_applied") improvements.push(`Recovered "${s.id}" via checkpoint — no credit awarded.`);
      else improvements.push(`"${s.id}" did not pass its automated checks.`);
    }

    return {
      dimensions: [
        {
          id: "automated-tests",
          label: "Automated correctness",
          score: earned,
          max,
          weight: 1,
          detail: `${earned} / ${max} auto-scorable step weight passed`,
        },
      ],
      strengths,
      improvements,
    };
  },
};

/** Hints used across the interview (informational). */
export const hintsScorer: Scorer = {
  id: "hints",
  label: "Hints used",
  score(result: InterviewResult) {
    const used = result.steps.reduce((n, s) => n + s.revealedHints, 0);
    const available = result.steps.reduce((n, s) => n + s.hintCount, 0);
    return {
      dimensions: [
        { id: "hints", label: "Hints used", score: used, max: available, weight: 0, detail: `${used} of ${available} revealed` },
      ],
      improvements: used > 0 ? [`Used ${used} hint${used === 1 ? "" : "s"} — aim to lean on hints less.`] : [],
      meta: { used, available },
    };
  },
};

/** Checkpoint usage (informational; a strong signal for trajectory scoring later). */
export const checkpointsScorer: Scorer = {
  id: "checkpoints",
  label: "Checkpoints used",
  score(result: InterviewResult) {
    const accepted = result.steps.filter((s) => s.checkpoint.accepted);
    const available = result.steps.filter((s) => s.checkpoint.available).length;
    return {
      dimensions: [
        { id: "checkpoints", label: "Checkpoints applied", score: accepted.length, max: available, weight: 0, detail: `${accepted.length} of ${available} applied` },
      ],
      improvements:
        accepted.length > 0
          ? [`Applied ${accepted.length} checkpoint${accepted.length === 1 ? "" : "s"} (${accepted.map((s) => s.id).join(", ")}) — try to complete these unaided.`]
          : [],
    };
  },
};

/** Time to completion (informational; no-op until timings are captured). */
export const timingScorer: Scorer = {
  id: "timing",
  label: "Time",
  score(result: InterviewResult) {
    const ms = result.timings.durationMs;
    if (ms === null) return { dimensions: [] };
    const minutes = Math.round((ms / 60000) * 10) / 10;
    return {
      dimensions: [{ id: "timing", label: "Time spent", score: Math.round(ms / 1000), max: 0, weight: 0, detail: `~${minutes} min` }],
      notes: [`Completed in about ${minutes} min.`],
    };
  },
};

/** The scorers active today. Append AI / rubric / interviewer / communication here. */
export const defaultScorers: Scorer[] = [
  automatedTestsScorer,
  hintsScorer,
  checkpointsScorer,
  timingScorer,
];
