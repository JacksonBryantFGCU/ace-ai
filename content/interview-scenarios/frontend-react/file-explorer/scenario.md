---
id: file-explorer
title: File Explorer
summary: "Build a VS Code-style file explorer over a recursive tree — rendering, expand/collapse, selection, and CRUD — then fix a real bug where deleting a nested item silently does nothing."
category: frontend-react
skills:
  - react-state
  - recursion
  - immutable-data
  - component-design
jobRoles:
  - frontend
  - fullstack
tags:
  - framework:react
  - pattern:file-explorer
  - format:pair-programming
difficulty: hard
experienceMin: junior
experienceMax: senior
estimatedMinutes: 55
stack:
  languages:
    - typescript
  harness: component
workspace:
  files:
    - { path: Explorer.tsx, role: edit }
    - { path: tree.ts, role: edit }
    - { path: types.ts, role: readonly }
    - { path: initialTree.ts, role: readonly }
  entry: Explorer.tsx
rubric:
  - criterion: Codebase coherence
    weight: 35
    detail: "Later steps preserve earlier behavior — rendering, expand/collapse, selection, and create/rename all keep working through the delete fix; no regressions as the explorer evolves."
  - criterion: Communication & reasoning
    weight: 35
    detail: "Explains the recursive rendering and tree-update shapes, why operations are keyed by id rather than name or position, and the cause of the nested-delete bug, grounded in their own code."
  - criterion: Trajectory
    weight: 30
    detail: "Handles the build → build → debug → explain escalation and responds well to probing (and to any checkpoint recovery)."
source: authored
status: review
version: 1
steps:
  - id: render-tree-and-expand-collapse
    kind: implement
    prompt: "Only the top level of the tree renders right now, and nothing can be expanded. Render every folder's children recursively — to unlimited depth — and let a folder be expanded and collapsed, remembering which folders are open."
    verification: automated-tests
    verify: { harness: component, functionName: Explorer, tests: [tests/step-1.test.tsx] }
    weight: 20
    checkpoint: { files: [solution/step-1/Explorer.tsx] }
    hints:
      - "A folder's children are themselves tree nodes that can contain folders — the component that renders one node is the natural thing to have render each of its children too."
      - "Track which folder ids are expanded (a `Set<string>` works well) separately from the tree data itself; expanding a folder doesn't change what's in it, just whether it's shown."
      - "A node only recurses into its children when it's a folder AND it's in the expanded set — files never have children to recurse into."
  - id: implement-selection-and-file-operations
    kind: implement
    prompt: "Add single selection — clicking a file or folder selects it, and only one item is selected at a time. Then implement `insertNode`, `renameNode`, and `deleteNode` in `tree.ts` (each returns a new tree without mutating the input) and wire up toolbar actions to create a file or folder (inside the selected folder, or at the root), rename the selected item, and delete it."
    verification: automated-tests
    verify: { harness: component, functionName: Explorer, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    weight: 30
    checkpoint: { files: [solution/step-2/Explorer.tsx, solution/step-2/tree.ts] }
    hints:
      - "Selection is just one more piece of state — the currently selected node's id — that the tree recursion reads to decide how to render one particular row."
      - "Every tree edit has the same shape: walk the tree, and where you find the node you care about, return a new node (or omit it, for delete) instead of mutating it in place; everywhere else, return the node unchanged (but still recurse into its children)."
      - "For create, decide the target folder from the current selection before building the new node: a selected folder is the target, a selected file's operations should fall back to the root."
  - id: fix-nested-delete
    kind: debug
    prompt: "Expand a folder, select a file or folder inside it, and click Delete. Nothing happens. Deleting something at the top level works fine. Reproduce it, work out why, and make sure delete works no matter how deep the item is."
    verification: hybrid
    verify: { harness: component, functionName: Explorer, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx, tests/step-3.test.tsx] }
    rubric:
      - criterion: Diagnosis
        weight: 40
        detail: "Correctly explains that `deleteNode` only filters the top-level array and never recurses into any node's children, so a match anywhere below the root is never found."
      - criterion: Sound fix
        weight: 40
        detail: "Fixes `deleteNode` to also recurse into the children of every node that wasn't the match, so a node is removed wherever it sits in the tree; any approach with that effect (including a shared recursive helper reused by insert/rename) is valid."
      - criterion: Communication
        weight: 20
        detail: "Articulates why deleting a nested folder should remove all of its descendants along with it, and why the bug was invisible when only testing top-level deletes."
    weight: 25
    checkpoint: { files: [solution/step-3/Explorer.tsx, solution/step-3/tree.ts] }
    hints:
      - "Compare `deleteNode` to `renameNode` — both are supposed to find a node anywhere in the tree, but only one of them looks inside a folder's children."
      - "`tree.filter((node) => node.id !== id)` throws away every non-matching top-level node's chance to have ITS children checked too."
      - "After filtering out the top-level match (if any), map over what's left and recurse into each node's own children with the same function."
  - id: scale-accessibility-and-performance
    kind: explain
    prompt: "Two follow-ups. First: right now the explorer is mouse-only — how would you make it fully keyboard-operable, and what tree semantics (roles, aria attributes, focus management) would you rely on? Second: this tree re-renders the whole thing on every expand, select, or edit — if it held hundreds of nodes, what would you change to keep it responsive?"
    verification: rubric
    verify: { harness: none }
    rubric:
      - criterion: Keyboard access
        weight: 40
        detail: "Describes a concrete keyboard interaction (arrow keys to move focus between visible rows, Enter/Space to select or toggle a folder, Right/Left to expand/collapse) built on the `tree`/`treeitem`/`group` ARIA roles already in use, plus how focus is restored after a delete or rename."
      - criterion: Render performance
        weight: 35
        detail: "Identifies that every row currently re-renders on any state change and proposes a concrete mitigation (memoizing the row component, keying state so unaffected subtrees don't re-render, or virtualizing the visible rows for very large or fully-expanded trees)."
      - criterion: Testing strategy
        weight: 25
        detail: "Describes testing the keyboard path and deep operations deterministically (firing key events and asserting focus/selection, or asserting tree shape after an operation) rather than only clicking through the UI by hand."
    weight: 25
    hints:
      - "The `role=\"tree\"` / `role=\"treeitem\"` / `role=\"group\"` structure already in the markup is exactly what assistive tech expects a keyboard-navigable tree to use — the missing piece is who currently has `tabIndex` and how arrow keys move it."
      - "Think about what's actually invalidated by one row's state changing — expanding a sibling folder shouldn't require re-rendering a totally unrelated subtree."
