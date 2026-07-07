import type { InterviewResult } from "@/lib/scenarios/interview-result";
import type {
  EvaluationEngine,
  EvaluationReport,
  ReportDimension,
  Scorer,
  StepEvaluation,
} from "@/lib/scenarios/evaluation/types";
import { defaultScorers } from "@/lib/scenarios/evaluation/scorers";

/** Remove duplicate strings while preserving order. */
function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

/**
 * Build an EvaluationEngine over a set of scorers. The engine:
 *  - runs every scorer (sync or async) over the InterviewResult,
 *  - flattens their dimensions (tagged with the scorer id),
 *  - computes the overall score as a weighted average over dimensions with a
 *    positive `weight` (informational dimensions are ignored),
 *  - derives a deterministic per-step breakdown, and
 *  - lists what still needs a scorer that doesn't exist yet (`pending`).
 *
 * Adding a scorer changes the report automatically — no engine change needed.
 */
export function createEvaluationEngine(scorers: Scorer[]): EvaluationEngine {
  return {
    async evaluate(result: InterviewResult): Promise<EvaluationReport> {
      const outputs = await Promise.all(
        scorers.map(async (scorer) => ({ scorer, output: await scorer.score(result) })),
      );

      const dimensions: ReportDimension[] = [];
      const strengths: string[] = [];
      const improvements: string[] = [];
      const nextSteps: string[] = [];

      for (const { scorer, output } of outputs) {
        for (const dimension of output.dimensions) {
          dimensions.push({ ...dimension, source: scorer.id });
        }
        strengths.push(...(output.strengths ?? []));
        improvements.push(...(output.improvements ?? []));
        nextSteps.push(...(output.nextSteps ?? []));
      }

      // Overall = weighted average over dimensions that carry weight and a max.
      const weighted = dimensions.filter((d) => (d.weight ?? 0) > 0 && d.max > 0);
      const totalWeight = weighted.reduce((n, d) => n + (d.weight ?? 0), 0);
      const overallScore =
        totalWeight > 0
          ? Math.round(
              (weighted.reduce((n, d) => n + (d.weight ?? 0) * (d.score / d.max), 0) / totalWeight) *
                100,
            )
          : 0;

      // Did an AI scorer review the responses? If so, discussion/rubric steps are no
      // longer "pending" — they've been graded holistically.
      const aiReviewed = dimensions.some((d) => d.source === "ai-review");

      const stepBreakdown: StepEvaluation[] = result.steps.map((step) => {
        const autoScored = step.autoScorable;
        const earned = autoScored && step.status === "passed" ? step.weight : 0;
        const note = !autoScored
          ? aiReviewed
            ? "Discussion step — reviewed by AI (see response quality & feedback)."
            : "Rubric/discussion step — pending interviewer or AI review."
          : step.status === "passed"
            ? "Passed automated checks."
            : step.status === "checkpoint_applied"
              ? "Checkpoint applied — no credit."
              : step.status === "failed"
                ? "Did not pass automated checks."
                : "Not attempted.";
        return {
          stepId: step.id,
          kind: step.kind,
          weight: step.weight,
          status: step.status,
          earned,
          autoScored,
          note,
        };
      });

      const pending = aiReviewed
        ? []
        : result.steps
            .filter((s) => !s.autoScorable)
            .map((s) => `"${s.id}" (${s.kind}) awaits rubric scoring (interviewer/AI).`);

      // Fall back to sensible next steps if no scorer supplied any.
      if (nextSteps.length === 0) {
        const shaky = stepBreakdown.filter((s) => s.autoScored && s.status !== "passed");
        if (shaky.length > 0) nextSteps.push(`Revisit and re-attempt: ${shaky.map((s) => s.stepId).join(", ")}.`);
        if (pending.length > 0) nextSteps.push("Walk through the discussion step in a full review.");
      }

      return {
        scenarioSlug: result.scenarioSlug,
        overallScore,
        dimensions,
        stepBreakdown,
        strengths: dedupe(strengths),
        improvements: dedupe(improvements),
        nextSteps: dedupe(nextSteps),
        pending,
        scorers: scorers.map((s) => s.id),
        generatedAt: Date.now(),
      };
    },
  };
}

/** The default engine wired with the deterministic scorers available today. */
export const defaultEvaluationEngine = createEvaluationEngine(defaultScorers);
