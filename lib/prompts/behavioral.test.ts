import { describe, expect, it } from "vitest";
import { buildFirstMessage, buildSystemPrompt } from "@/lib/prompts/behavioral";
import type { VapiInterviewConfig } from "@/types/interview";

const config: VapiInterviewConfig = {
  role: "backend",
  difficulty: "hard",
  experience: "senior",
  strictness: "strict",
  questionType: "behavioral",
  interviewer: "cassidy",
};

describe("buildSystemPrompt", () => {
  it("embeds the persona and role", () => {
    const prompt = buildSystemPrompt(config, "PERSONA_X");
    expect(prompt.startsWith("PERSONA_X")).toBe(true);
    expect(prompt).toContain("senior Backend engineering interviewer");
  });

  it("selects the union-mapped instruction blocks", () => {
    const prompt = buildSystemPrompt(config, "p");
    expect(prompt).toContain("Difficulty is set to hard.");
    expect(prompt).toContain("experience level is senior.");
    expect(prompt).toContain("strictness level is strict.");
    expect(prompt).toContain("behavioral interview only.");
  });

  it("maps balanced strictness to the 'fair' block (legacy wording)", () => {
    const prompt = buildSystemPrompt({ ...config, strictness: "balanced" }, "p");
    expect(prompt).toContain("strictness level is fair.");
  });

  it("includes the speech-style guide", () => {
    expect(buildSystemPrompt(config, "p")).toContain("SPEECH STYLE:");
  });
});

describe("buildFirstMessage", () => {
  it("greets with the interviewer name and role", () => {
    const msg = buildFirstMessage(config, "Cassidy");
    expect(msg).toContain("I'm Cassidy.");
    expect(msg).toContain("Backend engineering interview");
  });
});
