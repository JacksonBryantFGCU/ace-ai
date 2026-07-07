---
id: todo-list
title: Todo List
summary: "Build add/delete for a todo list, then completion toggling, inline editing, and filter tabs, then fix a bug where deleting under a filter removes the wrong todo."
category: frontend-react
skills:
  - react-state
  - controlled-forms
  - derived-state
  - list-rendering
jobRoles:
  - frontend
  - fullstack
tags:
  - framework:react
  - pattern:crud
  - format:pair-programming
difficulty: easy
experienceMin: entry
experienceMax: junior
estimatedMinutes: 20
stack:
  languages:
    - typescript
  harness: component
workspace:
  files:
    - { path: TodoApp.tsx, role: edit }
    - { path: data.ts, role: readonly }
    - { path: types.ts, role: readonly }
  entry: TodoApp.tsx
rubric:
  - criterion: Codebase coherence
    weight: 35
    detail: "Later steps preserve earlier behavior — adding, toggling, editing, and filtering all keep working through the delete fix; no regressions as the component evolves."
  - criterion: Communication & reasoning
    weight: 35
    detail: "Explains the state-shape choices for todos and the filtered view, and the cause of the filtered-delete bug, grounded in their own code."
  - criterion: Trajectory
    weight: 30
    detail: "Handles the build → build → debug → explain escalation and responds well to probing (and to any checkpoint recovery)."
source: authored
status: review
version: 1
steps:
  - id: add-and-delete-todos
    kind: implement
    prompt: "This todo list renders a few seeded todos but nothing is interactive yet. The input is already controlled — wire up submitting the form to add a new todo (ignore empty/whitespace-only text), and wire up each row's Delete button."
    verification: automated-tests
    verify: { harness: component, functionName: TodoApp, tests: [tests/step-1.test.tsx] }
    weight: 25
    checkpoint: { files: [solution/step-1/TodoApp.tsx] }
    hints:
      - "The input's value and onChange are already there — you just need an onSubmit that turns the current text into a new todo and clears the input."
      - "Give each todo a stable identity (an id) when you create it, separate from wherever it happens to sit in the list."
      - "Deleting is producing a new array without the removed todo — do it immutably rather than mutating the existing array."
  - id: toggle-edit-and-filter
    kind: implement
    prompt: "Add the ability to toggle a todo's completion (the checkbox), edit its text inline (double-click the text to reveal an input; save on Enter or blur, discard on Escape), and filter the visible todos with All / Active / Completed tabs."
    verification: automated-tests
    verify: { harness: component, functionName: TodoApp, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    weight: 30
    checkpoint: { files: [solution/step-2/TodoApp.tsx] }
    hints:
      - "Toggling and editing both need to target one specific todo out of the full list — matching by id keeps that unambiguous no matter what's currently visible."
      - "The filtered list is naturally a derived value — computed fresh from `todos` and the current filter — not a second piece of state to keep in sync."
      - "For inline editing, a separate 'which todo is being edited, and its draft text' bit of state, distinct from the todos themselves, keeps the rest of the list untouched while one row is mid-edit."
  - id: fix-filtered-delete
    kind: debug
    prompt: "Switch the filter to Active, then delete the first todo shown. Sometimes a different todo disappears than the one you clicked. Reproduce it, work out why, and make sure delete always removes the todo you clicked, no matter which filter is active."
    verification: hybrid
    verify: { harness: component, functionName: TodoApp, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx, tests/step-3.test.tsx] }
    rubric:
      - criterion: Diagnosis
        weight: 40
        detail: "Correctly explains that delete was keyed off an item's position in the currently rendered (filtered) list, which differs from its position in the full array whenever a filter narrows what's shown."
      - criterion: Sound fix
        weight: 40
        detail: "Deletes by the item's id (matching how toggle and edit already work) instead of by list position; any fix that removes exactly the clicked item under every filter is valid."
      - criterion: Communication
        weight: 20
        detail: "Articulates why toggle and edit were already unaffected — they were keyed by id from the start — and only delete had the bug."
    weight: 25
    checkpoint: { files: [solution/step-3/TodoApp.tsx] }
    hints:
      - "Compare how toggle identifies 'which todo' versus how delete does — they're not using the same thing."
      - "A todo's position in the array you're currently rendering isn't the same as its position in the full `todos` state once a filter is narrowing the view."
      - "Delete by the todo's id, the same way toggling and editing already do, instead of by its index in whatever list is on screen."
  - id: scale-focus-and-render-cost
    kind: explain
    prompt: "Two follow-ups on this component as it stands. First: when someone starts editing a todo, where should keyboard focus go, and where should it return to after they save or cancel? Second: right now every todo row re-renders whenever any single todo changes — how would you keep that from becoming a problem with a few hundred todos?"
    verification: rubric
    verify: { harness: none }
    rubric:
      - criterion: Focus management
        weight: 45
        detail: "Describes moving focus into the edit input when editing starts (e.g. autofocus) and returning it somewhere sensible — typically the edited row or the item that triggered editing — when it ends, so keyboard users aren't stranded."
      - criterion: Render cost
        weight: 35
        detail: "Identifies that updating one item currently re-renders every row and proposes a concrete mitigation (memoizing the row component with a stable per-row callback, or keying state so unrelated rows don't re-render)."
      - criterion: Testing strategy
        weight: 20
        detail: "Describes verifying focus behavior with keyboard-driven interactions (tabbing, firing key events) rather than relying on visual inspection."
    weight: 20
    hints:
      - "Think about a keyboard-only user who just pressed Enter to save an edit — what would be jarring if focus just vanished or reset to the top of the page?"
