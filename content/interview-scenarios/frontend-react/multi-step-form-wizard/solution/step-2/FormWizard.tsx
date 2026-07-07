import { useState } from "react";
import type { FormData, PlanType } from "../../workspace/types";
import { validateAccountStep, validateWorkspaceStep, validatePlanStep } from "../../workspace/validation";

const DEFAULT_FORM_DATA: FormData = {
  fullName: "",
  email: "",
  companyName: "",
  teamSize: "",
  planType: "",
  billingEmail: "",
};

const STEPS = ["account", "workspace", "plan", "review"] as const;
type StepId = (typeof STEPS)[number];

const PLAN_LABELS: Record<PlanType, string> = {
  starter: "Starter",
  team: "Team",
  enterprise: "Enterprise",
};

// Step 2 reference solution: adds the Plan step (with the Enterprise-only
// billing contact field) and the Review/Submit step.
//
// `selectPlan` clears `billingEmail` on every plan change, on the reasoning
// that a billing contact is only relevant to Enterprise and shouldn't linger
// once you leave it. That reasoning backfires: switching Enterprise -> Team
// -> Enterprise again wipes out a billing email the candidate already typed,
// even though they never left the Plan step. Step 3 fixes this.
export function FormWizard() {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<FormData | null>(null);
  const step: StepId = STEPS[stepIndex];

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function selectPlan(plan: PlanType) {
    setFormData((prev) => ({ ...prev, planType: plan, billingEmail: "" }));
  }

  function validateCurrentStep(): string | null {
    if (step === "account") return validateAccountStep(formData);
    if (step === "workspace") return validateWorkspaceStep(formData);
    if (step === "plan") return validatePlanStep(formData);
    return null;
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

  function handleSubmit() {
    const message = validateCurrentStep();
    if (message) {
      setError(message);
      return;
    }
    setSubmitted(formData);
  }

  if (submitted) {
    return <p role="status">Thanks, {submitted.fullName} — your workspace is being set up.</p>;
  }

  return (
    <div>
      <h2>{stepTitle(step)}</h2>

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

      {step === "plan" && (
        <>
          <fieldset>
            <legend>Plan</legend>
            {(Object.keys(PLAN_LABELS) as PlanType[]).map((plan) => (
              <label key={plan}>
                <input
                  type="radio"
                  name="planType"
                  checked={formData.planType === plan}
                  onChange={() => selectPlan(plan)}
                />
                {PLAN_LABELS[plan]}
              </label>
            ))}
          </fieldset>
          {formData.planType === "enterprise" && (
            <label>
              Billing contact email
              <input
                type="email"
                value={formData.billingEmail}
                onChange={(e) => updateField("billingEmail", e.target.value)}
                aria-label="Billing contact email"
              />
            </label>
          )}
        </>
      )}

      {step === "review" && (
        <dl>
          <dt>Name</dt>
          <dd>{formData.fullName}</dd>
          <dt>Email</dt>
          <dd>{formData.email}</dd>
          <dt>Company</dt>
          <dd>{formData.companyName}</dd>
          <dt>Team size</dt>
          <dd>{formData.teamSize}</dd>
          <dt>Plan</dt>
          <dd>{formData.planType ? PLAN_LABELS[formData.planType] : ""}</dd>
          {formData.planType === "enterprise" && (
            <>
              <dt>Billing contact</dt>
              <dd>{formData.billingEmail}</dd>
            </>
          )}
        </dl>
      )}

      {error && <p role="alert">{error}</p>}

      <div>
        <button onClick={goBack} disabled={stepIndex === 0}>
          Back
        </button>
        {step === "review" ? <button onClick={handleSubmit}>Submit</button> : <button onClick={goNext}>Next</button>}
      </div>
    </div>
  );
}

function stepTitle(step: StepId): string {
  switch (step) {
    case "account":
      return "Account";
    case "workspace":
      return "Workspace";
    case "plan":
      return "Plan";
    case "review":
      return "Review";
  }
}
