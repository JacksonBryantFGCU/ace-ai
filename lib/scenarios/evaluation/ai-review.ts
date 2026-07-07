import type { ConversationEntry } from "@/lib/scenarios/conversation";
import type { InterviewResult } from "@/lib/scenarios/interview-result";

/**
 * Client-safe contract for AI review of an interview. The `AiReviewInput` is the
 * serializable slice of an `InterviewResult` sent to the `gradeScenarioResponses`
 * server action (which re-loads the authored rubric server-side — grading criteria
 * never reach the browser). `AiReviewResult` is what the model returns. Kept free
 * of any server-only import so both the action and the (client-run) scorer share
 * these types.
 */

export interface AiReviewStep {
  id: string;
  kind: string;
  status: string;
  /** Candidate's typed answer for discussion/explain steps (empty otherwise). */
  response: string;
  /** Automated verification outcome, when a check was run for the step. */
  passed: boolean | null;
}

export interface AiReviewInput {
  scenarioSlug: string;
  steps: AiReviewStep[];
  transcript: { role: "candidate" | "interviewer"; text: string }[];
  workspace: { path: string; content: string }[];
}

export interface AiReviewResult {
  /** 0–100 holistic quality of reasoning, communication, and discussion answers. */
  score: number;
  /** 0–100 communication clarity (informational). */
  communication: number;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
}

/** Project an `InterviewResult` down to the serializable input the grader needs. */
export function buildAiReviewInput(result: InterviewResult): AiReviewInput {
  const isUtterance = (
    e: ConversationEntry,
  ): e is Extract<ConversationEntry, { kind: "utterance" }> => e.kind === "utterance";

  return {
    scenarioSlug: result.scenarioSlug,
    steps: result.steps.map((s) => ({
      id: s.id,
      kind: s.kind,
      status: s.status,
      response: s.response,
      passed: s.verificationResult ? s.verificationResult.passed : null,
    })),
    transcript: result.conversation
      .filter(isUtterance)
      .filter((e) => e.final)
      .map((e) => ({ role: e.role, text: e.text })),
    workspace: result.workspace.map((f) => ({ path: f.path, content: f.content })),
  };
}
