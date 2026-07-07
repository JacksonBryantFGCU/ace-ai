---
id: shopping-cart
title: Shopping Cart System
summary: "Wire up adding products to a cart with quantity merging, add per-line and total price calculations, then fix a state-batching bug where rapid quantity clicks lose updates."
category: frontend-react
skills:
  - react-state
  - derived-state
  - list-rendering
  - immutability
jobRoles:
  - frontend
  - fullstack
tags:
  - framework:react
  - pattern:shopping-cart
  - format:pair-programming
difficulty: medium
experienceMin: entry
experienceMax: senior
estimatedMinutes: 30
stack:
  languages:
    - typescript
  harness: component
workspace:
  files:
    - { path: ShoppingCart.tsx, role: edit }
    - { path: data.ts, role: readonly }
    - { path: types.ts, role: readonly }
  entry: ShoppingCart.tsx
rubric:
  - criterion: Codebase coherence
    weight: 35
    detail: "Later steps preserve earlier behavior — adding, merging duplicate lines, per-line subtotals, and the total all keep working through the rapid-update fix; no regressions as the component evolves."
  - criterion: Communication & reasoning
    weight: 35
    detail: "Explains why price and total are derived rather than stored, and the cause of the rapid-click bug, grounded in their own code."
  - criterion: Trajectory
    weight: 30
    detail: "Handles the build → build → debug → explain escalation and responds well to probing (and to any checkpoint recovery)."
source: authored
status: review
version: 1
steps:
  - id: add-to-cart
    kind: implement
    prompt: "This page renders a static product list; the cart is always empty. Wire up 'Add to Cart' so clicking it adds that product to the cart. If the product is already in the cart, increase its quantity instead of adding a second row for the same product."
    verification: automated-tests
    verify: { harness: component, functionName: ShoppingCart, tests: [tests/step-1.test.tsx] }
    weight: 25
    checkpoint: { files: [solution/step-1/ShoppingCart.tsx] }
    hints:
      - "Think about what identifies 'the same product' already in the cart, and what should happen differently for a product that isn't there yet."
      - "One state update needs to do one of two different things depending on whether a matching line already exists — work out that branch before worrying about how to render it."
      - "Whether you use an array of cart lines or a lookup by product id, build the next cart immutably from the current one rather than mutating it in place."
  - id: cart-totals-and-quantity-controls
    kind: implement
    prompt: "Extend the cart to show, per line, a subtotal (price × quantity), plus buttons to increase or decrease that line's quantity — decreasing to 0 should remove the line. Also add an explicit Remove button on each line, and a running cart total. Handle an empty cart gracefully."
    verification: automated-tests
    verify: { harness: component, functionName: ShoppingCart, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    weight: 30
    checkpoint: { files: [solution/step-2/ShoppingCart.tsx] }
    hints:
      - "A line's subtotal and the cart's total are both values you can compute fresh from the current cart on every render — not extra state to keep in sync."
      - "Decreasing to 0 and pressing Remove both end up doing the same thing to the cart array: producing a version without that line."
      - "Guard the empty state the same way the initial render already does — check whether the cart (after whatever change just happened) has any lines left."
  - id: fix-rapid-quantity-updates
    kind: debug
    prompt: "Click a line's + button twice, quickly. Sometimes the quantity only goes up by one instead of two. Reproduce it, work out why, and make sure quantity changes are correct no matter how quickly they're clicked."
    verification: hybrid
    verify: { harness: component, functionName: ShoppingCart, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx, tests/step-3.test.tsx] }
    rubric:
      - criterion: Diagnosis
        weight: 40
        detail: "Correctly explains that the quantity handlers compute the next cart from the `cart` variable captured at render time, so two clicks that land in the same update both start from the same snapshot and the second overwrites the first instead of building on it."
      - criterion: Sound fix
        weight: 40
        detail: "Switches the affected updates to the functional `setCart(prev => ...)` form (or an equivalent that always builds on the latest pending state) so each click's effect is preserved regardless of timing."
      - criterion: Communication
        weight: 20
        detail: "Notices that add-to-cart was never affected because it was already written this way, and connects that to why the quantity controls were."
    weight: 25
    checkpoint: { files: [solution/step-3/ShoppingCart.tsx] }
    hints:
      - "This only shows up when two clicks land close enough together to both be handled before a re-render — try spacing the clicks out and compare."
      - "Look at what each handler reads to compute the next cart: is it the `cart` value from the component's last render, or the value React is about to apply?"
      - "Give `setCart` a function of the previous state instead of a value computed from the outer `cart` variable, the same way add-to-cart already does."
  - id: scale-persistence-and-performance
    kind: explain
    prompt: "Two follow-ups. First: right now the cart lives only in component state, so a page refresh loses it — how would you persist it, and what would you need to be careful about when restoring it? Second: this product list is small; if it had a few thousand products, what would you change to keep the page responsive?"
    verification: rubric
    verify: { harness: none }
    rubric:
      - criterion: Persistence approach
        weight: 40
        detail: "Proposes a concrete persistence mechanism (e.g. localStorage, or a backend cart endpoint) and reasons about restoring cart state safely — validating stored data and handling products that no longer exist or changed price."
      - criterion: Scale and rendering
        weight: 35
        detail: "Identifies that rendering thousands of products at once is the bottleneck and proposes a concrete mitigation (windowing/virtualization, pagination, or search/filter to narrow what's rendered)."
      - criterion: Testing strategy
        weight: 25
        detail: "Describes testing persistence deterministically (mocking storage, controlling what's 'restored') rather than depending on real browser storage in tests."
    weight: 20
    hints:
      - "Think about what could go wrong if the cart you restore from storage references a product that's been removed from the catalog, or whose price changed since it was saved."
      - "For the rendering question, consider what's different about a user's *visible* window into a few thousand products versus all of them being mounted at once."
