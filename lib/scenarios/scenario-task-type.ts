import { STEP_KINDS, type Scenario } from "@/lib/scenarios/schema";

export type StepKind = (typeof STEP_KINDS)[number];

export interface ScenarioTaskTypeMetadata {
  taskType?: string;
  steps: readonly { kind: string }[];
}

function normalizeKind(value: string | undefined): StepKind | null {
  const normalized = value?.trim().toLowerCase();
  return (STEP_KINDS as readonly string[]).includes(normalized ?? "") ? (normalized as StepKind) : null;
}

/**
 * Scenario-level "dominant activity" task type. An explicit `taskType` wins;
 * otherwise it's derived as the most frequent `steps[].kind`, tie-broken by
 * first occurrence. Scenarios authored before this field existed (all of
 * them, as of this writing) fall through to derivation, so nothing needs to
 * be backfilled in content.
 */
export function scenarioTaskTypeOf(input: Scenario | ScenarioTaskTypeMetadata): StepKind {
  const explicit = normalizeKind(input.taskType);
  if (explicit) return explicit;

  const counts = new Map<StepKind, number>();
  const order: StepKind[] = [];
  for (const step of input.steps) {
    const kind = normalizeKind(step.kind);
    if (!kind) continue;
    if (!counts.has(kind)) order.push(kind);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }

  let best: StepKind = "implement";
  let bestCount = -1;
  for (const kind of order) {
    const count = counts.get(kind) ?? 0;
    if (count > bestCount) {
      best = kind;
      bestCount = count;
    }
  }
  return best;
}
