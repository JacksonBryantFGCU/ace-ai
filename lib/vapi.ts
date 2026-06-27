import Vapi from "@vapi-ai/web";
import { getVapiPublicKey } from "@/config/env.public";

/**
 * Browser Vapi singleton. Ported from the legacy `lib/vapi.ts` (which read the
 * Vite env at module load). Here it's a **lazy** singleton so the module can be
 * imported without constructing the client until a browser island actually needs
 * it (avoids touching browser-only SDK internals during SSR).
 *
 * Only client components/hooks import this. The Vapi public key is `NEXT_PUBLIC_*`.
 */
let instance: Vapi | null = null;

export function getVapi(): Vapi {
  if (!instance) {
    instance = new Vapi(getVapiPublicKey());
  }
  return instance;
}

/** Assistant configuration accepted by `vapi.start` (version-robust typing). */
export type VapiAssistantConfig = Parameters<Vapi["start"]>[0];

/**
 * Unlock browser audio output for autoplay policies. Must be called from within a
 * user-gesture handler (e.g. the Start/Preview click). A single shared
 * AudioContext is reused and resumed — creating a new one per call leaks contexts
 * (browsers cap the number that can exist at once).
 */
let audioContext: AudioContext | null = null;

export async function unlockAudio(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();
}
