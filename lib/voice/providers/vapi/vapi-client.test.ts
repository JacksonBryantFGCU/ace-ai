import { describe, expect, it } from "vitest";
import Vapi from "@vapi-ai/web";
import { createVapiSession } from "@/lib/voice/providers/vapi/vapi-client";

/**
 * These tests pin the listener-accounting guarantees the provider relies on:
 * `subscribe` wires exactly the Vapi events we consume, and its returned
 * unsubscribe removes every one — so repeated wire/unwire cycles never accumulate.
 */

type Handler = (payload?: unknown) => void;

const VAPI_EVENTS = [
  "call-start",
  "call-end",
  "speech-start",
  "speech-end",
  "volume-level",
  "message",
  "error",
].sort();

class FakeVapiClient {
  private listeners = new Map<string, Set<Handler>>();
  started: unknown = null;
  stopped = 0;
  muted: boolean | null = null;
  said: string[] = [];
  sent: unknown[] = [];

  on(event: string, handler: Handler) {
    const set = this.listeners.get(event) ?? new Set<Handler>();
    set.add(handler);
    this.listeners.set(event, set);
    return this;
  }
  removeListener(event: string, handler: Handler) {
    this.listeners.get(event)?.delete(handler);
    return this;
  }
  async start(assistant: unknown) {
    this.started = assistant;
    return null;
  }
  async stop() {
    this.stopped += 1;
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

  totalListeners() {
    let total = 0;
    for (const set of this.listeners.values()) total += set.size;
    return total;
  }
  wiredEvents() {
    return [...this.listeners.entries()].filter(([, set]) => set.size > 0).map(([event]) => event).sort();
  }
  emit(event: string, payload?: unknown) {
    for (const handler of this.listeners.get(event) ?? []) handler(payload);
  }
}

function fakeClient() {
  const fake = new FakeVapiClient();
  return { fake, session: createVapiSession(fake as unknown as Vapi) };
}

describe("createVapiSession — listener accounting", () => {
  it("subscribe wires exactly the Vapi events we consume", () => {
    const { fake, session } = fakeClient();
    session.subscribe({});
    expect(fake.totalListeners()).toBe(VAPI_EVENTS.length);
    expect(fake.wiredEvents()).toEqual(VAPI_EVENTS);
  });

  it("unsubscribe removes every listener (net zero)", () => {
    const { fake, session } = fakeClient();
    const off = session.subscribe({});
    off();
    expect(fake.totalListeners()).toBe(0);
    expect(fake.wiredEvents()).toEqual([]);
  });

  it("does not accumulate across repeated subscribe/unsubscribe cycles", () => {
    const { fake, session } = fakeClient();
    for (let i = 0; i < 5; i += 1) {
      const off = session.subscribe({});
      expect(fake.totalListeners()).toBe(VAPI_EVENTS.length);
      off();
      expect(fake.totalListeners()).toBe(0);
    }
  });

  it("removes only its own listeners when two subscriptions overlap", () => {
    const { fake, session } = fakeClient();
    const off1 = session.subscribe({});
    const off2 = session.subscribe({});
    expect(fake.totalListeners()).toBe(VAPI_EVENTS.length * 2);
    off1();
    expect(fake.totalListeners()).toBe(VAPI_EVENTS.length);
    off2();
    expect(fake.totalListeners()).toBe(0);
  });
});

describe("createVapiSession — delegation & routing", () => {
  it("delegates start/stop/mute/say/send to the client", async () => {
    const { fake, session } = fakeClient();
    await session.start({ hello: "world" });
    await session.stop();
    session.setMuted(true);
    session.say("again");
    session.send({ type: "add-message" });
    expect(fake.started).toEqual({ hello: "world" });
    expect(fake.stopped).toBe(1);
    expect(fake.muted).toBe(true);
    expect(fake.said).toEqual(["again"]);
    expect(fake.sent).toEqual([{ type: "add-message" }]);
  });

  it("routes client events to the provided handlers", () => {
    const { fake, session } = fakeClient();
    const seen: string[] = [];
    session.subscribe({
      onCallStart: () => seen.push("call-start"),
      onVolume: (level) => seen.push(`volume:${level}`),
      onMessage: (m) => seen.push(`message:${JSON.stringify(m)}`),
    });
    fake.emit("call-start");
    fake.emit("volume-level", 0.25);
    fake.emit("message", { type: "transcript" });
    expect(seen).toEqual(["call-start", "volume:0.25", 'message:{"type":"transcript"}']);
  });
});
