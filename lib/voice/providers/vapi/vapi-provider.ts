/**
 * VapiVoiceProvider — the first `VoiceProvider` implementation, over the Vapi SDK.
 *
 * It is deliberately thin: it owns the call lifecycle (start/stop/mute/status),
 * fans Vapi events out as neutral `VoiceProviderEvent`s (speaking state, transcripts,
 * tool/function calls, errors), and injects speech/context. All Vapi-shape knowledge
 * lives in the pure `vapi-mapping` module and the `vapi-client` seam, so this class
 * has no `@vapi-ai/web` import and is unit-tested with a fake session.
 *
 * Scope (Phase 2): core lifecycle only. No reconnect, persistence, analytics, or
 * recording — those are later, additive concerns.
 */

import {
  createVapiSession,
  unlockAudio as defaultUnlockAudio,
  type VapiSession,
} from "@/lib/voice/providers/vapi/vapi-client";
import {
  extractErrorText,
  parseVapiMessage,
  toAssistantConfig,
} from "@/lib/voice/providers/vapi/vapi-mapping";
import type { VoiceIntentType } from "@/lib/voice/intents";
import type {
  VoiceProvider,
  VoiceProviderEvent,
  VoiceSessionConfig,
  VoiceStatus,
} from "@/lib/voice/provider";

export interface VapiVoiceProviderDeps {
  /** Injectable call seam (defaults to the real singleton) — tests pass a fake. */
  session?: VapiSession;
  /** Injectable audio unlock (defaults to the real one) — tests pass a no-op. */
  unlockAudio?: () => Promise<void>;
}

export class VapiVoiceProvider implements VoiceProvider {
  private readonly session: VapiSession;
  private readonly unlockAudio: () => Promise<void>;

  private readonly listeners = new Set<(event: VoiceProviderEvent) => void>();
  private unsubscribe: (() => void) | null = null;
  private intentByTool: ReadonlyMap<string, VoiceIntentType> = new Map();
  private status: VoiceStatus = "idle";

  constructor(deps: VapiVoiceProviderDeps = {}) {
    this.session = deps.session ?? createVapiSession();
    this.unlockAudio = deps.unlockAudio ?? defaultUnlockAudio;
  }

  async start(config: VoiceSessionConfig): Promise<void> {
    // Remember which tool name maps to which intent for this call's tool set.
    this.intentByTool = new Map(config.tools.map((tool) => [tool.name, tool.intent]));
    this.wireSession();
    this.setStatus("connecting");
    try {
      // Must run inside the user gesture that triggered start().
      await this.unlockAudio();
      await this.session.start(toAssistantConfig(config));
    } catch (error) {
      // Surface via the event stream (not a throw) so all clients handle it uniformly.
      this.emit({ type: "error", message: extractErrorText(error) });
      this.setStatus("idle");
    }
  }

  async stop(): Promise<void> {
    try {
      await this.session.stop();
    } catch {
      // Stopping an already-ended call is a no-op; ignore.
    }
    this.emit({ type: "speech", speaking: false });
    this.setStatus("ended");
    // Release the Vapi subscription so a discarded provider leaves no listeners.
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Subscribe to the call's events (idempotent — re-subscribing drops the old one). */
  private wireSession(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.session.subscribe({
      onCallStart: () => {
        this.setStatus("active");
        this.emit({ type: "listening", listening: true });
      },
      onCallEnd: () => {
        this.setStatus("ended");
        this.emit({ type: "speech", speaking: false });
      },
      onSpeechStart: () => this.emit({ type: "speech", speaking: true }),
      onSpeechEnd: () => this.emit({ type: "speech", speaking: false }),
      onVolume: (level) => this.emit({ type: "volume", level }),
      onMessage: (message) => {
        for (const event of parseVapiMessage(message, this.intentByTool)) this.emit(event);
      },
      onError: (error) => {
        this.emit({ type: "error", message: extractErrorText(error) });
        // A failed start leaves us "connecting" — return to idle so the caller can retry.
        if (this.status === "connecting") this.setStatus("idle");
      },
    });
  }

  setMuted(muted: boolean): void {
    this.session.setMuted(muted);
  }

  say(text: string): void {
    this.session.say(text);
  }

  updateContext(message: string): void {
    // Inject a system message and let the assistant react (e.g. read a hint aloud).
    this.session.send({
      type: "add-message",
      message: { role: "system", content: message },
      triggerResponseEnabled: true,
    });
  }

  on(listener: (event: VoiceProviderEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(status: VoiceStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.emit({ type: "status", status });
  }

  private emit(event: VoiceProviderEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
