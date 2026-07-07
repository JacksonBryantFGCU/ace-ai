---
id: paginated-data-table
title: Paginated Data Table
summary: "Add client-side pagination to a filterable transactions table, fix a blank-table bug when the filter shrinks the results, make it reusable, then reason about moving it server-side."
category: frontend-react
skills:
  - react-state
  - derived-state
  - lists-and-tables
  - component-design
jobRoles:
  - frontend
  - fullstack
tags:
  - framework:react
  - pattern:pagination
  - format:pair-programming
difficulty: easy
experienceMin: entry
experienceMax: senior
estimatedMinutes: 28
stack:
  languages:
    - typescript
  harness: component
workspace:
  files:
    - { path: TransactionsTable.tsx, role: edit }
    - { path: data.ts, role: readonly }
    - { path: types.ts, role: readonly }
  entry: TransactionsTable.tsx
rubric:
  - criterion: Codebase coherence
    weight: 35
    detail: "Later steps preserve earlier behavior — the filter, the pagination boundaries, and the out-of-range fix all keep working through the refactor; no regressions as the component evolves."
  - criterion: Communication & reasoning
    weight: 35
    detail: "Explains the derived-vs-stored state decision, the cause of the blank-table bug, and the client-vs-server pagination tradeoff — grounded in their own code."
  - criterion: Trajectory
    weight: 30
    detail: "Handles the build → debug → refactor → explain escalation and responds well to probing (and to any checkpoint recovery)."
