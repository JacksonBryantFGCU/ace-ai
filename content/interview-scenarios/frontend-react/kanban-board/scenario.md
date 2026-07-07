---
id: kanban-board
title: Kanban Board
summary: "Add native drag-and-drop to a three-column Kanban board, fix an off-by-one bug in same-column reordering, make the board logic reusable, then reason about keyboard access and render performance."
category: frontend-react
skills:
  - react-state
  - component-design
  - drag-and-drop
  - accessibility
jobRoles:
  - frontend
  - fullstack
tags:
  - framework:react
  - pattern:drag-and-drop
  - format:pair-programming
difficulty: medium
experienceMin: junior
experienceMax: senior
estimatedMinutes: 30
stack:
  languages:
    - typescript
  harness: component
workspace:
  files:
    - { path: KanbanBoard.tsx, role: edit }
    - { path: data.ts, role: readonly }
    - { path: types.ts, role: readonly }
  entry: KanbanBoard.tsx
rubric:
  - criterion: Codebase coherence
    weight: 35
    detail: "Later steps preserve earlier behavior — cross-column moves, the same-column reorder fix, and the add/delete flows all keep working through the refactor; no regressions as the board evolves."
  - criterion: Communication & reasoning
    weight: 35
    detail: "Explains the state-shape decisions for moving cards between lists, the cause of the reorder bug, and the keyboard-access and render-cost tradeoffs — grounded in their own code."
  - criterion: Trajectory
    weight: 30
    detail: "Handles the build → debug → refactor → explain escalation and responds well to probing (and to any checkpoint recovery)."
