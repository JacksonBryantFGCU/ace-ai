import { describe, expect, it } from "vitest";
import {
  appendConversation,
  signalEntry,
  systemNarration,
  toolCall,
  toolResult,
  utterance,
  type ConversationEntry,
} from "@/lib/scenarios/conversation";

describe("appendConversation", () => {
  it("appends immutably", () => {
    const a: ConversationEntry[] = [systemNarration("start", 1)];
    const b = appendConversation(a, utterance("candidate", "hi", true, 2));
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(2);
    expect(b[1]).toMatchObject({ kind: "utterance", role: "candidate", text: "hi" });
  });
});

describe("constructors", () => {
  it("builds utterances with defaults", () => {
    expect(utterance("interviewer", "hello", true, 10)).toEqual({
      kind: "utterance",
      role: "interviewer",
      text: "hello",
      final: true,
      at: 10,
    });
  });

  it("omits optional args/detail when not provided", () => {
    expect(toolCall("request_hint", "REQUEST_HINT", undefined, 3)).toEqual({
      kind: "tool-call",
      tool: "request_hint",
      intent: "REQUEST_HINT",
      at: 3,
    });
    expect(toolResult("request_hint", true, undefined, 4)).toEqual({
      kind: "tool-result",
      tool: "request_hint",
      ok: true,
      at: 4,
    });
  });

  it("includes args/detail when provided", () => {
    expect(toolCall("go_to", "GO_TO_STEP", { index: 2 }, 5)).toMatchObject({ args: { index: 2 } });
    expect(toolResult("run_verification", false, "2 of 4 passed", 6)).toMatchObject({ detail: "2 of 4 passed" });
  });

  it("wraps a runtime signal", () => {
    const entry = signalEntry({ type: "INTERVIEW_PAUSED" }, 7);
    expect(entry).toEqual({ kind: "signal", signal: { type: "INTERVIEW_PAUSED" }, at: 7 });
  });
});
