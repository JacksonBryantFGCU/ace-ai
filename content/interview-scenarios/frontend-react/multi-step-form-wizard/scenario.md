---
id: multi-step-form-wizard
title: Multi-Step Form Wizard
summary: "Build a four-step SaaS onboarding wizard with validation-gated navigation and a conditional billing field, then fix a bug where switching plans silently discards typed data."
category: frontend-react
skills:
  - react-state
  - controlled-forms
  - validation
  - component-design
jobRoles:
  - frontend
  - fullstack
tags:
  - framework:react
  - pattern:multi-step-form
  - format:pair-programming
difficulty: medium
experienceMin: entry
experienceMax: senior
estimatedMinutes: 35
stack:
  languages:
    - typescript
  harness: component
workspace:
  files:
    - { path: FormWizard.tsx, role: edit }
    - { path: validation.ts, role: readonly }
    - { path: types.ts, role: readonly }
  entry: FormWizard.tsx
rubric:
  - criterion: Codebase coherence
    weight: 35
    detail: "Later steps preserve earlier behavior — Account/Workspace validation, the conditional billing field, and the compiled review all keep working through the plan-toggle fix; no regressions as the wizard evolves."
  - criterion: Communication & reasoning
    weight: 35
    detail: "Explains why formData is a single controlled object rather than per-step local state, and the cause of the plan-toggle data loss, grounded in their own code."
  - criterion: Trajectory
    weight: 30
    detail: "Handles the build → build → debug → explain escalation and responds well to probing (and to any checkpoint recovery)."
source: authored
status: review
version: 1
steps:
  - id: build-account-and-workspace-steps
    kind: implement
    prompt: "This is a four-step onboarding wizard (Account, Workspace, Plan, Review) — only the Account step renders so far, with no navigation. Add the Workspace step (company name, team size) and Next/Back controls between it and Account. Next must be blocked, with a visible error, whenever the current step fails the validators in `validation.ts`."
    verification: automated-tests
    verify: { harness: component, functionName: FormWizard, tests: [tests/step-1.test.tsx] }
    weight: 25
    checkpoint: { files: [solution/step-1/FormWizard.tsx] }
    hints:
      - "One object holding every field, updated the same way regardless of which step is showing, is simpler to reason about than each step owning its own local state."
      - "`validation.ts` already has a validator per step (`validateAccountStep`, `validateWorkspaceStep`) that returns an error message or `null` — call the right one for whichever step is current before letting Next advance."
      - "Back doesn't need to validate anything — only Next does. Keep the two asymmetric."
  - id: add-plan-and-review
    kind: implement
    prompt: "Add the Plan step — a choice of Starter / Team / Enterprise — and the Review step. Enterprise plans need an extra billing contact email field that only appears when Enterprise is selected; `validatePlanStep` already enforces that it's required and different from the account email for Enterprise. Review should display everything collected so far, and Submit should complete the flow."
    verification: automated-tests
    verify: { harness: component, functionName: FormWizard, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    weight: 30
    checkpoint: { files: [solution/step-2/FormWizard.tsx] }
    hints:
      - "The billing email field's visibility, its validation, and what Review displays are three separate places that all key off the same condition — keep that condition (`planType === 'enterprise'`) consistent across them rather than tracking it separately."
      - "`validatePlanStep` already reads both the plan step's own fields and the Account step's email to check they differ — call it with the whole form's data, not just the current step's slice."
      - "Submit is really 'validate the last step, then show that we're done' — the same shape as Next, just without a step to advance to."
  - id: fix-plan-toggle-data-loss
    kind: debug
    prompt: "On the Plan step, select Enterprise and type a billing contact email. Now switch to a different plan and back to Enterprise. The billing email is gone. Reproduce it, work out why, and make sure switching plans back and forth never loses data that was already typed."
    verification: hybrid
    verify: { harness: component, functionName: FormWizard, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx, tests/step-3.test.tsx] }
    rubric:
      - criterion: Diagnosis
        weight: 40
        detail: "Correctly explains that selecting a plan actively resets the billing email field alongside the plan type, so leaving and returning to Enterprise wipes out whatever was typed even though the user never left the Plan step."
      - criterion: Sound fix
        weight: 40
        detail: "Stops clearing the billing email on plan change — since it's already only shown, validated, and displayed for Enterprise, an unused stale value does no harm; any fix that preserves it under plan switching without breaking validation or the review summary is valid."
      - criterion: Communication
        weight: 20
        detail: "Articulates why 'clear the field when it becomes irrelevant' seemed reasonable but backfires the moment a user reconsiders and switches back."
    weight: 25
    checkpoint: { files: [solution/step-3/FormWizard.tsx] }
    hints:
      - "Compare the billing email right after typing it to its value right after selecting a different plan, before selecting Enterprise again."
      - "Something is actively resetting the billing email whenever the plan changes — find where the plan-selection handler touches more than just the plan field."
      - "The field is already gated on `planType === 'enterprise'` everywhere it's shown, validated, and displayed — you don't also need to clear its value just because a different plan is briefly selected."
  - id: scale-accessibility-and-schema
    kind: explain
    prompt: "Two follow-ups. First: when Next or Back moves to a new step, where should keyboard focus go, and how would a screen reader user know a validation error appeared? Second: this wizard hardcodes four fixed steps — how would you restructure it if the onboarding flow needed to support ten steps with per-role step sets, defined by product rather than by editing this component?"
    verification: rubric
    verify: { harness: none }
    rubric:
      - criterion: Focus and error announcement
        weight: 40
        detail: "Describes moving focus to the new step's heading or first field on navigation, and using an ARIA live region (or the error's own live semantics) so a validation failure is announced without requiring sighted confirmation."
      - criterion: Schema-driven scaling
        weight: 35
        detail: "Proposes representing steps and fields as data (a step/field schema) that a generic renderer and validator walk, rather than hardcoding each step's JSX and validation call — and reasons about where per-role step sets would plug into that."
      - criterion: Testing strategy
        weight: 25
        detail: "Describes testing a schema-driven wizard by exercising the renderer against different schemas rather than writing a new set of tests per hardcoded step."
    weight: 20
    hints:
      - "Think about a keyboard-only user who just clicked Next into a step with three fields and no visual cue of where they landed."
      - "If step definitions were data instead of JSX, what would a step 'be' — a shape you could store, generate, or vary per role?"
