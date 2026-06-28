import { describe, expect, it } from "vitest";
import { evaluateInputSchema, roleSchema } from "@/lib/validation/interview";
import type { VapiInterviewConfig } from "@/types/interview";

const validConfig: VapiInterviewConfig = {
  role: "frontend",
  difficulty: "medium",
  experience: "junior",
  strictness: "balanced",
  questionType: "behavioral",
  interviewer: "default",
};

const validTranscript = [
  { role: "assistant" as const, text: "Tell me about a hard project." },
  { role: "user" as const, text: "I led a migration last year." },
];

describe("evaluateInputSchema", () => {
  it("accepts a valid transcript + config", () => {
    const result = evaluateInputSchema.safeParse({
      transcript: validTranscript,
      config: validConfig,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a transcript shorter than 2 turns", () => {
    const result = evaluateInputSchema.safeParse({
      transcript: [validTranscript[0]],
      config: validConfig,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a 'system' role in the transcript", () => {
    const result = evaluateInputSchema.safeParse({
      transcript: [...validTranscript, { role: "system", text: "noise" }],
      config: validConfig,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid difficulty enum", () => {
    const result = evaluateInputSchema.safeParse({
      transcript: validTranscript,
      config: { ...validConfig, difficulty: "expert" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty transcript text", () => {
    const result = evaluateInputSchema.safeParse({
      transcript: [validTranscript[0], { role: "user", text: "" }],
      config: validConfig,
    });
    expect(result.success).toBe(false);
  });
});

describe("roleSchema", () => {
  it("accepts an allow-listed role", () => {
    expect(roleSchema.safeParse("backend").success).toBe(true);
  });

  it("rejects an unknown role", () => {
    expect(roleSchema.safeParse("astronaut").success).toBe(false);
  });
});
