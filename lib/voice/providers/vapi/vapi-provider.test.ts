import { describe, expect, it } from "vitest";
import { VapiVoiceProvider } from "@/lib/voice/providers/vapi/vapi-provider";
import type { VapiHandlers, VapiSession } from "@/lib/voice/providers/vapi/vapi-client";
import { VoiceClient } from "@/lib/voice/adapter";
import { buildVoiceTools } from "@/lib/voice/prompt/tools";
import type { InterviewController } from "@/lib/scenarios/interview-controller";
import type { VoiceProviderEvent, VoiceSessionConfig, VoiceStatus } from "@/lib/voice/provider";

// ── Fake Vapi session (the injectable seam; no SDK involved) ────────────────────

class FakeSession implements VapiSession {
  started: unknown = null;
  stopped = false;
  muted: boolean | null = null;
  said: string[] = [];
  sent: unknown[] = [];
  startImpl: () => Promise<void> = async () => {};
  subscribeCount = 0;
  unsubscribeCount = 0;
  private handlers: VapiHandlers | null = null;

  async start(assistant: unknown) {
    this.started = assistant;
    await this.startImpl();
  }
  async stop() {
    this.stopped = true;
  }
  setMuted(muted: boolean) {
    this.muted = muted;
  }
  say(message: string) {
    this.said.push(message);
  }
  send(message: unknown) {
    this.sent.push(message);
  }
  subscribe(handlers: VapiHandlers) {
    this.subscribeCount += 1;
    this.handlers = handlers;
    return () => {
      this.unsubscribeCount += 1;
      this.handlers = null;
    };
  }

  get subscribed() {
    return this.handlers !== null;
  }
  /** Net live subscriptions — must never climb above 1 for a single provider. */
  get activeSubscriptions() {
    return this.subscribeCount - this.unsubscribeCount;
  }
  emit(fn: (h: VapiHandlers) => void) {
    if (this.handlers) fn(this.handlers);
  }
}

function makeConfig(): VoiceSessionConfig {
  return {
    systemPrompt: "system",
    firstMessage: "hi",
    persona: { id: "cassidy", displayName: "Cassidy", personality: "warm", voice: { provider: "11labs", voiceId: "v" } },
    tools: buildVoiceTools(),
  };
}

function setup() {
  const session = new FakeSession();
  const provider = new VapiVoiceProvider({ session, unlockAudio: async () => {} });
  const events: VoiceProviderEvent[] = [];
  provider.on((e) => events.push(e));
  return { session, provider, events };
}

const statuses = (events: VoiceProviderEvent[]): VoiceStatus[] =>
  events.filter((e): e is Extract<VoiceProviderEvent, { type: "status" }> => e.type === "status").map((e) => e.status);

describe("VapiVoiceProvider — start", () => {
  it("unlocks audio and starts the session with a tool-bearing assistant", async () => {
    let unlocked = false;
    const session = new FakeSession();
    const provider = new VapiVoiceProvider({ session, unlockAudio: async () => void (unlocked = true) });
    await provider.start(makeConfig());
    expect(unlocked).toBe(true);
    expect(session.subscribed).toBe(true);
    const started = session.started as { model: { tools: unknown[] } };
    expect(started.model.tools.length).toBe(buildVoiceTools().length);
  });

  it("goes connecting → active on call-start and emits listening", async () => {
    const { session, provider, events } = setup();
    await provider.start(makeConfig());
    expect(statuses(events)).toEqual(["connecting"]);
    session.emit((h) => h.onCallStart?.());
    expect(statuses(events)).toEqual(["connecting", "active"]);
    expect(events).toContainEqual({ type: "listening", listening: true });
  });

  it("reports a start failure as an error event and returns to idle", async () => {
    const session = new FakeSession();
    session.startImpl = async () => {
      throw new Error("no mic");
    };
    const provider = new VapiVoiceProvider({ session, unlockAudio: async () => {} });
    const events: VoiceProviderEvent[] = [];
    provider.on((e) => events.push(e));
    await provider.start(makeConfig());
    expect(events).toContainEqual({ type: "error", message: "no mic" });
    expect(statuses(events)).toEqual(["connecting", "idle"]);
  });
});

describe("VapiVoiceProvider — event fan-out", () => {
  it("maps speech, volume, transcript, and tool-call messages", async () => {
    const { session, provider, events } = setup();
    await provider.start(makeConfig());

    session.emit((h) => h.onSpeechStart?.());
    session.emit((h) => h.onSpeechEnd?.());
    session.emit((h) => h.onVolume?.(0.5));
    session.emit((h) => h.onMessage?.({ type: "transcript", role: "user", transcriptType: "final", transcript: "hello" }));
    session.emit((h) => h.onMessage?.({ type: "tool-calls", toolCallList: [{ function: { name: "request_hint" } }] }));

    expect(events).toContainEqual({ type: "speech", speaking: true });
    expect(events).toContainEqual({ type: "speech", speaking: false });
    expect(events).toContainEqual({ type: "volume", level: 0.5 });
    expect(events).toContainEqual({ type: "transcript", role: "candidate", text: "hello", final: true });
    expect(events).toContainEqual({ type: "intent", intent: { type: "REQUEST_HINT" } });
  });

  it("maps errors and drops connecting → idle", async () => {
    const { session, provider, events } = setup();
    await provider.start(makeConfig());
    session.emit((h) => h.onError?.({ message: "boom" }));
    expect(events).toContainEqual({ type: "error", message: "boom" });
    expect(statuses(events)).toEqual(["connecting", "idle"]);
  });
});

