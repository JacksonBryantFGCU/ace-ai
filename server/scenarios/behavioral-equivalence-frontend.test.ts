import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadScenario } from "@/server/scenarios/load";
import { verifyStepOnServer } from "@/server/scenarios/verification-service";
import type { SnapshotFile } from "@/lib/scenarios/verification";

/**
 * Proves that verification for `multi-step-form-wizard` (a component-harness
 * scenario) is behavioral — it asserts accessible roles/labels/text and
 * observable outcomes, not DOM structure or internal state shape — by running
 * two REAL alternative `FormWizard.tsx` implementations through the actual
 * production verification pipeline (`verifyStepOnServer`, no mocks):
 *
 *  - an alt-passing candidate that is accessibly/behaviorally equivalent to
 *    the `solution/step-2` reference but is restructured throughout: a
 *    `useReducer` instead of multiple `useState` calls, four decomposed
 *    sub-components instead of inline conditional JSX, `htmlFor`/`id` label
 *    association instead of nested `aria-label` inputs, an array of
 *    `{value, label}` plan options instead of a `Record` lookup, a `<ul>`
 *    review list instead of a `<dl>`, and renamed helpers throughout.
 *  - a structurally-similar-to-reference candidate that skips calling
 *    `validatePlanStep` for the Plan step, so Enterprise's billing-email
 *    requirement is silently never enforced.
 *
 * Step 2's declared tests are tests/step-1.test.tsx + tests/step-2.test.tsx.
 */
const SLUG = "multi-step-form-wizard";
const STEP_ID = "add-plan-and-review";
const ROOT = join(process.cwd(), "content", "interview-scenarios", "frontend-react", SLUG);
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const componentStep = { id: STEP_ID, harness: "component" as const, functionName: "FormWizard" };

function workspaceFiles(formWizardSource: string): SnapshotFile[] {
  return [
    { path: "FormWizard.tsx", content: formWizardSource, role: "edit" },
    { path: "validation.ts", content: read("workspace/validation.ts"), role: "readonly" },
    { path: "types.ts", content: read("workspace/types.ts"), role: "readonly" },
  ];
}