---

## Overview

The candidate joins a **SaaS onboarding wizard**: a four-step flow (Account,
Workspace, Plan, Review) that's meant to collect enough information to
provision a new customer's workspace. Only the first step renders at the
start, with nothing wired up. Over four steps the candidate takes it from
static to something they'd actually ship — building out navigation with
validation gates, adding a conditional field and a cross-field validation
rule, fixing a real state-management bug that the conditional logic exposes,
and reasoning about accessibility and scaling the step model itself.

This is a **state orchestration** problem, not a UI-only exercise: the
interesting decisions are what belongs in one shared, controlled `formData`
object versus per-step local state, how a field that's only sometimes
relevant should be validated and displayed without leaking special cases
everywhere, and what happens to in-progress input when the user changes
their mind.

## Workspace

Three files (`FormWizard.tsx` is the only one the candidate edits):

- **`FormWizard.tsx`** *(edit, entry)* — the wizard component. The starter
  renders only the Account step's fields, fully controlled but with no
  navigation; the candidate builds the rest.
- **`validation.ts`** *(readonly)* — one validator per step
  (`validateAccountStep`, `validateWorkspaceStep`, `validatePlanStep`), each
  returning an error message or `null`. `validatePlanStep` is the complex
  one: for the Enterprise plan it requires a billing contact email that must
  differ from the Account step's email — a real cross-step, multi-field
  dependency.
- **`types.ts`** *(readonly)* — the `FormData` shape and the `PlanType`
  union.

The candidate should understand all three in well under two minutes.

## Reference Solutions

Authored-only; **stripped before the workspace is served**. The reference
chain is the checkpoint for each step and is what the validator executes
against the tests:

- `solution/step-1/FormWizard.tsx` — Account and Workspace steps with
  validation-gated Next/Back. `formData` is one controlled object updated on
  every keystroke, so there's no separate draft state for navigation to lose.
- `solution/step-2/FormWizard.tsx` — Plan (with the Enterprise-only billing
  field) and Review/Submit added. Selecting a plan also clears the billing
  email "just in case" — the seed of the Step 3 bug.
- `solution/step-3/FormWizard.tsx` — plan selection no longer clears the
  billing email; it's already gated on `planType === "enterprise"` wherever
  it's shown, validated, or displayed, so an unused stale value is harmless.

Each is one valid implementation only. Tests assert observable behavior (what
renders, what's blocked, what the review summary shows), so other sound
solutions (a reducer instead of `useState`, a step-schema array, a
differently-named validator call site) pass equally.

## Evaluation Notes

Authored-only. Step 3 is the primary discriminator: it separates candidates
who reason about *why* a piece of state is being reset from those who add
resets reflexively whenever a field becomes "not currently relevant." A
strong candidate may never introduce the bug — leaving `billingEmail` alone
in Step 2 — which is a positive signal; Step 3 then becomes a discussion
("why didn't you clear the billing email when the plan changed?"). The
`explain` step is discussion-only by design: focus management and a
schema-driven step model are reasoned about, never graded on a specific
implementation, to keep every automated check implementation-agnostic.
Checkpoints on steps 1–3 let a stuck candidate keep moving without collapsing
the codebase; they recover *code*, not score.
