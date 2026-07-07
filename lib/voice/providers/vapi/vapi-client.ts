import Vapi from "@vapi-ai/web";
import { getVapiPublicKey } from "@/config/env.public";

/**
 * The ONE place the Vapi SDK is imported in the voice subsystem (constraint
 * C5/C6). It owns the browser singleton + audio unlock and normalizes Vapi's
 * EventEmitter surface into a small, fully-typed `VapiSession` seam so the provider
 * never touches SDK event overloads and can be unit-tested with a fake session.
 *
 * Self-contained on purpose: it does NOT reuse the legacy `lib/vapi.ts` (which the
 * behavioral islands use), so the scenario voice provider's Vapi coupling stays
 * inside `providers/vapi/**` and swapping providers changes only composition.
 */

/** Assistant config accepted by `vapi.start` (version-robust; not hand-modeled). */
export type VapiAssistantConfig = Parameters<Vapi["start"]>[0];

let instance: Vapi | null = null;

function getVapiClient(): Vapi {
  if (!instance) instance = new Vapi(getVapiPublicKey());
  return instance;
}

/**
 * Unlock browser audio output for autoplay policies. Must be called from within a
 * user-gesture handler (e.g. the Start click). A single shared AudioContext is
 * reused and resumed — creating one per call leaks contexts.
 */
let audioContext: AudioContext | null = null;

export async function unlockAudio(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();
}

/** Normalized, provider-internal handlers for the Vapi events we consume. */
export interface VapiHandlers {
  onCallStart?(): void;
  onCallEnd?(): void;
  onSpeechStart?(): void;
  onSpeechEnd?(): void;
  onVolume?(level: number): void;
  onMessage?(message: unknown): void;
  onError?(error: unknown): void;
}

/**
 * The provider's view of a Vapi call — just the lifecycle we use. The real
 * implementation wraps the singleton; tests inject a fake. This is an internal seam
 * (NOT part of the public `VoiceProvider` interface).
 */
export interface VapiSession {
  start(assistant: unknown): Promise<void>;
  stop(): Promise<void>;
  setMuted(muted: boolean): void;
  say(message: string): void;
  send(message: unknown): void;
  /** Wire the handlers to the call; returns an unsubscribe fn. */
  subscribe(handlers: VapiHandlers): () => void;
}

/** Build a `VapiSession` around the real browser singleton (or an injected client). */
export function createVapiSession(client: Vapi = getVapiClient()): VapiSession {
  return {
    async start(assistant: unknown) {
      await client.start(assistant as Parameters<Vapi["start"]>[0]);
    },
    async stop() {
      await client.stop();
    },
    setMuted(muted: boolean) {
      client.setMuted(muted);
    },
    say(message: string) {
      client.say(message);
    },
    send(message: unknown) {
      client.send(message as Parameters<Vapi["send"]>[0]);
    },
    subscribe(handlers: VapiHandlers) {
      const onCallStart = () => handlers.onCallStart?.();
      const onCallEnd = () => handlers.onCallEnd?.();
      const onSpeechStart = () => handlers.onSpeechStart?.();
      const onSpeechEnd = () => handlers.onSpeechEnd?.();
      const onVolume = (level: number) => handlers.onVolume?.(level);
      const onMessage = (message: unknown) => handlers.onMessage?.(message);
      const onError = (error: unknown) => handlers.onError?.(error);

      client.on("call-start", onCallStart);
      client.on("call-end", onCallEnd);
      client.on("speech-start", onSpeechStart);
      client.on("speech-end", onSpeechEnd);
      client.on("volume-level", onVolume);
      client.on("message", onMessage);
      client.on("error", onError);

      return () => {
        client.removeListener("call-start", onCallStart);
        client.removeListener("call-end", onCallEnd);
        client.removeListener("speech-start", onSpeechStart);
        client.removeListener("speech-end", onSpeechEnd);
        client.removeListener("volume-level", onVolume);
        client.removeListener("message", onMessage);
        client.removeListener("error", onError);
      };
    },
  };
}