---

## Overview

The candidate joins a small **VS Code-style file explorer**: a project tree
with nested folders, a few files, and one deliberately empty folder. Only the
top level renders so far, and nothing can be expanded, selected, or edited.
Over four steps they take it from static to something they'd actually ship —
recursive rendering with expand/collapse, single selection plus full
create/rename/delete wired through pure, immutable tree helpers, fixing a
real recursion bug where deleting a nested item silently does nothing, and
reasoning about keyboard access and render cost at scale. This is the
capstone frontend scenario: the difficulty is entirely in correct recursive
data-structure manipulation and component architecture, not in styling a
tree view.

## Workspace

Four files — `Explorer.tsx` and `tree.ts` are both editable, since this
scenario asks for a genuine UI/data-layer split over recursive data:

- **`Explorer.tsx`** *(edit, entry)* — the explorer component. The starter
  renders only the top level of the tree; the candidate adds recursive
  rendering, expand/collapse, selection, and the toolbar for file
  operations.
- **`tree.ts`** *(edit)* — the tree manipulation logic. `findNode` is given
  and already recurses correctly; `insertNode`, `renameNode`, and
  `deleteNode` start as unimplemented stubs the candidate fills in.
- **`types.ts`** *(readonly)* — the `TreeNode` shape.
- **`initialTree.ts`** *(readonly)* — a small seeded project tree: three
  levels of nesting, one empty folder (`assets`), and two files both named
  `index.ts` at different depths — so any operation that (incorrectly) keys
  off name or position instead of `id` breaks visibly.

The candidate should understand all four in well under two minutes — the
starter is intentionally small even though the finished explorer is not.

## Reference Solutions

Authored-only; **stripped before the workspace is served**. The reference
chain is the checkpoint for each step and is what the validator executes
against the tests. Checkpoints are independent snapshots, not diffs — each
lists every file that differs from the starter at that point, even when a
file (like `Explorer.tsx` between Steps 2 and 3) didn't change:

- `solution/step-1/Explorer.tsx` — recursive rendering and expand/collapse,
  to unlimited depth.
- `solution/step-2/{Explorer.tsx,tree.ts}` — selection and full
  create/rename/delete. `deleteNode` only filters the top-level array — a
  reasonable first pass that works for the common case and is the seed of
  the Step 3 bug.
- `solution/step-3/{Explorer.tsx,tree.ts}` — `deleteNode` now also recurses
  into every remaining node's children; `Explorer.tsx` is unchanged from
  Step 2.

Each is one valid implementation only. Tests assert observable behavior
(rendered tree contents, ARIA state, tree shape after an operation), so
other sound solutions (a shared recursive `mapTree` helper backing all three
operations, a normalized-by-id state shape, a reducer instead of separate
`useState` calls) pass equally.

## Evaluation Notes

Authored-only. Step 3 is the primary discriminator: it separates candidates
who write a recursive helper that actually recurses on every branch from
those who solve only the case they happened to test by hand. A strong
candidate may pre-empt the bug in Step 2 — recursing into children for
delete from the start — which is a positive signal; Step 3 then becomes a
discussion ("walk me through why you recursed here but almost didn't"). The
`explain` step is discussion-only by design: keyboard interaction and
render-cost mitigations are reasoned about, never graded on a specific
implementation, to keep every automated check implementation-agnostic.
Checkpoints on steps 1–3 let a stuck candidate keep moving without
collapsing the codebase; they recover *code*, not score.
