---
id: user-directory-search
title: User Directory Search
summary: "Build a live user-search UI against a provided API, fix an out-of-order-response bug that flashes stale results, then make the search logic reusable while preserving behavior."
category: frontend-react
skills:
  - effects
  - async
  - react-state
  - controlled-forms
jobRoles:
  - frontend
  - fullstack
tags:
  - framework:react
  - pattern:search
  - format:pair-programming
difficulty: easy
experienceMin: entry
experienceMax: senior
estimatedMinutes: 25
stack:
  languages:
    - typescript
  harness: component
workspace:
  files:
    - { path: UserSearch.tsx, role: edit }
    - { path: api.ts, role: readonly }
    - { path: types.ts, role: readonly }
  entry: UserSearch.tsx
rubric:
  - criterion: Codebase coherence
    weight: 35
    detail: "Later steps preserve earlier behavior — the refactor keeps both the search and the stale-response fix working; no regressions as the file evolves."
  - criterion: Communication & reasoning
    weight: 35
    detail: "Explains the async bug and the tradeoffs of the fix; reasons about the reusable boundary and about scaling — grounded in their own code."
  - criterion: Trajectory
    weight: 30
    detail: "Handles the build → debug → refactor → explain escalation and responds well to probing (and to any checkpoint recovery)."
source: authored
status: draft
version: 2
steps:
  - id: build-search
    kind: implement
    prompt: "This is a user-directory search we've started — the input is already wired up. When the user types, search the directory with `searchUsers(query)` and show the matching users (name and email). While a search is in flight, show a loading indicator; when a completed search has no matches, show an empty state."
    verification: automated-tests
    verify: { harness: component, functionName: UserSearch, tests: [tests/step-1.test.tsx] }
    weight: 25
    checkpoint: { files: [solution/step-1/UserSearch.tsx] }
    hints:
      - "The results should track the current query — think about where the fetch belongs and what should re-run it when the query changes."
      - "You'll need at least the results and whether a request is currently in flight."
      - "`searchUsers` returns a `Promise<User[]>`; render those in a list, and treat 'loading' and 'no matches' as distinct states."
  - id: fix-stale-results
    kind: debug
    prompt: "When you type quickly, results for an earlier query sometimes flash in and replace the ones you expect. Reproduce it, work out why it happens, and make sure the displayed results always match the latest query."
    verification: hybrid
    verify: { harness: component, functionName: UserSearch, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    rubric:
      - criterion: Diagnosis
        weight: 40
        detail: "Correctly explains that in-flight requests can resolve out of order, so a slow earlier response can overwrite the latest query's results."
      - criterion: Sound fix
        weight: 40
        detail: "Cleanly discards stale responses — via effect-cleanup ignore flag, AbortController, or a latest-query check — with no leaks; any of these is fully valid."
      - criterion: Communication
        weight: 20
        detail: "Articulates the tradeoffs of the chosen approach when probed."
    weight: 30
    checkpoint: { files: [solution/step-2/UserSearch.tsx] }
    hints:
      - "Two searches can be in flight at once — think about the order their promises resolve in."
      - "A slow earlier request can resolve after a faster later one. How could an in-flight request know it's no longer the current one?"
      - "The effect cleanup runs when the query changes — use it to ignore a stale response, or to cancel the request with an AbortController."
  - id: make-search-reusable
    kind: refactor
    prompt: "We want to reuse this exact search behavior on another page. Make the search logic reusable without changing how the component behaves — the existing behavior, including your fix from the previous step, must be preserved."
    verification: hybrid
    verify: { harness: component, functionName: UserSearch, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    rubric:
      - criterion: Reusable abstraction
        weight: 50
        detail: "Search logic is extracted behind a clean, reusable boundary (a custom hook is one good option) that a second page could consume without copy-paste."
      - criterion: Behavior preserved
        weight: 30
        detail: "Step-1 and step-2 behavior is unchanged; the carry-forward tests stay green."
      - criterion: Readability
        weight: 20
        detail: "The component is simpler afterward and the boundary between UI and search logic is clear."
    weight: 25
    checkpoint: { files: [solution/step-3/UserSearch.tsx, solution/step-3/useUserSearch.ts] }
    hints:
      - "Which parts of this component are about *searching*, and which are about *this particular UI*?"
      - "Consider moving the query-driven fetching and its state behind a small boundary any component could call."
      - "Keep the rendered output identical — the earlier tests should still pass unchanged."
  - id: scale-and-cancel
    kind: explain
    prompt: "Right now the UI fires a request on every keystroke. Talk me through how you'd reduce the number of requests, how you'd cancel requests that are no longer needed, and how you'd test that behavior."
    verification: rubric
    verify: { harness: none }
    rubric:
      - criterion: Reduce request volume
        weight: 40
        detail: "Identifies the request-per-keystroke cost and proposes debouncing, including that the debounce delay is a UX/latency tradeoff."
      - criterion: Cancellation
        weight: 35
        detail: "Reasons about cancelling in-flight requests (e.g. AbortController) and how it relates to the stale-response fix from step 2."
      - criterion: Testing strategy
        weight: 25
        detail: "Describes testing this deterministically — controlling timers and promise resolution rather than relying on wall-clock timing."
    weight: 20
    hints:
      - "Think about what happens between keystrokes, and how you'd avoid issuing a search for every intermediate value."
---

## Overview

The candidate joins a small, half-built **user directory search**: a text input
that should query a user directory and show matching people. Over four steps they
take it from a naive first version to something they'd actually ship — building the
search, fixing a real async bug, making the logic reusable, and reasoning about
production concerns — all in one evolving component.

This is the canonical reference scenario. It is deliberately small, but every step
builds on the candidate's own previous work, multiple implementations pass at every
step, and the interviewer's follow-ups are grounded in whatever the candidate wrote.

## Workspace

Three files (`UserSearch.tsx` is the only one the candidate edits):

- **`UserSearch.tsx`** *(edit, entry)* — the search component. The starter renders a
  controlled search input and nothing else; the candidate builds the behavior.
- **`api.ts`** *(readonly)* — provides `searchUsers(query: string): Promise<User[]>`,
  a mock directory client that resolves after a short, variable delay (which is what
  lets responses arrive out of order). The candidate is given this, not asked to
  write it; it is also the clean seam the tests mock to control resolution order.
- **`types.ts`** *(readonly)* — the `User` shape (`id`, `name`, `email`).

The candidate should understand all three in well under two minutes.

## Reference Solutions

Authored-only; **stripped before the workspace is served**. The reference chain is
the checkpoint for each step and is what the validator executes against the tests:

- `solution/step-1/UserSearch.tsx` — naive working search (contains the latent race).
- `solution/step-2/UserSearch.tsx` — race fixed via an effect-cleanup ignore flag.
- `solution/step-3/UserSearch.tsx` + `useUserSearch.ts` — search logic extracted into
  a reusable hook; behavior identical to step 2.

Each is one valid implementation only. Tests assert observable behavior, so other
sound solutions (AbortController, latest-query check, a differently-shaped
abstraction) pass equally.

## Evaluation Notes

Authored-only. Step 2 is the primary discriminator and carries the most weight. A
strong candidate may pre-empt the race in step 1 — that is a positive signal, and
step 2 then becomes a discussion ("you already guarded against stale responses —
walk me through why"). The `explain` step is discussion-only by design: debounce is
reasoned about, never graded on timing, to keep every automated check
implementation-agnostic. Checkpoints on steps 1 and 2 let a stuck candidate keep
moving without collapsing the codebase; they recover *code*, not score.