---

## Overview

The candidate joins a small **todo list** with five seeded todos — some
complete, some not — but no interactivity wired up yet. Over four steps they
take it from static to something they'd actually ship: adding and deleting
todos, then toggling completion, inline editing, and filter tabs, then fixing
a real bug that filtering exposes in delete, and finally reasoning about
keyboard focus and render cost. This is the easy baseline in the library —
correctness and clean UI-state handling, not algorithmic complexity.

The subtle edge case is deliberate: once the visible list is a *filtered*
subset of the full todos, any operation still keyed by on-screen position
(instead of the todo's own identity) silently targets the wrong item. It's a
one-line fix once diagnosed, but noticing it requires understanding the
difference between a list's rendered position and its underlying state — the
same class of mistake a junior implementation is likely to make naturally
while a mid-level one guards against from the start.

## Workspace

Three files (`TodoApp.tsx` is the only one the candidate edits):

- **`TodoApp.tsx`** *(edit, entry)* — the todo list component. The starter
  renders the seeded todos with a controlled add-input; the candidate builds
  the rest.
- **`data.ts`** *(readonly)* — exports `INITIAL_TODOS`, five seed todos (two
  completed, three active) so every filter tab has something to show.
- **`types.ts`** *(readonly)* — the `Todo` shape and the `Filter` union.

The candidate should understand all three in well under two minutes.

## Reference Solutions

Authored-only; **stripped before the workspace is served**. The reference
chain is the checkpoint for each step and is what the validator executes
against the tests:

- `solution/step-1/TodoApp.tsx` — add and delete wired up. Delete is
  implemented by the todo's position in the rendered list — correct for now,
  since nothing filters the list yet, but the seed of the Step 3 bug.
- `solution/step-2/TodoApp.tsx` — toggle, inline edit, and filter tabs added.
  Toggle and edit are keyed by id; delete is still keyed by position, now
  visibly wrong once a filter is active (not yet tested until Step 3).
- `solution/step-3/TodoApp.tsx` — delete fixed to key off the todo's id, the
  same way toggle and edit already did.

Each is one valid implementation only. Tests assert observable behavior (what
text appears or disappears, checkbox state, which tab is selected), so other
sound solutions (a reducer instead of separate `useState` calls, a
normalized-by-id state shape, a different editing-state design) pass equally.

## Evaluation Notes

Authored-only. Step 3 is the primary discriminator: it separates candidates
who treat "the todo I clicked" and "its position on screen" as
interchangeable from those who don't. A strong candidate may pre-empt the bug
entirely by keying delete off id from Step 1 — a positive signal — in which
case Step 3 becomes a discussion ("you already deleted by id here; why does
that matter once filtering exists?"). The `explain` step is discussion-only
by design: focus management and render-cost mitigations are reasoned about,
never graded on a specific implementation, to keep every automated check
implementation-agnostic. Checkpoints on steps 1–3 let a stuck candidate keep
moving without collapsing the codebase; they recover *code*, not score.