source: authored
status: review
version: 1
steps:
  - id: build-cross-column-drag
    kind: implement
    prompt: "This Kanban board already supports adding and deleting cards, but cards can't move once created. Using the native HTML5 drag-and-drop APIs (no libraries), let a card be dragged out of its column and dropped into another column. Dropping directly on a column should append the card to the end of that column's list; dropping on a specific card should insert the dragged card right before it."
    verification: automated-tests
    verify: { harness: component, functionName: KanbanBoard, tests: [tests/step-1.test.tsx] }
    weight: 30
    checkpoint: { files: [solution/step-1/KanbanBoard.tsx] }
    hints:
      - "`draggable` plus `onDragStart` on the card, and `onDragOver` (call `preventDefault`) and `onDrop` on the drop target, are the whole native API surface you need here — no library required."
      - "`dataTransfer.setData` on drag start and `dataTransfer.getData` on drop is a simple way to carry the dragged card's id across the two events without extra state."
      - "Moving a card is really two edits to the columns array: remove it from wherever it currently is, then insert it into the target column at the right index — do both immutably."
  - id: fix-same-column-reorder
    kind: debug
    prompt: "Try dragging a card down a few slots within the same column — for example, drag the first Todo card onto the last one. It lands in the wrong place. Reproduce it, work out why, and make sure reordering within a column is correct in both directions."
    verification: hybrid
    verify: { harness: component, functionName: KanbanBoard, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    rubric:
      - criterion: Diagnosis
        weight: 40
        detail: "Correctly explains that the insertion index was computed against the column's list before the dragged card was removed from it, so removing it shifts everything after it and the index lands one slot too far right — but only when dragging downward."
      - criterion: Sound fix
        weight: 40
        detail: "Computes the insertion index against the column's list AFTER the dragged card has been removed (or otherwise adjusts for the shift) so both directions land correctly; any approach with that effect is fully valid."
      - criterion: Communication
        weight: 20
        detail: "Articulates why the bug only shows up when dragging downward within the same column, and not across columns or when dragging upward."
    weight: 25
    checkpoint: { files: [solution/step-2/KanbanBoard.tsx] }
    hints:
      - "The bug only shows up when the card you're dragging started BEFORE the slot you drop it on, in the same column — try dragging upward instead and compare."
      - "Whatever index you use to insert the card, ask whether it was computed against the list that still contained the card you're about to remove."
      - "Filter the dragged card out of the column's list first, then find the target card's position in what's left, and insert there."
  - id: make-board-reusable
    kind: refactor
    prompt: "Another view needs the same board logic — adding, deleting, and moving cards — without this exact layout. Pull the state transitions out so they can be reused, without changing how this board behaves. The cross-column move and your reorder fix from the last step must both still work."
    verification: hybrid
    verify: { harness: component, functionName: KanbanBoard, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    rubric:
      - criterion: Reusable abstraction
        weight: 50
        detail: "The add/delete/move logic is extracted behind a clean, reusable boundary (a custom hook is one good option) that a different view could consume without copy-pasting it."
      - criterion: Behavior preserved
        weight: 30
        detail: "Step-1 and step-2 behavior is unchanged; the carry-forward tests stay green."
      - criterion: Readability
        weight: 20
        detail: "The board component is simpler afterward, and the split between managing board state and rendering this particular layout is clear."
    weight: 25
    checkpoint: { files: [solution/step-3/KanbanBoard.tsx, solution/step-3/useKanbanBoard.ts] }
    hints:
      - "Which parts of this component are about *managing a board's cards* (add, delete, move), and which are specific to *this* three-column layout?"
      - "A small hook that owns the columns state and exposes add/delete/move functions is one clean boundary another view could call."
      - "Keep the rendered output identical — the step-1 and step-2 tests should pass unchanged."
  - id: scale-keyboard-and-performance
    kind: explain
    prompt: "This board only supports mouse drag-and-drop, and every card in every column currently re-renders on the state update from a single move. Talk me through how you'd add keyboard support for moving a card between columns, and how you'd keep the board responsive if a column held hundreds of cards."
    verification: rubric
    verify: { harness: none }
    rubric:
      - criterion: Keyboard access
        weight: 40
        detail: "Describes a concrete keyboard interaction (e.g. picking up a focused card and moving it with arrow keys or a column-select action), including how focus is managed after the move and how the change is announced to assistive tech."
      - criterion: Render performance
        weight: 35
        detail: "Identifies that unrelated cards/columns re-render on every move and proposes a fix (memoizing card/column components, keying state so unaffected columns don't re-render, or virtualizing long columns)."
      - criterion: Testing strategy
        weight: 25
        detail: "Describes testing the keyboard path deterministically (firing key events and asserting the resulting order/focus) rather than relying on simulated pointer drags."
    weight: 20
    hints:
      - "Native HTML5 drag-and-drop has no keyboard equivalent by default — think about what a parallel, non-drag interaction for moving a focused card would look like, and how it would reuse the same move logic."
---

## Overview

The candidate joins a small, three-column **Kanban board** — Todo, In Progress,
Done — with ten seed cards. Adding and deleting cards already works; the board
can't yet move a card anywhere. Over four steps they take it from static to
something they'd actually ship: wiring up native drag-and-drop, fixing a real
indexing bug that a reasonable first pass produces, making the board logic
reusable, and reasoning about keyboard access and render cost at scale — all
in one evolving component.

The difficulty isn't the drag events themselves; it's the ordinary state-shape
judgment that any cross-list, reorderable UI demands — where a moved card
comes from, where it lands, and what happens to the indices in between when
the same list is both the source and the destination.

## Workspace

Three files (`KanbanBoard.tsx` is the only one the candidate edits):

- **`KanbanBoard.tsx`** *(edit, entry)* — the board component. The starter
  renders three columns with ten cards, plus working add and delete; the
  candidate adds the drag-and-drop behavior.
- **`data.ts`** *(readonly)* — exports `INITIAL_COLUMNS`, the seed data (four
  Todo cards, three In Progress, three Done). Ten cards across three columns
  is enough for cross-column moves and same-column reordering to be
  meaningfully different from a one-or-two-card toy example.
- **`types.ts`** *(readonly)* — the `CardItem` and `ColumnData` shapes and the
  `ColumnId` union.

The candidate should understand all three in well under two minutes.

## Reference Solutions

Authored-only; **stripped before the workspace is served**. The reference
chain is the checkpoint for each step and is what the validator executes
against the tests:

- `solution/step-1/KanbanBoard.tsx` — native drag-and-drop wired up for both
  cross-column moves and dropping onto a specific card. Contains the latent
  same-column, drag-downward indexing bug.
- `solution/step-2/KanbanBoard.tsx` — bug fixed by computing the insertion
  index against the column's list after the dragged card is removed from it.
- `solution/step-3/KanbanBoard.tsx` + `useKanbanBoard.ts` — add/delete/move
  logic extracted into a reusable hook; behavior identical to step 2.

Each is one valid implementation only. Tests assert observable card order, so
other sound solutions (a different index-adjustment approach, a reducer
instead of a hook, a normalized-by-id state shape) pass equally.

## Evaluation Notes

Authored-only. Step 2 is the primary discriminator and shares the top weight
with step 1. A strong candidate may pre-empt the bug in step 1 — computing the
insertion index against the post-removal list from the start — which is a
positive signal; step 2 then becomes a discussion ("you already handled the
same-column shift — walk me through why"). The `explain` step is
discussion-only by design: keyboard interaction and render-cost mitigations
are reasoned about, never graded on a specific implementation, to keep every
automated check implementation-agnostic. Checkpoints on steps 1–3 let a stuck
candidate keep moving without collapsing the codebase; they recover *code*,
not score.
