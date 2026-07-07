"use client";

import { Lightbulb } from "lucide-react";

/**
 * Progressive hints: the revealed hints plus the reveal control and remaining
 * count. Renders nothing when the step has no authored hints. Presentational —
 * revealing is the controller's job; this only shows what's revealed so far.
 */
export function HintList({
  hints,
  revealed,
  onReveal,
}: {
  hints: string[];
  revealed: number;
  onReveal: () => void;
}) {
  if (hints.length === 0) return null;
  const canReveal = revealed < hints.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Hints</span>
        <span className="text-xs text-gray-500">
          {revealed} of {hints.length} revealed
        </span>
      </div>

      {revealed > 0 ? (
        <ul className="space-y-2">
          {hints.slice(0, revealed).map((hint, i) => (
            <li key={i} className="flex gap-2 rounded-md bg-amber-500/10 p-2 text-sm text-amber-100/90">
              <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={onReveal}
        disabled={!canReveal}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 px-3 py-1.5 text-sm text-amber-200 transition-colors hover:bg-amber-500/10 focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Lightbulb className="size-3.5" />
        {canReveal ? "Show a hint" : "No more hints"}
      </button>
    </div>
  );
}
