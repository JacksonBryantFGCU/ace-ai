---
id: analytics-dashboard
title: Analytics Dashboard
summary: "Build a client-side analytics dashboard that derives metrics and filters from raw events, then fix a stale-memoization bug where changing a filter stops updating the numbers."
category: frontend-react
skills:
  - react-state
  - derived-state
  - aggregation
  - component-design
jobRoles:
  - frontend
  - fullstack
tags:
  - framework:react
  - pattern:analytics-dashboard
  - format:pair-programming
difficulty: hard
experienceMin: junior
experienceMax: senior
estimatedMinutes: 50
stack:
  languages:
    - typescript
  harness: component
workspace:
  files:
    - { path: Dashboard.tsx, role: edit }
    - { path: analytics.ts, role: edit }
    - { path: events.ts, role: readonly }
  entry: Dashboard.tsx
rubric:
  - criterion: Codebase coherence
    weight: 35
    detail: "Later steps preserve earlier behavior — basic metrics, filtering, and the advanced metrics all keep working through the memoization fix; no regressions as the dashboard evolves."
  - criterion: Communication & reasoning
    weight: 35
    detail: "Explains why every metric is derived fresh from the (filtered) events array rather than stored separately, and the cause of the stale-filter bug, grounded in their own code."
  - criterion: Trajectory
    weight: 30
    detail: "Handles the build → build → debug → explain escalation and responds well to probing (and to any checkpoint recovery)."
source: authored
status: review
version: 1
steps:
  - id: render-events-and-basic-metrics
    kind: implement
    prompt: "The raw events already render in a table. Finish `computeMetrics` in `analytics.ts` so it returns the total event count, the number of unique users, and a count of events per type — computed from whatever events array it's given, not from a fixed total. Display those numbers above the table."
    verification: automated-tests
    verify: { harness: component, functionName: Dashboard, tests: [tests/step-1.test.tsx] }
    weight: 25
    checkpoint: { files: [solution/step-1/Dashboard.tsx, solution/step-1/analytics.ts] }
    hints:
      - "Each of these three numbers is a different way of summarizing the same flat list of events — a count, a count of distinct values, and a count grouped by a field."
      - "`Set` is a convenient way to count distinct users without tracking duplicates yourself."
      - "Loop once over the events, incrementing a per-type counter as you go, rather than filtering the array once per type."
  - id: implement-filtering-and-advanced-metrics
    kind: implement
    prompt: "Implement `filterEvents` in `analytics.ts` — it should keep only events within the selected date range (last 24 hours / 7 days / 30 days / all time) whose type is one of the selected types. `filterEvents` takes `now` as a required argument rather than defaulting to the real clock, since the seed data is anchored to the fixed `NOW` exported from `events.ts` — use that. Add date-range and event-type (multi-select) controls to the dashboard, wire them to `filterEvents`, and extend `computeMetrics` with conversion rate (share of users who signed up that also purchased), total revenue (sum of purchase values), and a simple per-day event count you can render as a small bar list."
    verification: automated-tests
    verify: { harness: component, functionName: Dashboard, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    weight: 30
    checkpoint: { files: [solution/step-2/Dashboard.tsx, solution/step-2/analytics.ts] }
    hints:
      - "Date-range filtering and type filtering are two independent conditions on the same event — an event passes only when both hold, regardless of which one you check first."
      - "Conversion rate needs to look at users, not events: which users have a signup, which have a purchase, and how much those two sets overlap."
      - "If you reach for `useMemo` around the filtered events for performance, double-check what's actually in its dependency array — it needs to be whatever the computation reads, not just whatever happens to be nearby."
  - id: fix-stale-filter-memoization
    kind: debug
    prompt: "Change the date range or uncheck an event type. The control updates, but the metrics and table don't move — they're still showing whatever the dashboard displayed when it first loaded. Reproduce it, work out why, and make sure every filter change updates the dashboard immediately."
    verification: hybrid
    verify: { harness: component, functionName: Dashboard, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx, tests/step-3.test.tsx] }
    rubric:
      - criterion: Diagnosis
        weight: 40
        detail: "Correctly explains that the filtered events are memoized against a dependency array that doesn't include the filter state (range/types), so React reuses the first render's result forever instead of recomputing when a filter changes."
      - criterion: Sound fix
        weight: 40
        detail: "Fixes the memo's dependency list to include everything the computation actually reads (the range and the selected types), or removes the memoization if it isn't earning its cost; any fix that makes every filter change immediately recompute is valid."
      - criterion: Communication
        weight: 20
        detail: "Explains why the bug wasn't obvious on first load — the default filter happens to match what got memoized — and only shows up the moment a filter actually changes."
    weight: 25
    checkpoint: { files: [solution/step-3/Dashboard.tsx, solution/step-3/analytics.ts] }
    hints:
      - "The dashboard looks completely correct right after it loads. What's special about the very first render compared to every render after it?"
      - "Find the `useMemo` (or equivalent) wrapping the filtered events, and compare what it reads inside the function to what's listed in its dependency array."
      - "The dependency array should name every value the memoized computation actually depends on — here, that's the current range and the current set of selected types, not the static events array."
  - id: scale-performance-and-testing
    kind: explain
    prompt: "Two follow-ups. First: this recomputes filtering and every metric from scratch on every render, over the full event list — if this dashboard had a million events instead of a dozen, what would you change to keep it responsive? Second: how would you gain confidence that `computeMetrics` is correct beyond the handful of cases already tested?"
    verification: rubric
    verify: { harness: none }
    rubric:
      - criterion: Scaling the aggregation
        weight: 40
        detail: "Identifies that recomputing over the full dataset on every render is the bottleneck at scale and proposes a concrete mitigation (correct memoization keyed on the real inputs, pre-indexing events by day/type, incremental aggregation, or moving aggregation off the main thread) with an honest tradeoff."
      - criterion: Testing aggregation correctness
        weight: 35
        detail: "Proposes verifying invariants that should hold for any input (e.g. the per-type counts sum to the total, revenue is non-negative, the day-grouped counts sum to the total) rather than only ever hand-picking more example datasets."
      - criterion: Data/UI separation
        weight: 25
        detail: "Reasons about what `analytics.ts` already buys them (a UI-framework-free module they could unit test, reuse server-side, or swap the rendering layer around) and how they'd extend it if a new metric were requested."
    weight: 20
    hints:
      - "Think about what's recomputed on every keystroke or click versus what's actually invalidated by that change — filtering by type doesn't change what 'last 7 days' means, for instance."
      - "A property that should hold for ANY dataset (not just the one in this workspace) is something you can check automatically across many generated inputs, instead of writing one more hand-picked example."
