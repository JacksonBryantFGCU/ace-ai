import { describe, expect, it } from "vitest";
import { buildVoiceTools, toolNameForIntent } from "@/lib/voice/prompt/tools";
import { buildStepBrief } from "@/lib/voice/prompt/step-brief";
import { buildContextUpdate } from "@/lib/voice/prompt/context-update";
import { buildFirstMessage, buildInterviewerSystemPrompt } from "@/lib/voice/prompt/system-prompt";
import { resolvePersona, VOICE_PERSONAS } from "@/lib/voice/prompt/persona";
import type { InterviewContext } from "@/lib/scenarios/interview-controller";
import type { RuntimeSignal } from "@/lib/scenarios/runtime-signal";

const CONTEXT: InterviewContext = {
  scenario: { id: "demo", title: "User Directory Search", summary: "Build a search box", difficulty: "medium" },
  step: {
    index: 0,
    total: 3,
    id: "a",
    kind: "implement",
    prompt: "Implement the search filter",
    hintsAvailable: 2,
    hintsRevealed: 0,
    verification: "automated-tests",
    checkpointAvailable: true,
  },
  latestVerification: null,
  phase: "in_progress",
};

describe("tools", () => {
  it("exposes state-changing tools and maps them back to intents", () => {
    const tools = buildVoiceTools();
    expect(tools.map((t) => t.name)).toContain("request_hint");
    expect(toolNameForIntent("REQUEST_HINT")).toBe("request_hint");
    expect(toolNameForIntent("NEXT_STEP")).toBe("next_step");
  });

  it("does NOT expose conversational intents as tools", () => {
    expect(toolNameForIntent("REQUEST_REPEAT")).toBeNull();
    expect(toolNameForIntent("REQUEST_CLARIFICATION")).toBeNull();
    expect(toolNameForIntent("CANDIDATE_RESPONSE")).toBeNull();
  });
});

describe("buildStepBrief", () => {
  it("includes the prompt, kind framing, and hint guidance without hint text", () => {
    const brief = buildStepBrief(CONTEXT.step!);
    expect(brief).toContain("Step 1 of 3");
    expect(brief).toContain("Implement the search filter");
    expect(brief).toContain("2 hints available");
    expect(brief).toContain("checkpoint is available");
  });

  it("frames a discussion step as no-code", () => {
    const brief = buildStepBrief({ ...CONTEXT.step!, kind: "explain", hintsAvailable: 0, checkpointAvailable: false });
    expect(brief).toContain("discussion step");
    expect(brief).toContain("no hints");
  });
});

describe("buildContextUpdate", () => {
  const step: Extract<RuntimeSignal, { type: "STEP_STARTED" }> = {
    type: "STEP_STARTED",
    stepIndex: 0,
    total: 3,
    stepId: "a",
    kind: "implement",
    prompt: "Implement the search filter",
    isFirst: true,
    isLast: false,
    hintsAvailable: 2,
    checkpointAvailable: true,
    restarted: false,
  };

  it("narrates a step start from the brief", () => {
    expect(buildContextUpdate(step)).toContain("Implement the search filter");
  });

  it("reads a revealed hint aloud", () => {
    const update = buildContextUpdate({ type: "HINT_REVEALED", stepId: "a", index: 0, text: "use a filter", remaining: 1 });
    expect(update).toContain("use a filter");
    expect(update).toContain("1 more hints left");
  });

  it("names the failing test but never the fix", () => {
    const update = buildContextUpdate({
      type: "VERIFICATION_COMPLETE",
      stepId: "a",
      passed: false,
      passedCount: 2,
      total: 4,
      firstFailure: "handles empty query",
    });
    expect(update).toContain("handles empty query");
    expect(update).toContain("Do not give them the fix");
  });

  it("celebrates a pass", () => {
    const update = buildContextUpdate({ type: "VERIFICATION_COMPLETE", stepId: "a", passed: true, passedCount: 4, total: 4, firstFailure: null });
    expect(update).toContain("passed");
  });

  it("is silent for RESPONSE_RECORDED", () => {
    expect(buildContextUpdate({ type: "RESPONSE_RECORDED", stepId: "a", length: 10 })).toBeNull();
  });
});

describe("buildInterviewerSystemPrompt", () => {
  const persona = resolvePersona("cassidy");

  it("embeds persona, scenario facts, and the state-ownership boundary", () => {
    const prompt = buildInterviewerSystemPrompt(CONTEXT, persona);
    expect(prompt).toContain(persona.personality);
    expect(prompt).toContain("User Directory Search");
    expect(prompt).toContain("You do NOT control the interview state");
    expect(prompt).toContain("CALL THE MATCHING TOOL");
  });

  it("forbids leaking tests/rubrics/solutions", () => {
    const prompt = buildInterviewerSystemPrompt(CONTEXT, persona);
    expect(prompt).toMatch(/[Nn]ever reveal test contents/);
  });

  it("builds a warm first message naming the scenario", () => {
    expect(buildFirstMessage(CONTEXT)).toContain("User Directory Search");
  });
});

describe("personas", () => {
  it("exposes the roster and falls back to default", () => {
    expect(VOICE_PERSONAS.length).toBeGreaterThan(0);
    expect(resolvePersona("does-not-exist").id).toBe(VOICE_PERSONAS[0]!.id);
  });
});
