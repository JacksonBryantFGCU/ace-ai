/**
 * PURE translation between the neutral voice types and Vapi's wire shapes. No SDK
 * import, no side effects — every function here is unit-tested with plain data:
 *
 *   - `toAssistantConfig` / `toVapiTools` : neutral session config → Vapi assistant
 *   - `parseVapiMessage`                  : raw Vapi `message` → VoiceProviderEvent[]
 *   - `extractErrorText`                  : Vapi error (nested) → readable string
 *
 * Keeping this pure is what lets the provider stay thin and the mapping be verified
 * without a browser or the real SDK.
 */

import type { VoiceIntent, VoiceIntentType } from "@/lib/voice/intents";
import type { VoiceProviderEvent, VoiceSessionConfig, VoiceToolDefinition } from "@/lib/voice/provider";
import type { VapiAssistantConfig } from "@/lib/voice/providers/vapi/vapi-client";

// ── Outbound: neutral config → Vapi assistant ────────────────────────────────

interface VapiFunctionTool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

const EMPTY_PARAMS: Record<string, unknown> = { type: "object", properties: {} };

/** Map neutral tool defs to Vapi function-tool defs (the `intent` field is dropped). */
export function toVapiTools(tools: readonly VoiceToolDefinition[]): VapiFunctionTool[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters ?? EMPTY_PARAMS,
    },
  }));
}

/**
 * Build the inline Vapi assistant config. Mirrors the shared transport boilerplate
 * (OpenAI model, Deepgram transcriber, denoising) but is owned by the provider so
 * the scenario voice can diverge from the legacy islands without ripple.
 */
export function toAssistantConfig(config: VoiceSessionConfig): VapiAssistantConfig {
  return {
    model: {
      provider: "openai",
      model: "gpt-4.1",
      messages: [{ role: "system", content: config.systemPrompt }],
      tools: toVapiTools(config.tools),
    },
    voice: config.persona.voice,
    transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
    firstMessage: config.firstMessage,
    backgroundSpeechDenoisingPlan: { smartDenoisingPlan: { enabled: true } },
  } as unknown as VapiAssistantConfig;
}

// ── Inbound: Vapi message → provider events ──────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Coerce a tool-call `arguments` payload (object or JSON string) to a plain record. */
function parseArgs(raw: unknown): Record<string, unknown> {
  if (isRecord(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Build a typed VoiceIntent for a matched tool name, validating any required args. */
function intentForToolName(
  name: string,
  args: Record<string, unknown>,
  intentByTool: ReadonlyMap<string, VoiceIntentType>,
): VoiceIntent | null {
  const type = intentByTool.get(name);
  if (!type) return null;
  switch (type) {
    case "GO_TO_STEP": {
      const index = typeof args.index === "number" ? args.index : Number(args.index);
      return Number.isInteger(index) ? { type, index } : null;
    }
    case "CANDIDATE_RESPONSE":
      return typeof args.text === "string" ? { type, text: args.text } : null;
    case "REQUEST_CLARIFICATION":
      return typeof args.question === "string" ? { type, question: args.question } : null;
    default:
      // All remaining intents are argument-free.
      return { type };
  }
}

function transcriptEvents(message: Record<string, unknown>): VoiceProviderEvent[] {
  const text = message.transcript;
  const role = message.role;
  if (typeof text !== "string" || text.length === 0) return [];
  if (role !== "user" && role !== "assistant") return []; // ignore system/other
  return [
    {
      type: "transcript",
      role: role === "assistant" ? "assistant" : "candidate",
      text,
      final: message.transcriptType === "final",
    },
  ];
}

/** Read `{ name }` or `{ function: { name, arguments } }` from one tool-call item. */
function toolCallToIntent(
  item: unknown,
  intentByTool: ReadonlyMap<string, VoiceIntentType>,
): VoiceProviderEvent | null {
  if (!isRecord(item)) return null;
  const fn = isRecord(item.function) ? item.function : undefined;
  const name = (typeof item.name === "string" ? item.name : undefined) ?? (typeof fn?.name === "string" ? fn.name : undefined);
  if (!name) return null;
  const args = parseArgs(fn?.arguments ?? item.arguments ?? item.parameters);
  const intent = intentForToolName(name, args, intentByTool);
  return intent ? { type: "intent", intent } : null;
}

function toolCallEvents(
  message: Record<string, unknown>,
  intentByTool: ReadonlyMap<string, VoiceIntentType>,
): VoiceProviderEvent[] {
  // Vapi has used both `toolCallList` and `toolCalls`; accept either.
  const list = Array.isArray(message.toolCallList)
    ? message.toolCallList
    : Array.isArray(message.toolCalls)
      ? message.toolCalls
      : [];
  const events: VoiceProviderEvent[] = [];
  for (const item of list) {
    const event = toolCallToIntent(item, intentByTool);
    if (event) events.push(event);
  }
  return events;
}

function functionCallEvents(
  message: Record<string, unknown>,
  intentByTool: ReadonlyMap<string, VoiceIntentType>,
): VoiceProviderEvent[] {
  const fc = message.functionCall;
  if (!isRecord(fc) || typeof fc.name !== "string") return [];
  const args = parseArgs(fc.parameters ?? fc.arguments);
  const intent = intentForToolName(fc.name, args, intentByTool);
  return intent ? [{ type: "intent", intent }] : [];
}

/**
 * Translate ONE raw Vapi `message` payload into zero or more provider events.
 * Only the message kinds the core lifecycle needs are handled (transcript + tool/
 * function calls); everything else is ignored.
 */
export function parseVapiMessage(
  message: unknown,
  intentByTool: ReadonlyMap<string, VoiceIntentType>,
): VoiceProviderEvent[] {
  if (!isRecord(message)) return [];
  switch (message.type) {
    case "transcript":
      return transcriptEvents(message);
    case "tool-calls":
      return toolCallEvents(message, intentByTool);
    case "function-call":
      return functionCallEvents(message, intentByTool);
    default:
      return [];
  }
}

// ── Errors ───────────────────────────────────────────────────────────────────

/** Pull a human-readable string out of a Vapi error (bare string, {message}, nested). */
export function extractErrorText(error: unknown): string {
  const dig = (value: unknown): string | undefined => {
    if (typeof value === "string") return value.trim() || undefined;
    if (isRecord(value)) {
      if ("error" in value) {
        const nested = dig(value.error);
        if (nested) return nested;
      }
      if ("message" in value) return dig(value.message);
    }
    return undefined;
  };
  return dig(error) ?? "Could not connect to the interviewer. Please try again.";
}
