"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { useVapiInterview } from "@/hooks/use-vapi-interview";
import { useCodeExecution } from "@/hooks/use-code-execution";
import { useInterviewTimer } from "@/hooks/use-interview-timer";
import { useKeyboardShortcuts, type ShortcutsMap } from "@/hooks/use-keyboard-shortcuts";
import { getVapi } from "@/lib/vapi";
import { getInterviewer, ROLE_LABELS } from "@/lib/constants";
import { LANGUAGES } from "@/lib/languages";
import { buildAssistant } from "@/lib/interview/assistant";
import { buildTechnicalFirstMessage, buildTechnicalSystemPrompt } from "@/lib/prompts/technical";
import { preloadPyodide } from "@/lib/code-exec/pyodide";
import { titleCase } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TechnicalToolbar } from "@/components/interview/technical-toolbar";
import { TechnicalPromptCard } from "@/components/interview/technical-prompt-card";
import { TechnicalChatPanel } from "@/components/interview/technical-chat-panel";
import { CodePanel } from "@/components/interview/code-panel";
import { KeyboardShortcutsHelp } from "@/components/interview/keyboard-shortcuts-help";
import type { CodingProblem, Difficulty, ProgrammingLanguage, VapiInterviewConfig } from "@/types/interview";

/** Total interview time by difficulty (seconds). */
const INTERVIEW_TIMER: Record<Difficulty, number> = { easy: 1200, medium: 1500, hard: 1800 };

function isEditorFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.closest(".monaco-editor") !== null || el.tagName === "TEXTAREA";
}