---

## Overview

The candidate joins a small **shopping cart** page: a static product list
renders, but "Add to Cart" does nothing and the cart is always empty. Over
four steps they take it from static to something they'd actually ship —
wiring up add-to-cart with quantity merging, building out per-line and total
price calculations, fixing a real state-update bug that rapid clicking
exposes, and reasoning about persistence and rendering at scale — all in one
evolving component.

This is a **state-correctness** scenario, not a styling exercise: the
interesting decisions are about identity (what makes two cart entries "the
same product"), derived values (price and total should never be stored
state), and update ordering (what a click handler is actually allowed to
assume about the state it's updating).

## Workspace

Three files (`ShoppingCart.tsx` is the only one the candidate edits):

- **`ShoppingCart.tsx`** *(edit, entry)* — the cart component. The starter
  renders the product list with an inert "Add to Cart" button and an always-
  empty cart section; the candidate builds the rest.
- **`data.ts`** *(readonly)* — exports `PRODUCTS`, six seed products with
  `id`, `name`, and `price`.
- **`types.ts`** *(readonly)* — the `Product` and `CartLine` shapes.

The candidate should understand all three in well under two minutes.

## Reference Solutions

Authored-only; **stripped before the workspace is served**. The reference
chain is the checkpoint for each step and is what the validator executes
against the tests:

- `solution/step-1/ShoppingCart.tsx` — add-to-cart wired up, merging into an
  existing line by product id using the functional `setCart` form.
- `solution/step-2/ShoppingCart.tsx` — per-line subtotal, quantity +/-
  controls, explicit remove, and a derived cart total added. The quantity
  handlers read the `cart` closure directly instead of using the functional
  form — correct for clicks spaced apart by a render, but the seed of the
  Step 3 bug.
- `solution/step-3/ShoppingCart.tsx` — quantity handlers switched to the
  functional `setCart` form, so rapid, same-batch clicks are no longer lost.

Each is one valid implementation only. Tests assert observable cart contents
and totals, so other sound solutions (a cart keyed by id instead of an array,
a reducer, a differently-named helper) pass equally.

## Evaluation Notes

Authored-only. Step 3 is the primary discriminator: it separates candidates
who reason about *when* a state update actually applies from those who only
reason about *what* it computes. A strong candidate may pre-empt the bug by
using the functional `setCart` form everywhere from Step 2 onward — a
positive signal — in which case Step 3 becomes a discussion ("you already
used the functional form for the quantity buttons; why does that matter
here?"). The `explain` step is discussion-only by design: persistence and
large-catalog rendering are reasoned about, never graded on a specific
implementation, to keep every automated check implementation-agnostic.
Checkpoints on steps 1–3 let a stuck candidate keep moving without collapsing
the codebase; they recover *code*, not score.
