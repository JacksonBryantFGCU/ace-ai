import { describe, expect, it } from "vitest";
import { isVoiceIntent, VOICE_INTENT_TYPES } from "@/lib/voice/intents";

describe("isVoiceIntent", () => {
  it("accepts well-formed intents", () => {
    expect(isVoiceIntent({ type: "REQUEST_HINT" })).toBe(true);
    expect(isVoiceIntent({ type: "CANDIDATE_RESPONSE", text: "hi" })).toBe(true);
    expect(isVoiceIntent({ type: "GO_TO_STEP", index: 2 })).toBe(true);
    expect(isVoiceIntent({ type: "REQUEST_CLARIFICATION", question: "why?" })).toBe(true);
  });

  it("rejects malformed or unknown intents", () => {
    expect(isVoiceIntent({ type: "NOPE" })).toBe(false);
    expect(isVoiceIntent({ type: "CANDIDATE_RESPONSE" })).toBe(false); // missing text
    expect(isVoiceIntent({ type: "GO_TO_STEP", index: "2" })).toBe(false); // wrong type
    expect(isVoiceIntent(null)).toBe(false);
    expect(isVoiceIntent("REQUEST_HINT")).toBe(false);
  });

  it("lists every intent type once", () => {
    expect(new Set(VOICE_INTENT_TYPES).size).toBe(VOICE_INTENT_TYPES.length);
    expect(VOICE_INTENT_TYPES).toContain("FINISH_INTERVIEW");
  });
});
