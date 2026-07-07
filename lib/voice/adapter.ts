/**
 * VoiceClient — the voice implementation of `InterviewClient`. It is the TRANSLATOR
 * and nothing more: runtime signals → interviewer narration, and provider events →
 * controller method calls. It holds NO authoritative interview state (only a cached
 * copy of the current step prompt, so "say that again" needs no round-trip).
 *
 * Framework-free and provider-injected, so it unit-tests with a fake provider + a
 * fake controller. Deleting this file leaves the runtime, controller, and button UI
 * untouched (constraint C8) — voice is one client among peers.
 */

import { buildContextUpdate as defaultBuildContextUpdate } from "@/lib/voice/prompt/context-update";
import { toolNameForIntent } from "@/lib/voice/prompt/tools";
import { signalEntry, toolCall, utterance } from "@/lib/scenarios/conversation";
import type { ConversationEntry } from "@/lib/scenarios/conversation";
import type {
  InterviewClient,
  InterviewController,
} from "@/lib/scenarios/interview-controller";
import type { RuntimeSignal } from "@/lib/scenarios/runtime-signal";
import type { VoiceIntent } from "@/lib/voice/intents";
import type { VoiceProvider, VoiceProviderEvent } from "@/lib/voice/provider";

export interface VoiceClientDeps {
  provider: VoiceProvider;
  /** Override the signal→narration mapper (defaults to the shared builder). */
  buildContextUpdate?: (signal: RuntimeSignal) => string | null;
  /** Optional sink for the rich conversation record (Phase 3 wires it to the result). */
  onConversation?: (entry: ConversationEntry) => void;
  /** Clock injection for deterministic tests. */
  now?: () => number;
}

export class VoiceClient implements InterviewClient {
  readonly id = "voice";

  private controller: InterviewController | null = null;
  private unsubscribeSignals: (() => void) | null = null;
  private unsubscribeProvider: (() => void) | null = null;
  /** Last narrated step prompt — powers REQUEST_REPEAT without touching state. */
  private lastStepPrompt = "";

  private readonly provider: VoiceProvider;
  private readonly buildUpdate: (signal: RuntimeSignal) => string | null;
  private readonly now: () => number;

  constructor(private readonly deps: VoiceClientDeps) {
    this.provider = deps.provider;
    this.buildUpdate = deps.buildContextUpdate ?? defaultBuildContextUpdate;
    this.now = deps.now ?? Date.now;
  }

  attach(controller: InterviewController): void {
    // Idempotent: a second attach must not leave the first subscription dangling
    // (that would double-dispatch every intent). Detach the old wiring first.
    if (this.controller) this.detach();
    this.controller = controller;
    this.unsubscribeSignals = controller.subscribe((signal) => this.onSignal(signal));
    this.unsubscribeProvider = this.provider.on((event) => this.onProviderEvent(event));
  }

  detach(): void {
    this.unsubscribeSignals?.();
    this.unsubscribeProvider?.();
    this.unsubscribeSignals = null;
    this.unsubscribeProvider = null;
    this.controller = null;
  }

  // ── runtime → interviewer ──────────────────────────────────────────────────
  private onSignal(signal: RuntimeSignal): void {
    if (signal.type === "STEP_STARTED") this.lastStepPrompt = signal.prompt;

    this.record(signalEntry(signal, this.now()));

    const update = this.buildUpdate(signal);
    if (update) this.provider.updateContext(update);
  }

  // ── candidate → runtime ────────────────────────────────────────────────────
  private onProviderEvent(event: VoiceProviderEvent): void {
    switch (event.type) {
      case "transcript":
        if (!event.final) return;
        this.record(
          utterance(event.role === "assistant" ? "interviewer" : "candidate", event.text, true, this.now()),
        );
        // The adapter (not the provider) owns turning a final candidate transcript
        // into a CANDIDATE_RESPONSE intent, so providers only emit tool-call intents.
        if (event.role === "candidate") this.dispatch({ type: "CANDIDATE_RESPONSE", text: event.text });
        return;
      case "intent":
        this.dispatch(event.intent);
        return;
      default:
        // status / speech / listening / volume / error are the hook/UI's concern.
        return;
    }
  }

  private dispatch(intent: VoiceIntent): void {
    const controller = this.controller;
    if (!controller) return;

    const tool = toolNameForIntent(intent.type);
    if (tool) this.record(toolCall(tool, intent.type, undefined, this.now()));

    switch (intent.type) {
      case "CANDIDATE_RESPONSE":
        controller.setResponse(intent.text);
        return;
      case "REQUEST_HINT":
        controller.revealHint();
        return;
      case "REQUEST_REPEAT":
        // Conversational — no state change. Re-read the cached prompt if we have one.
        if (this.lastStepPrompt) this.provider.say(this.lastStepPrompt);
        return;
      case "REQUEST_CLARIFICATION":
        // Conversational — the assistant answers from its context; nothing to dispatch.
        return;
      case "NEXT_STEP":
        controller.next();
        return;
      case "PREVIOUS_STEP":
        controller.prev();
        return;
      case "GO_TO_STEP":
        controller.goTo(intent.index);
        return;
      case "REQUEST_VERIFICATION":
        void controller.runVerification();
        return;
      case "REQUEST_CHECKPOINT":
        controller.offerCheckpoint();
        return;
      case "FINISH_INTERVIEW":
        controller.complete();
        return;
    }
  }

  private record(entry: ConversationEntry): void {
    this.deps.onConversation?.(entry);
  }
}
