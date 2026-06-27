import type { TranscriptEntry, VapiInterviewConfig } from "@/types/interview";

/**
 * Pure prompt builders for transcript evaluation. No secrets, no I/O — safe to
 * import anywhere and unit-test. Ported from the legacy `runVapiAnalysis`
 * inline prompt, adapted to consume the union-label config directly (instead of
 * the old 0–100 numeric scales).
 */

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "Interviewer: …\nCandidate: …" — the user message fed alongside the system prompt. */
export function formatTranscript(transcript: TranscriptEntry[]): string {
  return transcript
    .map((entry) => `${entry.role === "assistant" ? "Interviewer" : "Candidate"}: ${entry.text}`)
    .join("\n");
}

export function buildVapiAnalysisPrompt(config: VapiInterviewConfig): string {
  const roleLabel = titleCase(config.role);

  return `You are an expert interview evaluator. Analyze the following ${roleLabel} engineering interview transcript.

Interview settings:
- Role: ${roleLabel} engineer
- Question type: ${config.questionType}
- Difficulty: ${config.difficulty}
- Candidate experience level: ${config.experience}
- Interviewer strictness: ${config.strictness}

Evaluate the candidate's performance considering the difficulty and experience level. A junior candidate answering easy questions should be graded relative to junior expectations. A senior candidate answering hard questions should be graded relative to senior expectations.

Return a JSON object with exactly this structure:
{
  "score": <number 0-100, overall interview performance>,
  "communication": <number 0-100, clarity, articulation, conciseness of answers>,
  "technicalAccuracy": <number 0-100, correctness of technical content>,
  "problemSolving": <number 0-100, logical thinking, approach to problems>,
  "strengths": [<3-5 strings, specific strengths with brief examples from the transcript>],
  "improvements": [<3-5 strings, specific areas to improve with examples from the transcript>],
  "nextSteps": [<3-5 strings, actionable study or practice recommendations>],
  "questionBreakdown": [
    {
      "question": <the interviewer's question>,
      "candidateAnswer": <summary of the candidate's answer>,
      "score": <number 0-100>,
      "feedback": <specific feedback on this answer>
    }
  ]
}

Include every question-answer pair in questionBreakdown. Be specific and reference the candidate's actual words. Do not be generic.`;
}
