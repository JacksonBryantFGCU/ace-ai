import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import type { Scenario } from "@/lib/scenarios/schema";
import type { StepStatus } from "@/lib/scenarios/interview-machine";
import type { VerificationMode } from "@/lib/scenarios/verification";

export type VerificationIntent = "step" | "final";

export function resolveVerificationMode(
  scenario: Scenario,
  intent: VerificationIntent = "step",
): VerificationMode {
  const type = scenarioTypeOf(scenario);

  if (intent === "final") {
    if (type === "fullstack") return "scenario-final";
    if (type === "machine-learning") return "python-final";
    return "single-file";
  }

  if (scenario.verification?.mode) return scenario.verification.mode;
  if (type === "fullstack") return "scenario-step";
  if (type === "machine-learning") return "python-step";
  return "single-file";
}

export function canAdvanceAfterVerification(status: StepStatus): boolean {
  return status === "passed" || status === "checkpoint_applied";
}

export type PreviewPanelKind = "ml" | "standard";

/**
 * Which right-side preview panel the shell should render for a given
 * verification mode. Machine-learning scenarios (`python-step` / `python-final`)
 * get the notebook-style `MlNotebookPreviewPanel` — never the generic
 * Browser/API/Fullstack `PreviewPanel`, which would show confusing labels for a
 * script that has neither a browser nor an API. Every other mode
 * (backend/fullstack/frontend) is unaffected and keeps the standard panel.
 */
export function getPreviewPanelKind(mode: VerificationMode): PreviewPanelKind {
  return mode === "python-step" || mode === "python-final" ? "ml" : "standard";
}

