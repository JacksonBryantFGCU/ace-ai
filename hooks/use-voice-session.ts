"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createVoiceProvider } from "@/lib/voice/providers";
import { VoiceClient } from "@/lib/voice/adapter";
import { buildFirstMessage, buildInterviewerSystemPrompt } from "@/lib/voice/prompt/system-prompt";
import { resolvePersona } from "@/lib/voice/prompt/persona";
import { buildVoiceTools } from "@/lib/voice/prompt/tools";
import type { ConversationEntry } from "@/lib/scenarios/conversation";
import type { InterviewController } from "@/lib/scenarios/interview-controller";
import type { VoiceProvider, VoiceStatus } from "@/lib/voice/provider";

/**
 * React lifecycle for an OPTIONAL voice layer over a running interview. It builds a
 * `VoiceProvider` (Vapi by default) + a `VoiceClient` and connects them to the
 * shared `InterviewController` — the same controller the buttons use.
 *
 * The provider stays composition-swappable (`createProvider` is injectable for
 * tests). The client is attached exactly once, when the call goes active, and
 * detached on stop/unmount, so mount/unmount cycles never duplicate transcript or
 * tool-call handling and never leak listeners. Voice is additive: if `start()` is
 * never called, nothing here touches the interview.
 */
export interface UseVoiceSessionOptions {
  controller: InterviewController;
  onConversation?: (entry: ConversationEntry) => void;
  personaId?: string;
  /** Injectable provider factory (defaults to the real Vapi provider). */
  createProvider?: () => VoiceProvider;
  /** Start the call automatically on mount (so voice + the timer begin together). */
  autoStart?: boolean;
}

export function useVoiceSession({
  controller,
  onConversation,
  personaId,
  createProvider = createVoiceProvider,
  autoStart = false,
}: UseVoiceSessionOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const providerRef = useRef<VoiceProvider | null>(null);
  const clientRef = useRef<VoiceClient | null>(null);
  const offProviderRef = useRef<(() => void) | null>(null);
  const attachedRef = useRef(false);

  // Latest values, so the stable `start` closure never reads stale props. Written
  // in an effect (never during render) and seeded by the initial useRef values.
  const controllerRef = useRef(controller);
  const onConversationRef = useRef(onConversation);
  const personaRef = useRef(personaId);
  const createProviderRef = useRef(createProvider);
  useEffect(() => {
    controllerRef.current = controller;
    onConversationRef.current = onConversation;
    personaRef.current = personaId;
    createProviderRef.current = createProvider;
  });

  const teardown = useCallback(() => {
    attachedRef.current = false;
    clientRef.current?.detach();
    clientRef.current = null;
    offProviderRef.current?.();
    offProviderRef.current = null;
    const provider = providerRef.current;
    providerRef.current = null;
    void provider?.stop();
  }, []);

  const start = useCallback(async () => {
    if (providerRef.current) return; // already running — idempotent
    setError(null);

    const provider = createProviderRef.current();
    providerRef.current = provider;
    const client = new VoiceClient({
      provider,
      onConversation: (entry) => onConversationRef.current?.(entry),
    });
    clientRef.current = client;

    // UI-facing subscription (separate from the client's own). Attaching the client
    // only on "active" guarantees a single wiring and no context sends pre-call.
    offProviderRef.current = provider.on((event) => {
      switch (event.type) {
        case "status":
          setStatus(event.status);
          if (event.status === "active" && !attachedRef.current) {
            attachedRef.current = true;
            client.attach(controllerRef.current);
          }
          if (event.status === "ended" || event.status === "idle") {
            attachedRef.current = false;
            client.detach();
          }
          break;
        case "speech":
          setSpeaking(event.speaking);
          break;
        case "volume":
          setVolume(event.level);
          break;
        case "error":
          setError(event.message);
          break;
        default:
          break;
      }
    });

    const context = controllerRef.current.getContext();
    const persona = resolvePersona(personaRef.current);
    await provider.start({
      systemPrompt: buildInterviewerSystemPrompt(context, persona),
      firstMessage: buildFirstMessage(context),
      persona,
      tools: buildVoiceTools(),
    });
  }, []);

  const stop = useCallback(() => {
    teardown();
    setStatus("ended");
    setSpeaking(false);
  }, [teardown]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      providerRef.current?.setMuted(next);
      return next;
    });
  }, []);

  // Always tear down on unmount so the mic/WebRTC + all listeners are released.
  useEffect(() => () => teardown(), [teardown]);

  // Optionally start the moment we mount, so voice and the timer begin together
  // (no manual click). `start` is idempotent; if the browser blocks it (autoplay /
  // mic gesture policy) the session returns to `idle` and the dock's Start button
  // is the fallback. Runs once per mount (`start` is stable).
  useEffect(() => {
    if (autoStart) void start();
  }, [autoStart, start]);

  return { status, speaking, muted, volume, error, start, stop, toggleMute };
}

export type VoiceSessionApi = ReturnType<typeof useVoiceSession>;