source: authored
status: review
version: 2
steps:
  - id: build-pagination
    kind: implement
    prompt: "This transactions table already has a working status filter, but it renders every matching row at once. Add client-side pagination: show 8 rows per page, with Previous and Next buttons and a page indicator in the form \"Page X of Y\". Previous should be disabled on the first page and Next on the last."
    verification: automated-tests
    verify: { harness: component, functionName: TransactionsTable, tests: [tests/step-1.test.tsx] }
    weight: 30
    checkpoint: { files: [solution/step-1/TransactionsTable.tsx] }
    hints:
      - "The rows for the current page are a slice of the filtered list — think about what actually needs to live in state versus what you can derive from it."
      - "You really only need the current page number; the total page count and the visible rows both fall out of the filtered data and the page size."
      - "Guard the ends: use `Math.ceil(total / pageSize)` for the count, and disable Previous on the first page and Next on the last."
  - id: fix-out-of-range
    kind: debug
    prompt: "Try this: with the filter on \"All\", page to the last page, then switch the filter to \"Overdue\". The table goes blank. Reproduce it, work out why it happens, and make sure the table always shows valid rows for whatever filter is active."
    verification: hybrid
    verify: { harness: component, functionName: TransactionsTable, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    rubric:
      - criterion: Diagnosis
        weight: 40
        detail: "Correctly explains that the stored page index isn't reconciled when the filter shrinks the row count, so it can point past the last page and slice an empty window."
      - criterion: Sound fix
        weight: 40
        detail: "Keeps the page in range — clamping the current page to the last valid page, or resetting it when the filter changes — with no leftover empty view; either approach is fully valid."
      - criterion: Communication
        weight: 20
        detail: "Articulates the tradeoff of their approach (reset-to-first-page vs. clamp-and-stay) when probed."
    weight: 30
    checkpoint: { files: [solution/step-2/TransactionsTable.tsx] }
    hints:
      - "Watch the page indicator as you switch the filter — where does the current page land relative to how many pages now exist?"
      - "Changing the filter changes how many rows (and pages) there are, but the stored page number doesn't move with it."
      - "Either bring the page back into range whenever it would fall past the last page, or reset it when the filter changes — both keep the view valid."
  - id: make-pagination-reusable
    kind: refactor
    prompt: "Another screen needs this same pagination behavior. Pull the pagination logic out so it can be reused, without changing how this table behaves — the filter, the boundary handling, and your fix from the last step must all still work."
    verification: hybrid
    verify: { harness: component, functionName: TransactionsTable, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    rubric:
      - criterion: Reusable abstraction
        weight: 50
        detail: "Pagination logic is extracted behind a clean, reusable boundary (a custom hook is one good option) that another screen could consume without copy-paste."
      - criterion: Behavior preserved
        weight: 30
        detail: "Step-1 and step-2 behavior is unchanged; the carry-forward tests stay green."
      - criterion: Readability
        weight: 20
        detail: "The table component is simpler afterward and the split between paginating a list and rendering this table is clear."
    weight: 20
    checkpoint: { files: [solution/step-3/TransactionsTable.tsx, solution/step-3/usePagination.ts] }
    hints:
      - "Which parts of this component are about *paginating a list*, and which are specific to *this table's* rows and columns?"
      - "A small hook that takes a list and a page size and returns the current page's items plus the controls is one clean boundary."
      - "Keep the rendered output identical — the step-1 and step-2 tests should pass unchanged."
  - id: scale-server-side
    kind: explain
    prompt: "This table paginates in the browser over data it already has. Say the transactions came from an API and could be 100,000 rows. Talk me through how you'd move pagination to the server, what would change on the client, and how you'd test that it works."
    verification: rubric
    verify: { harness: none }
    rubric:
      - criterion: Server-side design
        weight: 40
        detail: "Describes sending page/pageSize (or a cursor) to the API and rendering only the returned page, and recognizes the client no longer holds the full dataset."
      - criterion: Total count & correctness
        weight: 35
        detail: "Notes the server must return the total count (or a next-cursor) to drive the indicator, and that filtering must move server-side so counts and pages stay correct."
      - criterion: Testing strategy
        weight: 25
        detail: "Describes testing deterministically by mocking the API — asserting the right query params are sent and the returned page renders — rather than depending on a real backend."
    weight: 20
    hints:
      - "Think about what the client stops knowing once it only holds one page at a time — like how many pages there are in total."
---

## Overview

The candidate joins a small **transactions admin table**: a status filter is already
wired up, and the table renders every matching row at once. Over four steps they take
it to something they'd actually ship — adding pagination, fixing a real bug that the
naive version hides, making the pagination reusable, and reasoning about how it
changes at scale — all in one evolving component.

The difficulty is not an algorithm; it's the ordinary engineering judgment a data
table demands: what belongs in state versus what should be derived, and what happens
to the current page when the data underneath it changes.

## Workspace

Three files (`TransactionsTable.tsx` is the only one the candidate edits):

- **`TransactionsTable.tsx`** *(edit, entry)* — the table component. The starter has a
  working status filter and renders all filtered rows; the candidate adds the
  pagination behavior.
- **`data.ts`** *(readonly)* — exports `TRANSACTIONS`, a fixed 23-row ledger. The
  candidate is given this, not asked to write it; 23 rows means 8-per-page yields
  three pages, and each status filter yields a different page count (which is what
  makes the out-of-range bug reproducible).
- **`types.ts`** *(readonly)* — the `Transaction` shape and its `status` union.

The candidate should understand all three in well under two minutes.

## Reference Solutions

Authored-only; **stripped before the workspace is served**. The reference chain is the
checkpoint for each step and is what the validator executes against the tests:

- `solution/step-1/TransactionsTable.tsx` — naive working pagination (stores the page
  index; contains the latent out-of-range bug).
- `solution/step-2/TransactionsTable.tsx` — bug fixed by clamping the current page to
  the last valid page at render time.
- `solution/step-3/TransactionsTable.tsx` + `usePagination.ts` — pagination extracted
  into a reusable hook; behavior identical to step 2.

Each is one valid implementation only. Tests assert observable behavior, so other
sound solutions (resetting the page when the filter changes, a differently-shaped
hook, `useReducer`) pass equally.

## Evaluation Notes

Authored-only. Step 2 is the primary discriminator and shares the top weight. A strong
candidate may pre-empt the bug in step 1 — deriving or clamping the page so it can
never fall out of range — which is a positive signal; step 2 then becomes a discussion
("you already guarded the page against a shrinking list — walk me through why"). The
`explain` step is discussion-only by design: server-side pagination is reasoned about,
never graded on a specific API shape, to keep every automated check
implementation-agnostic. Checkpoints on steps 1–3 let a stuck candidate keep moving
without collapsing the codebase; they recover *code*, not score.
