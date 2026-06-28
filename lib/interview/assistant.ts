import type { VapiAssistantConfig } from "@/lib/vapi";
import type { InterviewerVoice } from "@/lib/constants";

/**
 * Build the inline Vapi assistant configuration shared by every interview type.
 * Only the system prompt, first message, and voice differ between behavioral and
 * technical interviews — the model/transcriber/denoising boilerplate is identical
 * and lives here so both islands stay in sync.
 */
export function buildAssistant({
  systemPrompt,
  firstMessage,
  voice,
}: {
  systemPrompt: string;
  firstMessage: string;
  voice: InterviewerVoice;
}): VapiAssistantConfig {
  return {
    model: {
      provider: "openai",
      model: "gpt-4.1",
      messages: [{ role: "system", content: systemPrompt }],
    },
    voice,
    transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
    firstMessage,
    backgroundSpeechDenoisingPlan: {
      smartDenoisingPlan: { enabled: true },
    },
  } as unknown as VapiAssistantConfig;
}
