"use client";

import { stepBarClass, stepStatusLabel } from "@/components/scenario/ui/step-status";
import type { StepStatus } from "@/lib/scenarios/interview-machine";

/**
 * The segmented interview progress bar. Each segment reflects a step's status and
 * doubles as a jump-to-step control. Presentational: it renders state and reports
 * selections; navigation itself is the controller's job.
 */
export function StepProgress({
  steps,
  currentIndex,
  onSelect,
}: {
  steps: { id: string; status: StepStatus }[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Interview progress">
      {steps.map((step, i) => (
        <li key={step.id} className="flex-1">
          <button
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === currentIndex ? "step" : undefined}
            aria-label={`Step ${i + 1}: ${stepStatusLabel(step.status)}`}
            className={`h-1.5 w-full rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none ${stepBarClass(
              step.status,
              i === currentIndex,
            )}`}
          />
        </li>
      ))}
    </ol>
  );
}
