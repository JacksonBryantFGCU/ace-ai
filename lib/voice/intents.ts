/**
 * VoiceIntent — the voice client's INBOUND vocabulary (candidate speech → runtime).
 *
 * Every intent maps to something the runtime ALREADY does (an existing controller
 * method); adding voice adds no new machine events. Intents are voice-specific (a
 * fuzzy request that must be validated), so they live in the voice layer — the
 * controller exposes concrete methods instead, keeping it client-agnostic (C8).
 *
 * Two arms never touch state (`REQUEST_REPEAT`, `REQUEST_CLARIFICATION`): they're
 * conversational and handled by the adapter/assistant, not the machine.
 */

export type VoiceIntent =
  | { type: "CANDIDATE_RESPONSE"; text: string }
  | { type: "REQUEST_HINT" }
  | { type: "REQUEST_REPEAT" }
  | { type: "REQUEST_CLARIFICATION"; question: string }
  | { type: "NEXT_STEP" }
  | { type: "PREVIOUS_STEP" }
  | { type: "GO_TO_STEP"; index: number }
  | { type: "REQUEST_VERIFICATION" }
  | { type: "REQUEST_CHECKPOINT" }
  | { type: "FINISH_INTERVIEW" };

export type VoiceIntentType = VoiceIntent["type"];

export const VOICE_INTENT_TYPES: readonly VoiceIntentType[] = [
  "CANDIDATE_RESPONSE",
  "REQUEST_HINT",
  "REQUEST_REPEAT",
  "REQUEST_CLARIFICATION",
  "NEXT_STEP",
  "PREVIOUS_STEP",
  "GO_TO_STEP",
  "REQUEST_VERIFICATION",
  "REQUEST_CHECKPOINT",
  "FINISH_INTERVIEW",
];

const TYPE_SET = new Set<string>(VOICE_INTENT_TYPES);

/** Narrow an unknown value (e.g. a decoded provider payload) to a VoiceIntent. */
export function isVoiceIntent(value: unknown): value is VoiceIntent {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  if (typeof type !== "string" || !TYPE_SET.has(type)) return false;
  if (type === "CANDIDATE_RESPONSE") return typeof (value as { text?: unknown }).text === "string";
  if (type === "REQUEST_CLARIFICATION") return typeof (value as { question?: unknown }).question === "string";
  if (type === "GO_TO_STEP") return typeof (value as { index?: unknown }).index === "number";
  return true;
}
