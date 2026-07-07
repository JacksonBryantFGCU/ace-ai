import { gradeScenarioResponses } from "@/actions/scenario";
import { buildAiReviewInput } from "@/lib/scenarios/evaluation/ai-review";
import type { Scorer } from "@/lib/scenarios/evaluation/types";

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * AI scorer: grades the candidate's reasoning, communication, and discussion
 * answers via the `gradeScenarioResponses` server action (which holds the authored
 * rubric). Contributes a weighted "Response quality" dimension so the overall score
 * reflects more than automated correctness, plus qualitative feedback.
 *
 * Runs from the client evaluation engine; on any failure (offline, no API key,
 * unauthenticated dev playground) it degrades gracefully to no weighted
 * contribution rather than breaking the whole report.
 */
export const aiReviewScorer: Scorer = {
  id: "ai-review",
  label: "AI review",
  async score(result) {
    try {
      const review = await gradeScenarioResponses(buildAiReviewInput(result));
      const score = clamp100(review.score);
      const communication = clamp100(review.communication);
      return {
        dimensions: [
          {
            id: "ai-review",
            label: "Response quality",
            score,
            max: 100,
            weight: 1,
            detail: "AI-graded reasoning, communication & discussion answers",
          },
          {
            id: "communication",
            label: "Communication",
            score: communication,
            max: 100,
            weight: 0,
            detail: `${communication}/100`,
          },
        ],
        strengths: review.strengths,
        improvements: review.improvements,
        nextSteps: review.nextSteps,
      };
    } catch {
      return {
        dimensions: [],
        improvements: ["AI review of your responses was unavailable for this attempt."],
      };
    }
  },
};
