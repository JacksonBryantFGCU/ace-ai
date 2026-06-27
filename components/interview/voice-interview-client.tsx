"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, X } from "lucide-react";
import { useVapiInterview } from "@/hooks/use-vapi-interview";
import { useKeyboardShortcuts, type ShortcutsMap } from "@/hooks/use-keyboard-shortcuts";
import { getVapi } from "@/lib/vapi";
import { getInterviewer } from "@/lib/constants";
import { titleCase } from "@/lib/format";
import { MicVisualizer } from "@/components/interview/mic-visualizer";
import { KeyboardShortcutsHelp } from "@/components/interview/keyboard-shortcuts-help";
import { Button } from "@/components/ui/button";
import type { Difficulty, VapiInterviewConfig } from "@/types/interview";

/** Total interview time by difficulty (seconds). Ported from the legacy panel. */
const INTERVIEW_TIMER: Record<Difficulty, number> = {
  easy: 1200, // 20 min
  medium: 1500, // 25 min
  hard: 1800, // 30 min
};

export function VoiceInterviewClient({ config }: { config: VapiInterviewConfig }) {
  const router = useRouter();
  const {
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
  } = useVapiInterview();

  const interviewer = getInterviewer(config.interviewer);
  const roleLabel = titleCase(config.role);
  const totalTime = INTERVIEW_TIMER[config.difficulty] ?? 1500;
  const [timeLeft, setTimeLeft] = useState(totalTime);

  const startedAtRef = useRef<number | null>(null);
  const navigatedRef = useRef(false);
  const warned2MinRef = useRef(false);
  const warned0MinRef = useRef(false);
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Record the call start time once, for duration metrics.
  useEffect(() => {
    if (status === "active" && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
  }, [status]);

  // Clear the pending auto-end timeout on unmount.
  useEffect(() => {
    return () => {
      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    };
  }, []);

  // Evaluate (once) and navigate to the persisted replay.
  const analyzeAndNavigate = async () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const completedAt = Date.now();
    const startedAt = startedAtRef.current ?? undefined;
    const evaluation = await evaluateTranscript(messages, config, {
      startedAt,
      completedAt,
      durationMs: startedAt ? completedAt - startedAt : undefined,
    });
    if (evaluation?.id) {
      router.push(`/interviews/${evaluation.id}`);
    } else {
      // Evaluation failed (error shown by the hook) — allow a retry.
      navigatedRef.current = false;
    }
  };

  const handleEnd = () => {
    stop();
    if (messages.length >= 2) {
      void analyzeAndNavigate();
    }
  };

  // Reset per-call state, then start — so a second interview in the same mount
  // (e.g. after ending early) begins with a fresh timer and warnings.
  const handleStart = () => {
    setTimeLeft(totalTime);
    startedAtRef.current = null;
    navigatedRef.current = false;
    warned2MinRef.current = false;
    warned0MinRef.current = false;
    void start(config);
  };

  // Keep refs to the latest handlers so the keyboard-shortcut map and timer
  // callbacks stay stable without resubscribing on every render.
  const handleEndRef = useRef(handleEnd);
  const handleStartRef = useRef(handleStart);
  const muteRef = useRef(toggleMute);
  useEffect(() => {
    handleEndRef.current = handleEnd;
    handleStartRef.current = handleStart;
    muteRef.current = toggleMute;
  });

  // When Vapi ends the call naturally, auto-evaluate.
  useEffect(() => {
    if (callEndedNaturally && messages.length >= 2 && !isAnalyzing) {
      void analyzeAndNavigate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callEndedNaturally]);

  // Countdown — ticks once per second while the call is active.
  useEffect(() => {
    if (status !== "active" || timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, status]);

  // Timer warnings — vapi.say() at 2 min, then auto-end with a goodbye at 0.
  useEffect(() => {
    if (status !== "active") return;
    if (timeLeft === 120 && !warned2MinRef.current) {
      warned2MinRef.current = true;
      try {
        getVapi().say("We're running low on time. Let's wrap up with one final question.");
      } catch {
        /* say is best-effort */
      }
    }
    if (timeLeft === 0 && !warned0MinRef.current) {
      warned0MinRef.current = true;
      try {
        getVapi().say(
          "That's all the time we have. Thanks for the interview. Let me put together your feedback.",
        );
      } catch {
        /* best-effort */
      }
      endTimeoutRef.current = setTimeout(() => handleEndRef.current(), 3000);
    }
  }, [timeLeft, status]);

  const shortcuts = useMemo<ShortcutsMap>(
    () => ({
      "ctrl+enter": {
        handler: () => handleStartRef.current(),
        description: "Start interview",
        label: "Ctrl+Enter",
        enabled: status === "idle" || status === "ended",
      },
      escape: {
        handler: () => {
          if (status === "active" && window.confirm("End the interview?")) handleEndRef.current();
        },
        description: "End interview",
        label: "Esc",
        enabled: status === "active",
      },
      m: {
        handler: () => muteRef.current(),
        description: "Toggle mute",
        label: "M",
        enabled: status === "active",
      },
      "ctrl+shift+m": {
        handler: () => muteRef.current(),
        description: "Toggle mute (global)",
        label: "Ctrl+Shift+M",
        enabled: status === "active",
        allowInInput: true,
      },
    }),
    [status],
  );
  useKeyboardShortcuts(shortcuts);

  const statusLabel = isAnalyzing
    ? "Analyzing your interview…"
    : isSpeaking
      ? "Interviewer is speaking…"
      : isListening
        ? "Listening to you…"
        : status === "connecting"
          ? "Connecting…"
          : status === "ended"
            ? "Interview ended"
            : "Ready to start";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const elapsed = totalTime - timeLeft;
  const progressPct = totalTime > 0 ? Math.min((elapsed / totalTime) * 100, 100) : 0;
  const timerColor =
    timeLeft <= 120
      ? "text-red-500 dark:text-red-400"
      : timeLeft <= 300
        ? "text-amber-500 dark:text-amber-400"
        : "text-foreground";
  const bannerText =
    status === "active" && timeLeft <= 120
      ? "Under 2 minutes remaining"
      : status === "active" && timeLeft <= 300
        ? "5 minutes remaining"
        : null;

  const chips = [
    roleLabel,
    titleCase(config.questionType),
    `${titleCase(config.difficulty)} difficulty`,
    titleCase(config.experience),
    `${titleCase(config.strictness)} strictness`,
  ];

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{roleLabel} interview</h1>
          <p className="text-muted-foreground text-sm">Voice assessment</p>
        </div>
        <div className={`font-mono text-2xl tabular-nums transition-colors ${timerColor}`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div
        role="progressbar"
        aria-label="Interview time elapsed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPct)}
        className="bg-muted h-1 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-all duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {bannerText ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          {bannerText}
        </div>
      ) : null}

      {/* Settings chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        {chips.map((chip) => (
          <span key={chip} className="border-border bg-muted rounded-full border px-3 py-1">
            {chip}
          </span>
        ))}
      </div>

      {/* Status bar */}
      <div className="border-border flex items-center gap-3 rounded-xl border px-4 py-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${status === "active" ? "animate-pulse bg-green-500" : "bg-muted-foreground"}`}
        />
        <span
          className="text-muted-foreground flex-1 text-sm font-medium"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusLabel}
        </span>
        <MicVisualizer
          volumeLevel={volumeLevel}
          isListening={isListening}
          isSpeaking={isSpeaking}
        />
      </div>

      {/* Participants */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-border flex flex-col items-center rounded-2xl border p-6">
          <p className="text-muted-foreground mb-4 text-sm">Interviewer</p>
          <div
            className={`mb-3 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${interviewer.gradient} ${isSpeaking ? "ring-primary ring-4" : ""}`}
          >
            <span className="text-4xl font-bold text-white">{interviewer.name.charAt(0)}</span>
          </div>
          <p className="font-semibold">{interviewer.name}</p>
          <p className="text-muted-foreground text-sm">{isSpeaking ? "Speaking…" : "Listening"}</p>
        </div>
        <div className="border-border flex flex-col items-center rounded-2xl border p-6">
          <p className="text-muted-foreground mb-4 text-sm">You</p>
          <div
            className={`mb-3 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 ${isListening ? "ring-4 ring-blue-500" : ""}`}
          >
            <span className="text-4xl font-bold text-white">U</span>
          </div>
          <p className="font-semibold">You</p>
          <p className="text-muted-foreground text-sm">
            {isListening ? "Your turn to speak" : "Waiting…"}
          </p>
        </div>
      </div>

      {/* Transcript */}
      <div className="border-border rounded-2xl border p-4">
        <p className="text-muted-foreground mb-3 text-sm">Live transcript</p>
        <div className="flex max-h-64 flex-col-reverse gap-3 overflow-y-auto">
          {messages.length === 0 && status !== "active" ? (
            <p className="text-muted-foreground text-sm">Click Start to begin the interview…</p>
          ) : null}
          {messages.length === 0 && status === "active" ? (
            <p className="text-muted-foreground animate-pulse text-sm">Waiting for interviewer…</p>
          ) : null}
          {messages.map((msg, i) => (
            <div key={`${msg.timestamp}-${i}`} className="flex gap-3 text-sm">
              <span
                className={`shrink-0 font-semibold ${msg.role === "assistant" ? "text-primary" : "text-cyan-600 dark:text-cyan-400"}`}
              >
                {msg.role === "assistant" ? interviewer.name : "You"}:
              </span>
              <p className="text-muted-foreground">{msg.text}</p>
            </div>
          ))}
        </div>
      </div>

      <KeyboardShortcutsHelp shortcuts={shortcuts} />

      {/* Controls */}
      <div className="flex justify-center gap-3 pb-2">
        {isAnalyzing ? (
          <div className="border-border text-muted-foreground flex items-center gap-3 rounded-full border px-6 py-3 text-sm">
            <span className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
            Analyzing your interview…
          </div>
        ) : status === "idle" || status === "ended" ? (
          <div className="flex flex-col items-center gap-3">
            {errorMessage ? (
              <p className="max-w-md text-center text-sm text-red-500 dark:text-red-400" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <Button size="lg" onClick={handleStart} className="gap-2 rounded-full">
              <Mic className="h-5 w-5" />
              Start interview
            </Button>
          </div>
        ) : status === "connecting" ? (
          <div className="border-border text-muted-foreground flex items-center gap-2 rounded-full border px-6 py-3 text-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            Connecting…
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              className="rounded-full"
            >
              {isMuted ? <MicOff className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button variant="destructive" onClick={handleEnd} className="gap-2 rounded-full">
              <X className="h-5 w-5" />
              End interview
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
