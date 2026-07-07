import { describe, expect, it } from "vitest";
import { VoiceClient } from "@/lib/voice/adapter";
import type { ConversationEntry } from "@/lib/scenarios/conversation";
import type { InterviewContext, InterviewController } from "@/lib/scenarios/interview-controller";
import type { RuntimeSignal } from "@/lib/scenarios/runtime-signal";
import type { VoiceProvider, VoiceProviderEvent, VoiceSessionConfig } from "@/lib/voice/provider";

// ── Fakes ─────────────────────────────────────────────────────────────────────

class FakeProvider implements VoiceProvider {
  says: string[] = [];
  contexts: string[] = [];
  muted = false;
  started: VoiceSessionConfig | null = null;
  stopped = false;
  private listener: ((e: VoiceProviderEvent) => void) | null = null;

  async start(config: VoiceSessionConfig) {
    this.started = config;
  }
  async stop() {
    this.stopped = true;
  }
  setMuted(m: boolean) {
    this.muted = m;
  }
  say(text: string) {
    this.says.push(text);
  }
  updateContext(message: string) {
    this.contexts.push(message);
  }
  on(listener: (e: VoiceProviderEvent) => void) {
    this.listener = listener;
    return () => {
      if (this.listener === listener) this.listener = null;
    };
  }
  emit(event: VoiceProviderEvent) {
    this.listener?.(event);
  }
}

class FakeController implements InterviewController {
  calls: string[] = [];
  private listeners = new Set<(s: RuntimeSignal) => void>();

  revealHint() {
    this.calls.push("revealHint");
  }
  setResponse(text: string) {
    this.calls.push(`setResponse:${text}`);
  }
  async runVerification() {
    this.calls.push("runVerification");
  }
  offerCheckpoint() {
    this.calls.push("offerCheckpoint");
  }
  async confirmCheckpoint() {
    this.calls.push("confirmCheckpoint");
  }
  declineCheckpoint() {
    this.calls.push("declineCheckpoint");
  }
  next() {
    this.calls.push("next");
  }
  prev() {
    this.calls.push("prev");
  }
  goTo(index: number) {
    this.calls.push(`goTo:${index}`);
  }
  complete() {
    this.calls.push("complete");
  }
  subscribe(listener: (s: RuntimeSignal) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  getContext(): InterviewContext {
    return { scenario: { id: "x", title: "X", summary: "s", difficulty: "easy" }, step: null, latestVerification: null, phase: "in_progress" };
  }
  emit(signal: RuntimeSignal) {
    this.listeners.forEach((l) => l(signal));
  }
}

const STEP_STARTED: RuntimeSignal = {
  type: "STEP_STARTED",
  stepIndex: 0,
  total: 2,
  stepId: "a",
  kind: "implement",
  prompt: "Implement the filter",
  isFirst: true,
  isLast: false,
  hintsAvailable: 1,
  checkpointAvailable: false,
  restarted: false,
};

function setup() {
  const provider = new FakeProvider();
  const controller = new FakeController();
  const conversation: ConversationEntry[] = [];
  const client = new VoiceClient({ provider, onConversation: (e) => conversation.push(e), now: () => 1000 });
  client.attach(controller);
  return { provider, controller, conversation, client };
}

describe("VoiceClient — runtime → interviewer", () => {
  it("narrates a signal via provider.updateContext and records it", () => {
    const { provider, controller, conversation } = setup();
    controller.emit(STEP_STARTED);
    expect(provider.contexts).toHaveLength(1);
    expect(provider.contexts[0]).toContain("Implement the filter");
    expect(conversation.at(-1)).toMatchObject({ kind: "signal", at: 1000 });
  });

  it("does not narrate silent signals", () => {
    const { provider, controller } = setup();
    controller.emit({ type: "RESPONSE_RECORDED", stepId: "a", length: 3 });
    expect(provider.contexts).toHaveLength(0);
  });
});

describe("VoiceClient — candidate → runtime", () => {
  it("maps a tool-call intent to the matching controller method", () => {
    const { provider, controller, conversation } = setup();
    provider.emit({ type: "intent", intent: { type: "REQUEST_HINT" } });
    expect(controller.calls).toEqual(["revealHint"]);
    expect(conversation.at(-1)).toMatchObject({ kind: "tool-call", tool: "request_hint", intent: "REQUEST_HINT" });
  });

  it("runs verification and finishes on the right intents", () => {
    const { provider, controller } = setup();
    provider.emit({ type: "intent", intent: { type: "REQUEST_VERIFICATION" } });
    provider.emit({ type: "intent", intent: { type: "NEXT_STEP" } });
    provider.emit({ type: "intent", intent: { type: "FINISH_INTERVIEW" } });
    expect(controller.calls).toEqual(["runVerification", "next", "complete"]);
  });

  it("turns a final candidate transcript into setResponse + an utterance", () => {
    const { provider, controller, conversation } = setup();
    provider.emit({ type: "transcript", role: "candidate", text: "my answer", final: true });
    expect(controller.calls).toEqual(["setResponse:my answer"]);
    expect(conversation.some((e) => e.kind === "utterance" && e.role === "candidate")).toBe(true);
  });

  it("ignores non-final transcripts", () => {
    const { provider, controller } = setup();
    provider.emit({ type: "transcript", role: "candidate", text: "par", final: false });
    expect(controller.calls).toEqual([]);
  });

  it("re-reads the cached prompt on REQUEST_REPEAT without touching state", () => {
    const { provider, controller } = setup();
    controller.emit(STEP_STARTED); // caches the prompt
    provider.emit({ type: "intent", intent: { type: "REQUEST_REPEAT" } });
    expect(provider.says).toEqual(["Implement the filter"]);
    expect(controller.calls).toEqual([]); // no state change
  });

  it("treats clarification as conversational (no state change)", () => {
    const { provider, controller } = setup();
    provider.emit({ type: "intent", intent: { type: "REQUEST_CLARIFICATION", question: "what does it return?" } });
    expect(controller.calls).toEqual([]);
  });
});

describe("VoiceClient — lifecycle", () => {
  it("stops responding after detach", () => {
    const { provider, controller, client } = setup();
    client.detach();
    controller.emit(STEP_STARTED);
    provider.emit({ type: "intent", intent: { type: "REQUEST_HINT" } });
    expect(provider.contexts).toHaveLength(0);
    expect(controller.calls).toEqual([]);
  });

  it("does not double-dispatch when attached twice (idempotent attach)", () => {
    const { provider, controller, client } = setup(); // already attached once
    client.attach(controller); // second attach must drop the first wiring
    provider.emit({ type: "intent", intent: { type: "REQUEST_HINT" } });
    controller.emit(STEP_STARTED);
    expect(controller.calls).toEqual(["revealHint"]); // once, not twice
    expect(provider.contexts).toHaveLength(1); // narrated once, not twice
  });

  it("can re-attach after detach", () => {
    const { provider, controller, client } = setup();
    client.detach();
    client.attach(controller);
    provider.emit({ type: "intent", intent: { type: "NEXT_STEP" } });
    expect(controller.calls).toEqual(["next"]);
  });
});
