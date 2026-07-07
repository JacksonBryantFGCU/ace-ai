// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The default provider factory pulls in the Vapi SDK; this suite injects a fake, so
// stub the composition module to keep the SDK out of the test entirely.
vi.mock("@/lib/voice/providers", () => ({
  createVoiceProvider: () => {
    throw new Error("default provider must not be constructed in tests");
  },
}));

import { useVoiceSession } from "@/hooks/use-voice-session";
import type { ConversationEntry } from "@/lib/scenarios/conversation";
import type { InterviewController } from "@/lib/scenarios/interview-controller";
import type { VoiceProvider, VoiceProviderEvent, VoiceSessionConfig } from "@/lib/voice/provider";

class FakeProvider implements VoiceProvider {
  started: VoiceSessionConfig | null = null;
  stopped = false;
  muted: boolean | null = null;
  said: string[] = [];
  contexts: string[] = [];
  private listeners = new Set<(e: VoiceProviderEvent) => void>();

  async start(config: VoiceSessionConfig) {
    this.started = config;
  }
  async stop() {
    this.stopped = true;
  }
  setMuted(muted: boolean) {
    this.muted = muted;
  }
  say(text: string) {
    this.said.push(text);
  }
  updateContext(message: string) {
    this.contexts.push(message);
  }
  on(listener: (e: VoiceProviderEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(event: VoiceProviderEvent) {
    for (const listener of this.listeners) listener(event);
  }
  get listenerCount() {
    return this.listeners.size;
  }
}

function fakeController(calls: string[]): InterviewController {
  return {
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
}

function harness(options: { autoStart?: boolean } = {}) {
  const providers: FakeProvider[] = [];
  const createProvider = () => {
    const provider = new FakeProvider();
    providers.push(provider);
    return provider;
  };
  const calls: string[] = [];
  const conversation: ConversationEntry[] = [];
  const controller = fakeController(calls);
  const view = renderHook(() =>
    useVoiceSession({
      controller,
      onConversation: (e) => conversation.push(e),
      createProvider,
      ...options,
    }),
  );
  return { providers, calls, conversation, controller, ...view };
}

afterEach(() => vi.clearAllMocks());

describe("useVoiceSession — active call", () => {
  it("dispatches each provider event exactly once", async () => {
    const { result, providers, calls } = harness();
    await act(async () => {
      await result.current.start();
    });
    const provider = providers[0]!;
    act(() => provider.emit({ type: "status", status: "active" }));
    act(() => provider.emit({ type: "intent", intent: { type: "REQUEST_HINT" } }));
    act(() => provider.emit({ type: "transcript", role: "candidate", text: "my plan", final: true }));

    expect(calls).toEqual(["revealHint", "setResponse:my plan"]);
  });

  it("attaches once even if active fires repeatedly (no double dispatch)", async () => {
    const { result, providers, calls } = harness();
    await act(async () => {
      await result.current.start();
    });
    const provider = providers[0]!;
    act(() => provider.emit({ type: "status", status: "active" }));
    act(() => provider.emit({ type: "status", status: "active" }));
    act(() => provider.emit({ type: "intent", intent: { type: "NEXT_STEP" } }));

    expect(calls).toEqual(["next"]);
  });

  it("start() is idempotent — one provider per session", async () => {
    const { result, providers } = harness();
    await act(async () => {
      await result.current.start();
      await result.current.start();
    });
    expect(providers).toHaveLength(1);
  });
});

describe("useVoiceSession — autoStart", () => {
  it("starts the call on mount when autoStart is set", async () => {
    let providers: FakeProvider[] = [];
    await act(async () => {
      ({ providers } = harness({ autoStart: true }));
    });
    expect(providers).toHaveLength(1);
  });

  it("does not start on mount without autoStart", () => {
    const { providers } = harness();
    expect(providers).toHaveLength(0);
  });
});

describe("useVoiceSession — mount/unmount cleanup", () => {
  it("stops the provider and removes every listener on unmount", async () => {
    const { result, providers, unmount } = harness();
    await act(async () => {
      await result.current.start();
    });
    const provider = providers[0]!;
    act(() => provider.emit({ type: "status", status: "active" }));
    expect(provider.listenerCount).toBeGreaterThan(0);

    unmount();

    expect(provider.stopped).toBe(true);
    expect(provider.listenerCount).toBe(0);
  });

  it("does not duplicate transcript or tool events across unmount → remount", async () => {
    // First mount: run, then unmount.
    const first = harness();
    await act(async () => {
      await first.result.current.start();
    });
    const p1 = first.providers[0]!;
    act(() => p1.emit({ type: "status", status: "active" }));
    act(() => p1.emit({ type: "intent", intent: { type: "REQUEST_HINT" } }));
    first.unmount();

    // Events on the discarded provider are dead — no leaked handlers.
    act(() => p1.emit({ type: "intent", intent: { type: "NEXT_STEP" } }));
    act(() => p1.emit({ type: "transcript", role: "candidate", text: "ghost", final: true }));
    expect(first.calls).toEqual(["revealHint"]);

    // Fresh mount: a new, isolated session dispatches its own events once.
    const second = harness();
    await act(async () => {
      await second.result.current.start();
    });
    const p2 = second.providers[0]!;
    act(() => p2.emit({ type: "status", status: "active" }));
    act(() => p2.emit({ type: "intent", intent: { type: "REQUEST_HINT" } }));
    act(() => p2.emit({ type: "transcript", role: "candidate", text: "real", final: true }));

    expect(second.calls).toEqual(["revealHint", "setResponse:real"]);
    expect(p1.listenerCount).toBe(0);
  });
});

describe("useVoiceSession — controls", () => {
  it("mutes through the provider and tracks state", async () => {
    const { result, providers } = harness();
    await act(async () => {
      await result.current.start();
    });
    act(() => result.current.toggleMute());
    expect(providers[0]!.muted).toBe(true);
    expect(result.current.muted).toBe(true);
  });
});
