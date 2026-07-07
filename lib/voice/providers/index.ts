/**
 * Provider composition seam. Clients construct their `VoiceProvider` through this
 * factory, so swapping the backend (Vapi → OpenAI Realtime → a fake for tests) is a
 * ONE-LINE change here and nowhere else — nothing downstream references a concrete
 * provider type (constraint C6).
 */

import { VapiVoiceProvider } from "@/lib/voice/providers/vapi/vapi-provider";
import type { VoiceProvider } from "@/lib/voice/provider";

export { VapiVoiceProvider } from "@/lib/voice/providers/vapi/vapi-provider";

/** The default voice provider for the scenario interview. */
export function createVoiceProvider(): VoiceProvider {
  return new VapiVoiceProvider();
}