export function TechnicalInterviewClient({
  problems,
  config,
}: {
  problems: CodingProblem[];
  config: VapiInterviewConfig;
}) {
  const router = useRouter();
  const language: ProgrammingLanguage = config.language ?? "javascript";
  const interviewer = getInterviewer(config.interviewer);
  const roleLabel = ROLE_LABELS[config.role] ?? titleCase(config.role);
  const totalTime = INTERVIEW_TIMER[config.difficulty] ?? 1500;

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
  const { running, results, run, reset: resetResults } = useCodeExecution();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [code, setCode] = useState<Record<number, string>>({});
  const [passed, setPassed] = useState<boolean[]>(() => problems.map(() => false));

  const startedAtRef = useRef<number | null>(null);
  const navigatedRef = useRef(false);
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentProblem = problems[currentIndex] ?? null;
  const currentCode = code[currentIndex] ?? currentProblem?.starterCode?.[language] ?? "";

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    if (evaluation?.id) router.push(`/interviews/${evaluation.id}`);
    else navigatedRef.current = false;
  };

  const handleEnd = () => {
    stop();
    if (messages.length >= 2) void analyzeAndNavigate();
  };

  const handleRun = async () => {
    if (!currentProblem) return;
    const r = await run(language, currentCode, currentProblem);
    if (r.length > 0 && r.every((t) => t.passed)) {
      setPassed((prev) => {
        const next = [...prev];
        next[currentIndex] = true;
        return next;
      });
    }
  };

  // Stable handler refs for timer + keyboard callbacks (avoids resubscribing).
  const handleEndRef = useRef(handleEnd);
  const handleRunRef = useRef(handleRun);
  const muteRef = useRef(toggleMute);
  useEffect(() => {
    handleEndRef.current = handleEnd;
    handleRunRef.current = handleRun;
    muteRef.current = toggleMute;
  });

  const timer = useInterviewTimer({
    totalSeconds: totalTime,
    active: status === "active",
    onWarning: () => {
      try {
        getVapi().say(
          "We've got about two minutes left. Can you walk me through your current solution and explain your approach?",
        );
      } catch {
        /* best-effort */
      }
    },
    onTimeUp: () => {
      try {
        getVapi().say("Time's up. Let's go over what you've got. Thanks for working through this.");
      } catch {
        /* best-effort */
      }
      endTimeoutRef.current = setTimeout(() => handleEndRef.current(), 3000);
    },
  });

  const handleStart = () => {
    startedAtRef.current = null;
    navigatedRef.current = false;
    timer.reset();
    const questions = problems.map((p) => p.description);
    const assistant = buildAssistant({
      systemPrompt: buildTechnicalSystemPrompt(config, interviewer.personality, questions),
      firstMessage: buildTechnicalFirstMessage(questions),
      voice: interviewer.voice,
    });
    void start(assistant);
  };

  const goTo = (index: number) => {
    resetResults();
    setCurrentIndex(index);
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  // Warm Pyodide in the background when Python is the language.
  useEffect(() => {
    if (language === "python") preloadPyodide();
  }, [language]);

  // Record call start time once, for duration metrics.
  useEffect(() => {
    if (status === "active" && startedAtRef.current === null) startedAtRef.current = Date.now();
  }, [status]);

  // Clear the pending auto-end timeout on unmount.
  useEffect(() => {
    return () => {
      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    };
  }, []);

  // Auto-evaluate when the call ends naturally.
  useEffect(() => {
    if (callEndedNaturally && messages.length >= 2 && !isAnalyzing) void analyzeAndNavigate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callEndedNaturally]);

  const shortcuts = useMemo<ShortcutsMap>(
    () => ({
      "ctrl+enter": {
        handler: () => void handleRunRef.current(),
        description: "Run tests",
        label: "Ctrl+Enter",
        enabled: status === "active",
        allowInInput: true,
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
        handler: () => {
          if (!isEditorFocused()) muteRef.current();
        },
        description: "Toggle mute (when editor not focused)",
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

  // ── Pre-call / analyzing screens ──────────────────────────────────────────
  if (isAnalyzing) {
    return (
      <CenterScreen>
        <span className="mb-4 size-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
        <p className="text-lg font-medium text-gray-300">Analyzing your interview…</p>
        <p className="mt-2 text-sm text-gray-500">This may take a moment</p>
      </CenterScreen>
    );
  }

  if (status === "idle" || status === "ended") {
    return (
      <CenterScreen>
        <h1 className="text-2xl font-bold text-white">Technical Interview</h1>
        <p className="mt-2 text-gray-400">
          {roleLabel} · {titleCase(config.difficulty)} · {titleCase(config.experience)} ·{" "}
          {LANGUAGES[language]?.label ?? language}
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm text-gray-500">
          You&apos;ll solve {problems.length} coding problems in {totalTime / 60} minutes. Pass all
          tests to advance. Your AI interviewer will guide you through each one.
        </p>
        {errorMessage ? (
          <p className="mx-auto mt-4 max-w-md text-sm text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button variant="brand" size="lg" onClick={handleStart} className="mt-8 gap-2 rounded-full px-8">
          <Mic className="size-5" /> Start Interview
        </Button>
      </CenterScreen>
    );
  }

  if (status === "connecting") {
    return (
      <CenterScreen>
        <span className="mb-4 size-12 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
        <p className="text-lg font-medium text-gray-300">Connecting to interviewer…</p>
      </CenterScreen>
    );
  }

  // ── Active split layout ───────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <TechnicalToolbar
        roleLabel={roleLabel}
        difficulty={config.difficulty}
        level={config.experience}
        languageLabel={LANGUAGES[language]?.label ?? language}
        questionNumber={currentIndex + 1}
        totalQuestions={problems.length}
        timeLeft={timer.timeLeft}
        totalTime={totalTime}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onEnd={handleEnd}
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="flex min-h-0 flex-col gap-4">
          <TechnicalPromptCard
            problem={currentProblem}
            questionNumber={currentIndex + 1}
            totalQuestions={problems.length}
            passed={passed[currentIndex] ?? false}
            nextLocked={!passed[currentIndex]}
            onPrev={() => goTo(Math.max(0, currentIndex - 1))}
            onNext={() => goTo(Math.min(problems.length - 1, currentIndex + 1))}
          />
          <div className="min-h-0 flex-1">
            <TechnicalChatPanel
              messages={messages}
              status={status}
              isSpeaking={isSpeaking}
              isListening={isListening}
              volumeLevel={volumeLevel}
              interviewerName={interviewer.name}
            />
          </div>
        </div>

        <CodePanel
          language={language}
          code={currentCode}
          onChange={(value) => setCode((prev) => ({ ...prev, [currentIndex]: value }))}
          onRun={() => void handleRun()}
          running={running}
          results={results}
          disabled={!currentProblem}
        />
      </div>

      <KeyboardShortcutsHelp shortcuts={shortcuts} />
    </div>
  );
}

function CenterScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">{children}</div>
  );
}