// --- Alt-passing candidate --------------------------------------------------
// Behaviorally/accessibly equivalent to solution/step-2/FormWizard.tsx, but
// deliberately restructured: useReducer instead of useState, decomposed
// sub-components, htmlFor/id labels, an options array instead of a lookup
// record, a <ul> review list instead of a <dl>, and renamed helpers.
const ALT_PASSING_FORM_WIZARD = `
import { useReducer } from "react";
import type { FormData, PlanType } from "./types";
import { validateAccountStep, validateWorkspaceStep, validatePlanStep } from "./validation";

const EMPTY_DATA: FormData = {
  fullName: "",
  email: "",
  companyName: "",
  teamSize: "",
  planType: "",
  billingEmail: "",
};

const PAGES = ["account", "workspace", "plan", "review"] as const;
type Page = (typeof PAGES)[number];

const PLAN_OPTIONS: Array<{ value: PlanType; label: string }> = [
  { value: "starter", label: "Starter" },
  { value: "team", label: "Team" },
  { value: "enterprise", label: "Enterprise" },
];

interface WizardState {
  data: FormData;
  pageIndex: number;
  errorMessage: string | null;
  confirmedData: FormData | null;
}

type WizardAction =
  | { type: "field"; key: keyof FormData; value: string }
  | { type: "plan"; plan: PlanType }
  | { type: "advance" }
  | { type: "retreat" }
  | { type: "invalid"; message: string }
  | { type: "confirm" };

const initialState: WizardState = {
  data: EMPTY_DATA,
  pageIndex: 0,
  errorMessage: null,
  confirmedData: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "field":
      return { ...state, data: { ...state.data, [action.key]: action.value } };
    case "plan":
      return { ...state, data: { ...state.data, planType: action.plan } };
    case "advance":
      return { ...state, errorMessage: null, pageIndex: Math.min(state.pageIndex + 1, PAGES.length - 1) };
    case "retreat":
      return { ...state, errorMessage: null, pageIndex: Math.max(state.pageIndex - 1, 0) };
    case "invalid":
      return { ...state, errorMessage: action.message };
    case "confirm":
      return { ...state, confirmedData: state.data };
    default:
      return state;
  }
}

function runValidatorFor(page: Page, data: FormData): string | null {
  switch (page) {
    case "account":
      return validateAccountStep(data);
    case "workspace":
      return validateWorkspaceStep(data);
    case "plan":
      return validatePlanStep(data);
    case "review":
      return null;
  }
}

function pageHeading(page: Page): string {
  const headings: Record<Page, string> = {
    account: "Account",
    workspace: "Workspace",
    plan: "Plan",
    review: "Review",
  };
  return headings[page];
}

function AccountFields({ data, onChange }: { data: FormData; onChange: (key: keyof FormData, value: string) => void }) {
  return (
    <fieldset>
      <label htmlFor="wizard-full-name">Full name</label>
      <input id="wizard-full-name" value={data.fullName} onChange={(e) => onChange("fullName", e.target.value)} />
      <label htmlFor="wizard-email">Email</label>
      <input
        id="wizard-email"
        type="email"
        value={data.email}
        onChange={(e) => onChange("email", e.target.value)}
      />
    </fieldset>
  );
}

function WorkspaceFields({ data, onChange }: { data: FormData; onChange: (key: keyof FormData, value: string) => void }) {
  return (
    <fieldset>
      <label htmlFor="wizard-company">Company name</label>
      <input id="wizard-company" value={data.companyName} onChange={(e) => onChange("companyName", e.target.value)} />
      <label htmlFor="wizard-team-size">Team size</label>
      <input id="wizard-team-size" value={data.teamSize} onChange={(e) => onChange("teamSize", e.target.value)} />
    </fieldset>
  );
}

function PlanFields({
  data,
  onSelectPlan,
  onChange,
}: {
  data: FormData;
  onSelectPlan: (plan: PlanType) => void;
  onChange: (key: keyof FormData, value: string) => void;
}) {
  return (
    <fieldset>
      <legend>Plan</legend>
      {PLAN_OPTIONS.map((option) => (
        <label key={option.value} htmlFor={\`wizard-plan-\${option.value}\`}>
          <input
            id={\`wizard-plan-\${option.value}\`}
            type="radio"
            name="wizard-plan"
            checked={data.planType === option.value}
            onChange={() => onSelectPlan(option.value)}
          />
          {option.label}
        </label>
      ))}
      {data.planType === "enterprise" ? (
        <>
          <label htmlFor="wizard-billing-email">Billing contact email</label>
          <input
            id="wizard-billing-email"
            type="email"
            value={data.billingEmail}
            onChange={(e) => onChange("billingEmail", e.target.value)}
          />
        </>
      ) : null}
    </fieldset>
  );
}

function ReviewSummary({ data }: { data: FormData }) {
  const planLabel = PLAN_OPTIONS.find((option) => option.value === data.planType)?.label ?? "";
  return (
    <ul>
      <li>{data.fullName}</li>
      <li>{data.email}</li>
      <li>{data.companyName}</li>
      <li>{data.teamSize}</li>
      <li>{planLabel}</li>
      {data.planType === "enterprise" ? <li>{data.billingEmail}</li> : null}
    </ul>
  );
}

export function FormWizard() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const page: Page = PAGES[state.pageIndex];

  function handleFieldChange(key: keyof FormData, value: string) {
    dispatch({ type: "field", key, value });
  }

  function handlePlanChoice(plan: PlanType) {
    dispatch({ type: "plan", plan });
  }

  function handleAdvance() {
    const problem = runValidatorFor(page, state.data);
    if (problem) {
      dispatch({ type: "invalid", message: problem });
      return;
    }
    dispatch({ type: "advance" });
  }

  function handleRetreat() {
    dispatch({ type: "retreat" });
  }

  function handleFinish() {
    const problem = runValidatorFor(page, state.data);
    if (problem) {
      dispatch({ type: "invalid", message: problem });
      return;
    }
    dispatch({ type: "confirm" });
  }

  if (state.confirmedData) {
    return <p role="status">Thanks, {state.confirmedData.fullName} — your workspace is being set up.</p>;
  }

  return (
    <div>
      <h2>{pageHeading(page)}</h2>

      {page === "account" && <AccountFields data={state.data} onChange={handleFieldChange} />}
      {page === "workspace" && <WorkspaceFields data={state.data} onChange={handleFieldChange} />}
      {page === "plan" && (
        <PlanFields data={state.data} onSelectPlan={handlePlanChoice} onChange={handleFieldChange} />
      )}
      {page === "review" && <ReviewSummary data={state.data} />}

      {state.errorMessage ? <p role="alert">{state.errorMessage}</p> : null}

      <div>
        <button type="button" onClick={handleRetreat} disabled={state.pageIndex === 0}>
          Back
        </button>
        {page === "review" ? (
          <button type="button" onClick={handleFinish}>
            Submit
          </button>
        ) : (
          <button type="button" onClick={handleAdvance}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
`;

