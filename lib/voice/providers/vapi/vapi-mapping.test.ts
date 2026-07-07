import { describe, expect, it } from "vitest";
import {
  extractErrorText,
  parseVapiMessage,
  toAssistantConfig,
  toVapiTools,
} from "@/lib/voice/providers/vapi/vapi-mapping";
import { buildVoiceTools } from "@/lib/voice/prompt/tools";
import type { VoiceIntentType } from "@/lib/voice/intents";
import type { VoiceSessionConfig } from "@/lib/voice/provider";

const INTENT_BY_TOOL = new Map<string, VoiceIntentType>([
  ["request_hint", "REQUEST_HINT"],
  ["next_step", "NEXT_STEP"],
  ["go_to", "GO_TO_STEP"],
]);

const CONFIG: VoiceSessionConfig = {
  systemPrompt: "You are the interviewer.",
  firstMessage: "Hi there.",
  persona: {
    id: "cassidy",
    displayName: "Cassidy",
    personality: "warm and sharp",
    voice: { provider: "11labs", voiceId: "abc" },
  },
  tools: buildVoiceTools(),
};

describe("toVapiTools", () => {
  it("maps neutral tools to Vapi function tools and drops the intent field", () => {
    const tools = toVapiTools([
      { name: "request_hint", description: "reveal a hint", intent: "REQUEST_HINT" },
    ]);
    expect(tools).toEqual([
      { type: "function", function: { name: "request_hint", description: "reveal a hint", parameters: { type: "object", properties: {} } } },
    ]);
  });

  it("preserves custom parameters when present", () => {
    const params = { type: "object", properties: { index: { type: "number" } } };
    const [tool] = toVapiTools([{ name: "go_to", description: "jump", intent: "GO_TO_STEP", parameters: params }]);
    expect(tool!.function.parameters).toBe(params);
  });
});

describe("toAssistantConfig", () => {
  it("embeds the system prompt, first message, voice, and tools", () => {
    const cfg = toAssistantConfig(CONFIG) as unknown as {
      model: { messages: { role: string; content: string }[]; tools: unknown[]; provider: string };
      voice: { provider: string; voiceId: string };
      firstMessage: string;
    };
    expect(cfg.model.messages[0]).toEqual({ role: "system", content: "You are the interviewer." });
    expect(cfg.model.tools.length).toBe(buildVoiceTools().length);
    expect(cfg.voice).toEqual({ provider: "11labs", voiceId: "abc" });
    expect(cfg.firstMessage).toBe("Hi there.");
  });
});

describe("parseVapiMessage — transcripts", () => {
  it("maps a final user transcript to a final candidate event", () => {
    expect(parseVapiMessage({ type: "transcript", role: "user", transcriptType: "final", transcript: "hello" }, INTENT_BY_TOOL)).toEqual([
      { type: "transcript", role: "candidate", text: "hello", final: true },
    ]);
  });

  it("maps a partial assistant transcript to a non-final assistant event", () => {
    expect(parseVapiMessage({ type: "transcript", role: "assistant", transcriptType: "partial", transcript: "let" }, INTENT_BY_TOOL)).toEqual([
      { type: "transcript", role: "assistant", text: "let", final: false },
    ]);
  });

  it("ignores system-role and empty transcripts", () => {
    expect(parseVapiMessage({ type: "transcript", role: "system", transcript: "x" }, INTENT_BY_TOOL)).toEqual([]);
    expect(parseVapiMessage({ type: "transcript", role: "user", transcript: "" }, INTENT_BY_TOOL)).toEqual([]);
  });
});

describe("parseVapiMessage — tool/function calls", () => {
  it("maps toolCallList (function shape) to an intent", () => {
    expect(parseVapiMessage({ type: "tool-calls", toolCallList: [{ function: { name: "request_hint" } }] }, INTENT_BY_TOOL)).toEqual([
      { type: "intent", intent: { type: "REQUEST_HINT" } },
    ]);
  });

  it("maps toolCalls (bare name shape) to an intent", () => {
    expect(parseVapiMessage({ type: "tool-calls", toolCalls: [{ name: "next_step" }] }, INTENT_BY_TOOL)).toEqual([
      { type: "intent", intent: { type: "NEXT_STEP" } },
    ]);
  });

  it("parses arguments for an arg-carrying intent", () => {
    expect(
      parseVapiMessage({ type: "tool-calls", toolCallList: [{ function: { name: "go_to", arguments: '{"index":2}' } }] }, INTENT_BY_TOOL),
    ).toEqual([{ type: "intent", intent: { type: "GO_TO_STEP", index: 2 } }]);
  });

  it("drops an arg-carrying call with an invalid argument", () => {
    expect(parseVapiMessage({ type: "tool-calls", toolCallList: [{ function: { name: "go_to", arguments: "{}" } }] }, INTENT_BY_TOOL)).toEqual([]);
  });

  it("maps the legacy function-call shape", () => {
    expect(parseVapiMessage({ type: "function-call", functionCall: { name: "request_hint" } }, INTENT_BY_TOOL)).toEqual([
      { type: "intent", intent: { type: "REQUEST_HINT" } },
    ]);
  });

  it("ignores unknown tool names and unknown message types", () => {
    expect(parseVapiMessage({ type: "tool-calls", toolCallList: [{ name: "unknown_tool" }] }, INTENT_BY_TOOL)).toEqual([]);
    expect(parseVapiMessage({ type: "status-update" }, INTENT_BY_TOOL)).toEqual([]);
    expect(parseVapiMessage(null, INTENT_BY_TOOL)).toEqual([]);
    expect(parseVapiMessage("nope", INTENT_BY_TOOL)).toEqual([]);
  });
});

describe("extractErrorText", () => {
  it("reads bare strings, {message}, and nested {error} shapes", () => {
    expect(extractErrorText("boom")).toBe("boom");
    expect(extractErrorText({ message: "bad key" })).toBe("bad key");
    expect(extractErrorText({ error: { message: "nested" } })).toBe("nested");
    expect(extractErrorText({ error: { error: "deep" } })).toBe("deep");
  });

  it("falls back for unreadable errors", () => {
    expect(extractErrorText(undefined)).toMatch(/Could not connect/);
    expect(extractErrorText({})).toMatch(/Could not connect/);
  });
});
