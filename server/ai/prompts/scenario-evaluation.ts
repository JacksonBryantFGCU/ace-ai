import "server-only";

import type { AiReviewInput } from "@/lib/scenarios/evaluation/ai-review";
import type { Scenario } from "@/lib/scenarios/schema";

/** Cap any single code file so a large workspace can't blow the prompt budget. */
const MAX_FILE_CHARS = 4000;

function formatRubric(rubric: Scenario["rubric"]): string {
  if (rubric.length === 0) return "(none provided)";
  return rubric.map((c) => `- ${c.criterion} (weight ${c.weight}): ${c.detail}`).join("\n");
}

/**
 * System prompt for grading a scenario interview. Automated correctness is scored
 * deterministically elsewhere, so the model is told to focus on the candidate's
 * reasoning, communication, approach, and discussion/explain answers, judged
 * against the authored rubric.
 */
export function buildScenarioGradingPrompt(scenario: Scenario): string {
  const steps = scenario.steps
    .map((step) => {
      const rubric = step.rubric ? `\n  Rubric:\n${formatRubric(step.rubric).replace(/^/gm, "  ")}` : "";
      return `- [${step.id}] (${step.kind}) ${step.prompt}${rubric}`;
    })
    .join("\n");

  return [
    "You are an expert technical interviewer grading a candidate's performance on a coding-interview scenario.",
    "Automated test correctness is scored separately and is NOT your job. Focus your grade on the candidate's",
    "REASONING, COMMUNICATION, problem-solving approach, and their answers to discussion/explain steps —",
    "judged against the authored rubric below. Be fair but rigorous; do not inflate scores for vague answers.",
    "",
    `Scenario: ${scenario.title}`,
    `Summary: ${scenario.summary}`,
    "",
    "Holistic rubric:",
    formatRubric(scenario.rubric),
    "",
    "Steps:",
    steps,
    "",
    "Respond with ONLY a JSON object of this exact shape:",
    "{",
    '  "score": <integer 0-100, overall quality of reasoning/communication/discussion>,',
    '  "communication": <integer 0-100, clarity of the candidate\'s communication>,',
    '  "strengths": [<short specific strings>],',
    '  "improvements": [<short specific strings>],',
    '  "nextSteps": [<short actionable strings>]',
    "}",
    "If the candidate barely engaged (no responses, no discussion), score low and say so plainly.",
  ].join("\n");
}

/** User message: the candidate's actual work — responses, transcript, and code. */
export function formatCandidateWork(input: AiReviewInput): string {
  const steps = input.steps
    .map((s) => {
      const outcome = s.passed === null ? "no automated check" : s.passed ? "passed checks" : "failed checks";
      const response = s.response.trim() ? `\n  Response: ${s.response.trim()}` : "\n  Response: (none)";
      return `- [${s.id}] status=${s.status}, ${outcome}${response}`;
    })
    .join("\n");

  const transcript =
    input.transcript.length > 0
      ? input.transcript.map((t) => `${t.role === "candidate" ? "Candidate" : "Interviewer"}: ${t.text}`).join("\n")
      : "(no spoken conversation recorded)";

  const code =
    input.workspace.length > 0
      ? input.workspace
          .map((f) => `--- ${f.path} ---\n${f.content.slice(0, MAX_FILE_CHARS)}`)
          .join("\n\n")
      : "(no code submitted)";

  return [
    "STEP OUTCOMES & RESPONSES:",
    steps,
    "",
    "CONVERSATION TRANSCRIPT:",
    transcript,
    "",
    "FINAL WORKSPACE CODE:",
    code,
  ].join("\n");
}
