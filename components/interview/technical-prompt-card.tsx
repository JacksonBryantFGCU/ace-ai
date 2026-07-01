"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Lightbulb, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CodingProblem } from "@/types/interview";

/** Left-panel problem statement + examples/constraints + gated prev/next nav. */
export function TechnicalPromptCard({
  problem,
  questionNumber,
  totalQuestions,
  passed,
  nextLocked,
  onPrev,
  onNext,
}: {
  problem: CodingProblem | null;
  questionNumber: number;
  totalQuestions: number;
  passed: boolean;
  nextLocked: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  // How many hints the candidate has chosen to reveal for the current problem.
  // Resets whenever the problem changes so hints don't leak across questions.
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    setRevealed(0);
  }, [problem?.id]);

  if (!problem) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-400">
        Preparing your problem…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Problem {questionNumber} of {totalQuestions}
        </span>
        {passed ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            <Check className="size-3" /> Passed
          </span>
        ) : null}
      </div>

      <h2 className="text-lg font-semibold text-white">{problem.title}</h2>
      <p className="text-sm leading-relaxed text-gray-300">{problem.description}</p>

      {problem.examples && problem.examples.length > 0 ? (
        <div className="space-y-2">
          {problem.examples.map((ex, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-black/20 p-2 font-mono text-xs text-gray-300">
              <p>Input: {ex.input}</p>
              <p>Output: {ex.output}</p>
              {ex.explanation ? <p className="text-gray-500">{ex.explanation}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {problem.constraints && problem.constraints.length > 0 ? (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-gray-400">
          {problem.constraints.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}

      {problem.hints && problem.hints.length > 0 ? (
        <div className="space-y-2">
          {problem.hints.slice(0, revealed).map((hint, i) => (
            <div
              key={i}
              className="flex gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-2.5 text-xs leading-relaxed text-amber-100"
            >
              <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden />
              <span>
                <span className="font-semibold">Hint {i + 1}:</span> {hint}
              </span>
            </div>
          ))}
          {revealed < problem.hints.length ? (
            <button
              type="button"
              onClick={() => setRevealed((n) => n + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-400/10"
            >
              <Lightbulb className="size-3.5" />
              {revealed === 0
                ? `Need a hint? (${problem.hints.length} available)`
                : `Show next hint (${problem.hints.length - revealed} left)`}
            </button>
          ) : (
            <p className="text-xs text-gray-500">All hints revealed.</p>
          )}
        </div>
      ) : null}

      <div className="mt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={questionNumber <= 1}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextLocked || questionNumber >= totalQuestions}
          title={nextLocked ? "Pass all tests to unlock the next problem" : undefined}
          className={cn(
            "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
            nextLocked
              ? "border border-white/10 text-gray-400"
              : "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
          )}
        >
          {nextLocked ? <Lock className="size-3.5" /> : null}
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
