/**
 * VoiceProvider — the provider-agnostic contract every speech backend implements
 * (Vapi first; OpenAI Realtime, LiveKit, Azure, ElevenLabs, custom WebRTC later).
 *
 * It defines its own NEUTRAL types and knows nothing about the runtime or about any
 * specific SDK. The only module allowed to import the Vapi SDK is the Vapi
 * implementation under `providers/vapi/**` (constraint C5/C6). The adapter talks to
 * this interface; swapping providers is a one-line change.
 */

import type { InterviewerVoice } from "@/lib/constants";
import type { VoiceIntent, VoiceIntentType } from "@/lib/voice/intents";

export type VoiceStatus = "idle" | "connecting" | "active" | "ended";

/** Persona = who the interviewer is + how they sound. Maps to a provider voice. */
export interface VoicePersona {
  id: string;
  displayName: string;
  /** Personality preamble prepended to the system prompt. */
  personality: string;
  voice: InterviewerVoice;
}

/**
 * A neutral tool the assistant may call to REQUEST a state change. This is how
 * voice "produces events" reliably: the assistant calls the tool and waits for the
 * runtime to confirm, rather than asserting it changed anything. The provider maps
 * these to its own function-calling format and maps incoming calls back to intents.
 */
export interface VoiceToolDefinition {
  name: string;
  description: string;
  intent: VoiceIntentType;
  /** JSON-schema-ish parameter descriptor (only tools that carry args need it). */
  parameters?: Record<string, unknown>;
}

/** Everything a provider needs to start a call — built by the adapter, no SDK types. */
export interface VoiceSessionConfig {
  systemPrompt: string;
  firstMessage: string;
  persona: VoicePersona;
  tools: VoiceToolDefinition[];
}

/** Neutral events a provider emits upward to the adapter. */
export type VoiceProviderEvent =
  | { type: "status"; status: VoiceStatus }
  | { type: "speech"; speaking: boolean }
  | { type: "listening"; listening: boolean }
  | { type: "volume"; level: number }
  | { type: "transcript"; role: "assistant" | "candidate"; text: string; final: boolean }
  | { type: "intent"; intent: VoiceIntent }
  | { type: "error"; message: string };

export interface VoiceProvider {
  start(config: VoiceSessionConfig): Promise<void>;
  stop(): Promise<void>;
  setMuted(muted: boolean): void;
  /** Inject interviewer speech (e.g. re-reading a prompt on request). */
  say(text: string): void;
  /** Inject a system/context message mid-call (what the interviewer just learned). */
  updateContext(message: string): void;
  /** Subscribe to provider events; returns an unsubscribe fn. */
  on(listener: (event: VoiceProviderEvent) => void): () => void;
}
