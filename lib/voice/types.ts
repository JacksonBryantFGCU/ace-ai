/**
 * Convenience re-exports for the voice subsystem's public surface. Import site
 * sugar only — every type is defined in its owning module.
 */

export type { VoiceIntent, VoiceIntentType } from "@/lib/voice/intents";
export { isVoiceIntent, VOICE_INTENT_TYPES } from "@/lib/voice/intents";
export type {
  VoiceProvider,
  VoiceProviderEvent,
  VoiceSessionConfig,
  VoiceToolDefinition,
  VoiceStatus,
  VoicePersona,
} from "@/lib/voice/provider";
export type { VoiceClientDeps } from "@/lib/voice/adapter";
export { VoiceClient } from "@/lib/voice/adapter";