---

## Overview

The candidate joins a **client-side analytics dashboard**: raw events already
render in a table, but no metrics are computed and there's no filtering.
Over four steps they take it from static to something they'd actually ship —
computing basic counts, building a date-range and event-type filtering system
with the advanced business metrics (conversion rate, revenue, a daily trend)
layered on top, fixing a real memoization bug that silently freezes the
dashboard the first time a filter changes, and reasoning about aggregation at
scale. This is pitched as a senior-leaning interview: the value is in
correct, single-source-of-truth data derivation — not in a charting library.

## Workspace

Three files — `Dashboard.tsx` and `analytics.ts` are both editable, since
this scenario asks for a genuine data-layer/UI split:

- **`Dashboard.tsx`** *(edit, entry)* — the dashboard component. The starter
  renders the raw event table; the candidate adds the metrics summary,
  filter controls, and the trend visualization.
- **`analytics.ts`** *(edit)* — the aggregation and filtering logic. The
  starter's `filterEvents` and `computeMetrics` are placeholders; the
  candidate replaces them with real, pure derivations over the events array.
- **`events.ts`** *(readonly)* — the `AnalyticsEvent` shape and a fixed
  13-event seed dataset spanning the last 24 hours through 60 days ago, so
  every date-range tier (24h / 7d / 30d / all time) shows a different subset.

The candidate should understand all three in well under two minutes — the
starter is intentionally small even though the finished data layer is not.

## Reference Solutions

Authored-only; **stripped before the workspace is served**. The reference
chain is the checkpoint for each step and is what the validator executes
against the tests. Checkpoints are independent snapshots, not diffs — each
lists every file that differs from the starter at that point, even when a
file (like `analytics.ts` between Steps 2 and 3) didn't change:

- `solution/step-1/{Dashboard.tsx,analytics.ts}` — total events, unique
  users, and events-by-type computed and displayed from the full dataset.
- `solution/step-2/{Dashboard.tsx,analytics.ts}` — filtering, the advanced
  metrics, and a minimal trend visualization added. The filtered events are
  memoized against a dependency array that doesn't include the filter
  state — the seed of the Step 3 bug.
- `solution/step-3/{Dashboard.tsx,analytics.ts}` — the memo's dependency list
  now includes the actual filter state; `analytics.ts` is unchanged from
  Step 2.

Each is one valid implementation only. Tests assert observable behavior
(rendered numbers, table contents, control values), so other sound solutions
(a reducer instead of separate `useState` calls, a differently-shaped
`Metrics` object, no memoization at all) pass equally.

## Evaluation Notes

Authored-only. Step 3 is the primary discriminator: it separates candidates
who add `useMemo` as a reflex from those who understand what a dependency
array actually promises. A strong candidate may pre-empt the bug by listing
the real dependencies in Step 2 — a positive signal — in which case Step 3
becomes a discussion ("walk me through why `EVENTS` alone wasn't enough
there"). The `explain` step is discussion-only by design: scaling the
aggregation and testing it more rigorously are reasoned about, never graded
on a specific implementation, to keep every automated check
implementation-agnostic. Checkpoints on steps 1–3 let a stuck candidate keep
moving without collapsing the codebase; they recover *code*, not score.
