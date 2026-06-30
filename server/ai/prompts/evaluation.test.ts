import { describe, expect, it } from "vitest";
import {
  buildVapiAnalysisPrompt,
  formatSubmissions,
  formatTranscript,
} from "@/server/ai/prompts/evaluation";
import type { CodeSubmission, VapiInterviewConfig } from "@/types/interview";

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

  it("adds code-grading guidance for technical interviews", () => {
    expect(buildVapiAnalysisPrompt(config)).toContain("technical coding interview");
  });

  it("omits code-grading guidance for behavioral interviews", () => {
    const behavioral = buildVapiAnalysisPrompt({ ...config, questionType: "behavioral" });
    expect(behavioral).not.toContain("technical coding interview");
  });
});

describe("formatSubmissions", () => {
  const submissions: CodeSubmission[] = [
    { problemTitle: "Two Sum", language: "python", code: "def two_sum(): pass", passed: true },
    { problemTitle: "Reverse List", language: "javascript", code: "const f = () => {}", passed: false },
  ];

  it("includes each problem title, code, and a pass/fail status", () => {
    const text = formatSubmissions(submissions);
    expect(text).toContain("Two Sum");
    expect(text).toContain("def two_sum(): pass");
    expect(text).toContain("PASSED all test cases");
    expect(text).toContain("Reverse List");
    expect(text).toContain("did NOT pass all test cases");
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
