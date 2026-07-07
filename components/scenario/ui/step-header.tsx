import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { stepStatusLabel, stepStatusTone } from "@/components/scenario/ui/step-status";
import type { StepStatus } from "@/lib/scenarios/interview-machine";
import type { StepKind } from "@/lib/scenarios/schema";

/**
 * The current step's identity line: a prominent "Step X of N", the step kind, and
 * the live status. Makes "where am I" obvious at a glance.
 */
export function StepHeader({
  index,
  total,
  kind,
  status,
}: {
  index: number;
  total: number;
  kind: StepKind;
  status?: StepStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold text-white">
        Step {index + 1} <span className="font-normal text-gray-500">of {total}</span>
      </h2>
      <Badge className="text-[11px] capitalize">{kind}</Badge>
      {status ? <StatusBadge tone={stepStatusTone(status)}>{stepStatusLabel(status)}</StatusBadge> : null}
    </div>
  );
}
