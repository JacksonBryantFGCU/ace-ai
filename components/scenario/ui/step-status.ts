import type { StatusTone } from "@/components/ui/status-badge";
import type { StepStatus } from "@/lib/scenarios/interview-machine";

/**
 * Single source of truth for how a step `status` is presented — label, badge tone,
 * and progress-bar color. Previously duplicated across the interview panel and the
 * progress bar; now every step-status surface reads from here.
 */

export function stepStatusLabel(status: StepStatus): string {
  switch (status) {
    case "passed":
      return "passed";
    case "failed":
      return "needs work";
    case "checkpoint_applied":
      return "checkpoint used";
    case "in_progress":
      return "in progress";
    default:
      return "not started";
  }
}

export function stepStatusTone(status: StepStatus): StatusTone {
  switch (status) {
    case "passed":
      return "success";
    case "failed":
      return "danger";
    case "checkpoint_applied":
      return "warning";
    case "in_progress":
      return "info";
    default:
      return "neutral";
  }
}

/** Solid fill for the segmented progress bar (distinct from the badge tint). */
export function stepBarClass(status: StepStatus, isCurrent: boolean): string {
  if (status === "passed") return "bg-green-500";
  if (status === "failed") return "bg-red-500";
  if (status === "checkpoint_applied") return "bg-amber-500";
  if (isCurrent || status === "in_progress") return "bg-blue-500";
  return "bg-white/15 hover:bg-white/25";
}
