import { useState } from "react";
import type { FormData } from "../../workspace/types";
import { validateAccountStep, validateWorkspaceStep } from "../../workspace/validation";

const DEFAULT_FORM_DATA: FormData = {
  fullName: "",
  email: "",
  companyName: "",
  teamSize: "",
  planType: "",
  billingEmail: "",
};

const STEPS = ["account", "workspace"] as const;
type StepId = (typeof STEPS)[number];

// Step 1 reference solution: Account and Workspace steps, with Next/Back
// navigation gated by per-step validation. `formData` is a single, fully
// controlled object — every field writes straight into it on every
// keystroke, so there's no separate "draft" that navigation could lose.
export function FormWizard() {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const step: StepId = STEPS[stepIndex];

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function validateCurrentStep(): string | null {
    if (step === "account") return validateAccountStep(formData);
    return validateWorkspaceStep(formData);
  }

  function goNext() {
    const message = validateCurrentStep();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div>
      <h2>{step === "account" ? "Account" : "Workspace"}</h2>

      {step === "account" && (
        <>
          <label>
            Full name
            <input
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              aria-label="Full name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              aria-label="Email"
            />
          </label>
        </>
      )}

      {step === "workspace" && (
        <>
          <label>
            Company name
            <input
              value={formData.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              aria-label="Company name"
            />
          </label>
          <label>
            Team size
            <input
              value={formData.teamSize}
              onChange={(e) => updateField("teamSize", e.target.value)}
              aria-label="Team size"
            />
          </label>
        </>
      )}

      {error && <p role="alert">{error}</p>}

      <div>
        <button onClick={goBack} disabled={stepIndex === 0}>
          Back
        </button>
        <button onClick={goNext}>Next</button>
      </div>
    </div>
  );
}
