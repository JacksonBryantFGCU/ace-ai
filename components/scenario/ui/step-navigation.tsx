"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Previous / Next (or Finish on the last step) for the interviewer panel. Pinned to
 * the bottom of the panel. Presentational: it reports intent; advancing is the
 * controller's job.
 */
export function StepNavigation({
  canPrev,
  isLast,
  disableNext,
  onPrev,
  onNext,
}: {
  canPrev: boolean;
  isLast: boolean;
  disableNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="size-4" /> Prev
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext}
        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLast ? "Finish" : "Next"} <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
