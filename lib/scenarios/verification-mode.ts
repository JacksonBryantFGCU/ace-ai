import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import type { Scenario } from "@/lib/scenarios/schema";
import type { StepStatus } from "@/lib/scenarios/interview-machine";
import type { VerificationMode } from "@/lib/scenarios/verification";

export type VerificationIntent = "step" | "final";

export function resolveVerificationMode(
  scenario: Scenario,
  intent: VerificationIntent = "step",
): VerificationMode {
  if (intent === "final") {
    return scenarioTypeOf(scenario) === "fullstack" ? "scenario-final" : "single-file";
  }

  return scenario.verification?.mode ?? (scenarioTypeOf(scenario) === "fullstack" ? "scenario-step" : "single-file");
}

export function canAdvanceAfterVerification(status: StepStatus): boolean {
  return status === "passed" || status === "checkpoint_applied";
}