// --- Behaviorally-incorrect fixture -----------------------------------------
// Structurally close to the reference (same useState shape, same helper
// names, same JSX layout) but the Plan branch of validateCurrentStep never
// calls validatePlanStep — it just returns null — so Enterprise's
// billing-email requirement is silently never enforced and Next always
// advances straight past the Plan step.
const BROKEN_FORM_WIZARD = `
import { useState } from "react";
import type { FormData, PlanType } from "./types";
import { validateAccountStep, validateWorkspaceStep } from "./validation";

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
    setFormData((prev) => ({ ...prev, planType: plan }));
  }

  function validateCurrentStep(): string | null {
    if (step === "account") return validateAccountStep(formData);
    if (step === "workspace") return validateWorkspaceStep(formData);
    // BUG: the Plan step never runs validatePlanStep, so Enterprise's
    // billing-email requirement is silently never enforced.
    if (step === "plan") return null;
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
`;

describe("multi-step-form-wizard behavioral equivalence (real production verification)", () => {
  it("loads the scenario and declares the expected step-2 tests", async () => {
    const loaded = await loadScenario(SLUG, { includeAuthorOnly: true });
    const step = loaded.scenario.steps.find((s) => s.id === STEP_ID);
    expect(step).toBeDefined();
    expect(step!.verify.harness).toBe("component");
    expect(step!.verify.functionName).toBe("FormWizard");
    expect(step!.verify.tests).toEqual(["tests/step-1.test.tsx", "tests/step-2.test.tsx"]);
  });

  it("PASSES an accessibly-equivalent but structurally divergent alt implementation", async () => {
    await loadScenario(SLUG, { includeAuthorOnly: true }); // sanity: scenario resolves
    const result = await verifyStepOnServer({
      scenarioSlug: SLUG,
      step: componentStep,
      files: workspaceFiles(ALT_PASSING_FORM_WIZARD),
    });

    expect(result.engine).toBe("react");
    expect(result.errors).toEqual([]);
    expect(result.status).toBe("passed");
    expect(result.passed).toBe(true);
    expect(result.testResults.length).toBeGreaterThan(0);
    expect(result.testResults.every((t) => t.status === "passed")).toBe(true);
  });

  it("FAILS a structurally-similar fixture that skips Plan-step validation", async () => {
    const result = await verifyStepOnServer({
      scenarioSlug: SLUG,
      step: componentStep,
      files: workspaceFiles(BROKEN_FORM_WIZARD),
    });

    expect(result.errors).toEqual([]);
    expect(result.status).not.toBe("passed");
    expect(result.passed).toBe(false);

    const failing = result.testResults.filter((t) => t.status !== "passed");
    expect(failing.length).toBeGreaterThan(0);
    // The break is specific to the cross-field Enterprise billing-email rule;
    // it should not spuriously break unrelated tests like Account/Workspace
    // navigation or the non-Enterprise happy path.
    expect(
      failing.some((t) => /enterprise/i.test(t.name) || /billing/i.test(t.name)),
    ).toBe(true);
    expect(
      failing.every((t) => !/account step|workspace step|non-Enterprise/i.test(t.name)),
    ).toBe(true);
  });
});
