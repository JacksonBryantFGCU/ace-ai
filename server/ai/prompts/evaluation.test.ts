import { describe, expect, it } from "vitest";
import { buildVapiAnalysisPrompt, formatTranscript } from "@/server/ai/prompts/evaluation";
import type { VapiInterviewConfig } from "@/types/interview";

const config: VapiInterviewConfig = {
  role: "backend",
  difficulty: "hard",
  experience: "senior",
  strictness: "strict",
  questionType: "technical",
  interviewer: "default",
};

describe("buildVapiAnalysisPrompt", () => {
  it("includes the title-cased role and config labels", () => {
    const prompt = buildVapiAnalysisPrompt(config);
    expect(prompt).toContain("Backend engineer");
    expect(prompt).toContain("Question type: technical");
    expect(prompt).toContain("Difficulty: hard");
    expect(prompt).toContain("Candidate experience level: senior");
    expect(prompt).toContain("Interviewer strictness: strict");
  });

  it("specifies the questionBreakdown JSON field", () => {
    expect(buildVapiAnalysisPrompt(config)).toContain("questionBreakdown");
  });
});

describe("formatTranscript", () => {
  it("labels assistant as Interviewer and user as Candidate", () => {
    const text = formatTranscript([
      { role: "assistant", text: "Question?" },
      { role: "user", text: "Answer." },
    ]);
    expect(text).toBe("Interviewer: Question?\nCandidate: Answer.");
  });
});