describe("VapiVoiceProvider — controls & teardown", () => {
  it("delegates mute, say, and updateContext (as a system add-message)", async () => {
    const { session, provider } = setup();
    await provider.start(makeConfig());
    provider.setMuted(true);
    provider.say("read this again");
    provider.updateContext("a hint was revealed");
    expect(session.muted).toBe(true);
    expect(session.said).toEqual(["read this again"]);
    expect(session.sent).toEqual([
      { type: "add-message", message: { role: "system", content: "a hint was revealed" }, triggerResponseEnabled: true },
    ]);
  });

  it("stops the session, ends, and unsubscribes from every event", async () => {
    const { session, provider, events } = setup();
    await provider.start(makeConfig());
    await provider.stop();
    expect(session.stopped).toBe(true);
    expect(session.subscribed).toBe(false);
    expect(session.unsubscribeCount).toBe(1);
    expect(session.activeSubscriptions).toBe(0);
    expect(statuses(events)).toEqual(["connecting", "ended"]);
  });

  it("stops notifying a removed listener", async () => {
    const { session, provider, events } = setup();
    const extra: VoiceProviderEvent[] = [];
    const off = provider.on((e) => extra.push(e));
    await provider.start(makeConfig());
    off();
    session.emit((h) => h.onSpeechStart?.());
    expect(extra).toHaveLength(1); // only the initial "connecting" status
    expect(events.length).toBeGreaterThan(extra.length);
  });
});

describe("VapiVoiceProvider — lifecycle cleanup", () => {
  it("does not accumulate subscriptions across repeated start → stop cycles", async () => {
    const { session, provider } = setup();
    for (let i = 0; i < 3; i += 1) {
      await provider.start(makeConfig());
      expect(session.subscribed).toBe(true);
      expect(session.activeSubscriptions).toBe(1);
      await provider.stop();
      expect(session.subscribed).toBe(false);
      expect(session.activeSubscriptions).toBe(0);
    }
    expect(session.subscribeCount).toBe(3);
    expect(session.unsubscribeCount).toBe(3);
  });

  it("re-starting without an explicit stop drops the previous subscription", async () => {
    const { session, provider } = setup();
    await provider.start(makeConfig());
    await provider.start(makeConfig());
    // wireSession unsubscribes the old wiring before subscribing the new one.
    expect(session.activeSubscriptions).toBe(1);
    expect(session.subscribeCount).toBe(2);
    expect(session.unsubscribeCount).toBe(1);
  });

  it("delivers no events after stop", async () => {
    const { session, provider, events } = setup();
    await provider.start(makeConfig());
    await provider.stop();
    const before = events.length;
    // The handler slot is cleared, so emitting is a no-op.
    session.emit((h) => h.onSpeechStart?.());
    session.emit((h) => h.onMessage?.({ type: "transcript", role: "user", transcriptType: "final", transcript: "x" }));
    expect(events.length).toBe(before);
  });
});

// ── The point of the abstraction: swapping providers is composition-only ───────

describe("provider swap", () => {
  it("drives the runtime through the adapter identically to the fake provider", async () => {
    const calls: string[] = [];
    const controller: InterviewController = {
      revealHint: () => calls.push("revealHint"),
      setResponse: (t) => calls.push(`setResponse:${t}`),
      runVerification: async () => void calls.push("runVerification"),
      offerCheckpoint: () => calls.push("offerCheckpoint"),
      confirmCheckpoint: async () => {},
      declineCheckpoint: () => {},
      next: () => calls.push("next"),
      prev: () => {},
      goTo: () => {},
      complete: () => {},
      subscribe: () => () => {},
      getContext: () => ({ scenario: { id: "x", title: "X", summary: "s", difficulty: "easy" }, step: null, latestVerification: null, phase: "in_progress" }),
    };

    // Only this line differs from the fake-provider path — everything downstream is identical.
    const session = new FakeSession();
    const provider = new VapiVoiceProvider({ session, unlockAudio: async () => {} });

    const client = new VoiceClient({ provider });
    client.attach(controller);
    await provider.start(makeConfig());

    session.emit((h) => h.onMessage?.({ type: "tool-calls", toolCallList: [{ function: { name: "run_verification" } }] }));
    session.emit((h) => h.onMessage?.({ type: "transcript", role: "user", transcriptType: "final", transcript: "my plan" }));

    expect(calls).toEqual(["runVerification", "setResponse:my plan"]);
  });
});
