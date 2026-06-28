import { describe, expect, it } from "vitest";
import { buildTechnicalFirstMessage, buildTechnicalSystemPrompt } from "@/lib/prompts/technical";
import type { VapiInterviewConfig } from "@/types/interview";

const config: VapiInterviewConfig = {
  role: "backend",
  difficulty: "hard",
  experience: "senior",
  strictness: "strict",
  questionType: "technical",
  interviewer: "alex",
  language: "python",
  topics: ["arrays", "system-design"],
};

const questions = ["Reverse a string.", "Merge two sorted lists.", "Design a rate limiter."];

describe("buildTechnicalSystemPrompt", () => {
  it("includes the personality, role, and union-label config", () => {
    const prompt = buildTechnicalSystemPrompt(config, "You are Alex.", questions);
    expect(prompt).toContain("You are Alex.");
    expect(prompt).toContain("senior-level hard technical discussion");
    expect(prompt).toContain("strictness level is strict");
    expect(prompt).toContain("experience level is senior");
  });

  it("numbers the questions in order", () => {
    const prompt = buildTechnicalSystemPrompt(config, "p", questions);
    expect(prompt).toContain("1. Reverse a string.");
    expect(prompt).toContain("3. Design a rate limiter.");
  });

  it("adds topic focus and the system-design follow-up when selected", () => {
    const prompt = buildTechnicalSystemPrompt(config, "p", questions);
    expect(prompt).toContain("TOPIC FOCUS:");
    expect(prompt).toContain("Arrays & Strings");
    expect(prompt).toContain("System Design");
  });

  it("first message reads the first question aloud", () => {
    expect(buildTechnicalFirstMessage(questions)).toContain("Reverse a string.");
  });
});
