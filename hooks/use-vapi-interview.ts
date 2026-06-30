"use client";

import { useEffect, useState } from "react";
import { getVapi, unlockAudio, type VapiAssistantConfig } from "@/lib/vapi";
import { evaluateInterview } from "@/actions/interview";
import type {
  CodeSubmission,
  TranscriptEntry,
  VapiAnalysisResult,
  VapiInterviewConfig,
} from "@/types/interview";

/**
 * Shared voice-interview lifecycle hook — ported from the legacy
 * `useVapiInterview` and generalized in Phase 5 so the behavioral and technical
 * islands share one implementation. The caller builds the Vapi assistant config
 * (via `lib/interview/assistant` + the relevant prompt module) and passes it to
 * `start()`; this hook owns the call lifecycle, transcript, mute/volume, and
 * evaluation (`evaluateInterview` Server Action → persists + returns the id).
 */

interface VapiTranscriptMessage {
  type: string;
  transcriptType?: string;
  role: "assistant" | "user";
  transcript: string;
}

interface VapiError {
  message?: string;
  code?: string;
  type?: string;
  // Vapi nests the reason under `error`, sometimes several levels deep and as an
  // object rather than a string — see getVapiErrorText.
  error?: unknown;
}

/** Pull a human-readable string out of a Vapi error (bare string, {message}, or nested). */
function getVapiErrorText(e: VapiError): string {
  const dig = (v: unknown): string | undefined => {
    if (typeof v === "string") return v.trim() || undefined;
    if (v && typeof v === "object" && "message" in v) {
      return dig((v as { message?: unknown }).message);
    }
    return undefined;
  };
  return dig(e.error) ?? e.message ?? "Could not connect to the interviewer. Please try again.";
}

export type CallStatus = "idle" | "connecting" | "active" | "ended";

/** Optional call metrics persisted alongside the interview. */
export interface CallMetrics {
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

export function useVapiInterview() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [callEndedNaturally, setCallEndedNaturally] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const vapi = getVapi();

    const onCallStart = () => {
      setStatus("active");
      setIsListening(true);
      setIsMuted(false);
      vapi.setMuted(false);
    };

    const onCallEnd = () => {
      setStatus("ended");
      setIsSpeaking(false);
      setIsListening(false);
      setCallEndedNaturally(true);
    };

    const onSpeechStart = () => {
      setIsSpeaking(true);
      setIsListening(false);
    };

    const onSpeechEnd = () => {
      setIsSpeaking(false);
      setIsListening(true);
    };

    const onError = (e: VapiError) => {
      console.error("Vapi error:", e);
      setErrorMessage(getVapiErrorText(e));
      // A failed start leaves us in "connecting" — return to idle so the user can
      // retry instead of being stuck on the spinner forever.
      setStatus((prev) => (prev === "connecting" ? "idle" : prev));
    };

    const onMessage = (msg: VapiTranscriptMessage | null) => {
      if (!msg) return;
      if (msg.type === "transcript" && msg.transcriptType === "final") {
        const entry: TranscriptEntry = { role: msg.role, text: msg.transcript, timestamp: Date.now() };
        setMessages((prev) => [...prev, entry]);
      }
    };

    const onVolumeLevel = (level: number) => setVolumeLevel(level);

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("message", onMessage);
    vapi.on("error", onError);
    vapi.on("volume-level", onVolumeLevel);

    return () => {
      vapi.removeListener("call-start", onCallStart);
      vapi.removeListener("call-end", onCallEnd);
      vapi.removeListener("speech-start", onSpeechStart);
      vapi.removeListener("speech-end", onSpeechEnd);
      vapi.removeListener("message", onMessage);
      vapi.removeListener("error", onError);
      vapi.removeListener("volume-level", onVolumeLevel);
      // Stop any in-progress call when the island unmounts (e.g. navigating
      // away), so the mic + WebRTC connection don't keep running in the
      // background. No-op if there's no active call.
      vapi.stop().catch(() => {});
    };
  }, []);

  const evaluateTranscript = async (
    transcript: TranscriptEntry[],
    config: VapiInterviewConfig,
    metrics?: CallMetrics,
    submissions?: CodeSubmission[],
  ): Promise<{ result: VapiAnalysisResult; id: string } | null> => {
    if (transcript.length < 2) {
      console.warn("Not enough messages to evaluate");
      return null;
    }
    setIsAnalyzing(true);
    try {
      const res = await evaluateInterview(transcript, config, metrics, submissions);
      if (!res.ok) {
        setErrorMessage(res.error);
        return null;
      }
      return { result: res.result, id: res.id };
    } catch (err) {
      console.error("Failed to evaluate transcript:", err);
      setErrorMessage("Failed to evaluate interview. Please try again.");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  /** Start a call with a prebuilt assistant config (caller owns prompt/voice). */
  const start = async (assistant: VapiAssistantConfig) => {
    try {
      setErrorMessage(null);
      setStatus("connecting");
      setMessages([]);
      setCallEndedNaturally(false);
      setIsMuted(false);

      // Unlock audio output — must happen inside the user-gesture handler.
      await unlockAudio();

      await getVapi().start(assistant);
    } catch (err) {
      console.error("Failed to start Vapi call:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not start the interview. Please try again.",
      );
      setStatus("idle");
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    getVapi().setMuted(next);
  };

  const stop = () => {
    void getVapi().stop();
    setStatus("ended");
    setIsSpeaking(false);
    setIsListening(false);
    setIsMuted(false);
  };

  return {
    status,
    isSpeaking,
    isListening,
    isMuted,
    volumeLevel,
    messages,
    isAnalyzing,
    callEndedNaturally,
    errorMessage,
    start,
    stop,
    toggleMute,
    evaluateTranscript,
  };
}
