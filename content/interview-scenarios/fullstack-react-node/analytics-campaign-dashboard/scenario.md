---
id: analytics-campaign-dashboard
title: Analytics Campaign Dashboard
summary: "Build an internal marketing analytics dashboard with a React frontend and an Express + SQLite backend."
category: fullstack-react-node
skills:
  - react
  - express
  - sqlite
  - integration
jobRoles:
  - fullstack
tags:
  - framework:react
  - framework:express
  - database:sqlite
difficulty: hard
experienceMin: junior
experienceMax: senior
estimatedMinutes: 70
stack:
  languages:
    - typescript
  harness: component
type: fullstack
frontend:
  framework: react
  bundler: vite
backend:
  framework: express
  database: sqlite
execution:
  mode: fullstack
workspace:
  files:
    - { path: backend/package.json, role: readonly }
    - { path: backend/tsconfig.json, role: readonly }
    - { path: backend/src/db.ts, role: readonly }
    - { path: backend/src/app.ts, role: edit }
    - { path: backend/src/server.ts, role: readonly }
    - { path: frontend/package.json, role: readonly }
    - { path: frontend/index.html, role: readonly }
    - { path: frontend/tsconfig.json, role: readonly }
    - { path: frontend/vite.config.ts, role: readonly }
    - { path: frontend/src/types.ts, role: readonly }
    - { path: frontend/src/api.ts, role: edit }
    - { path: frontend/src/App.tsx, role: edit }
    - { path: frontend/src/main.tsx, role: readonly }
    - { path: frontend/src/styles.css, role: edit }
    - { path: shared/analytics.ts, role: readonly }
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements the joined/aggregated campaign query and detail, date-bounded metric aggregation, filtering, summary KPIs, and budget/status updates with correct transition rules and stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, lists and filters campaigns, shows campaign KPIs and daily metrics, updates budget and status, and surfaces backend validation."
  - criterion: Fullstack integration
    weight: 25
    detail: "Uses VITE_API_BASE_URL, preserves backend state across refreshes, and surfaces backend validation errors in the UI."
  - criterion: Code clarity
    weight: 15
    detail: "Keeps the React and Express code readable, focused, and consistent with the scenario conventions, including the SQLite aggregation and derived-metric math."
  - criterion: Accessibility and UX
    weight: 10
    detail: "Uses accessible labels, clear controls, and predictable feedback during loading, errors, and saves."
source: authored
status: verified
visibility: public
version: 1
steps:
  - id: load-campaign-analytics
    kind: implement
    prompt: "Complete the campaign analytics loading workflow. The backend should aggregate each campaign's metrics (with zero-denominator-safe derived KPIs) joined with its channel, return campaign detail with ordered daily metrics, and return channel options; the frontend should fetch all three from VITE_API_BASE_URL and render loading/error/empty states, the campaign list, and the selected campaign's KPIs and daily metrics."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend aggregated campaign query
        weight: 35
        detail: "GET /campaigns joins each campaign to its channel, sums its metrics (0 when it has none), computes ctr/conversion_rate/cpa_cents/roas/budget_remaining_cents/over_budget with the documented zero-denominator rules, and orders by status group (active, paused, draft, completed), then starts_at descending, then id ascending; GET /campaigns/:id returns the same aggregated campaign plus its daily metrics ordered by metric_date then id; GET /campaign-options returns every channel."
      - criterion: Frontend campaign list and detail rendering
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL, renders loading/error/empty states, lists campaigns, and shows the selected campaign's derived KPIs and daily metrics using only backend-computed values."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not compute authoritative KPIs itself and does not rely on hardcoded campaign data."
    weight: 30
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "A campaign with no metric rows should still return zero-valued metrics, not a missing metrics object — use SUM with COALESCE(..., 0) rather than requiring a match."
      - "Apply each zero-denominator rule independently: ctr is 0 only when impressions is 0, conversion_rate only when clicks is 0, cpa_cents only when conversions is 0, and roas only when spend_cents is 0."
  - id: filter-and-summarize
    kind: implement
    prompt: "Add status, channel, and date-range filtering plus a summary KPI panel. GET /campaigns and GET /campaigns/:id should validate and apply the optional status, channel_id, start_date, and end_date parameters (date filters bound which daily metrics are aggregated), GET /campaigns/summary should return aggregate dashboard KPIs for the same filters, and the UI should expose the filters and the summary panel."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend filters and summary
        weight: 35
        detail: "GET /campaigns validates status/channel_id/start_date/end_date (including start_date <= end_date), date filters bound metric aggregation without hiding campaigns that simply have no metrics in range, and GET /campaigns/summary returns correct per-status counts (including zero), aggregate KPIs, and an over-budget count for the same filters."
      - criterion: Frontend filters and summary panel
        weight: 35
        detail: "The UI lets users filter by status, channel, and date range, shows the summary KPI panel, and displays backend validation errors (e.g. an invalid date range) without crashing."
      - criterion: Previous behavior
        weight: 30
        detail: "Unfiltered campaign loading and the campaign detail view remain intact."
    weight: 30
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "Date filters change which campaign_metrics rows are summed (via the join condition), not which campaigns are returned (via the where clause) — a campaign that matches the status/channel filters should still appear even with zero metrics in the date range."
      - "start_date and end_date must each be well-formed YYYY-MM-DD strings before you compare them to each other."
      - "The summary's over_budget count is the number of campaigns (after filtering) whose filtered spend exceeds their budget — recompute it from the same aggregated rows you already have, don't query it separately."
  - id: update-budget-and-status
    kind: implement
    prompt: "Implement campaign budget and status updates. PATCH /campaigns/:id should accept budget_cents and/or status, reject anything else, enforce the status transition graph, and refuse any update once a campaign is completed. The React UI should let a candidate update budget and status, display backend validation errors, and update the campaign, its detail, and the summary from the saved response."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend update validation and transition rules
        weight: 30
        detail: "PATCH /campaigns/:id validates the id, requires at least one recognized field, rejects unknown fields, validates budget (integer >= 0) and status independently, enforces the documented transition graph, rejects any update on a completed campaign, and returns the campaign with recalculated metrics."
      - criterion: Frontend update workflow
        weight: 30
        detail: "The UI submits budget and status updates through the backend, shows validation errors, and updates the campaign's card, its detail KPIs, and the summary panel from the saved response."
      - criterion: Persistence
        weight: 25
        detail: "A successful update persists in the backend and remains visible after reload."
      - criterion: Previous behavior
        weight: 15
        detail: "Campaign loading, filtering, and the summary panel continue to work after updates are implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Allowed transitions: draft -> active, draft -> paused, active -> paused, active -> completed, paused -> active, paused -> completed. Everything else, including a no-op, is invalid."
      - "An empty update body and a body with only unrecognized fields are two different errors — check for zero keys before checking for unknown keys."
      - "After a successful update, use the backend response to refresh that campaign's card, its detail panel, and the summary — don't recompute KPIs on the frontend."
---

## Overview

You are building an internal marketing analytics dashboard in a fullstack
React + Express + SQLite workspace. The app must call the real backend,
persist updates for the life of the running process, and keep earlier
behavior working as you move through the steps.

## Product Context

You are working on an internal console for a marketing team running
campaigns across several channels. The team needs to see every campaign's
performance at a glance, drill into a campaign's day-by-day metrics, filter
by status/channel/date range, watch aggregate KPIs, and adjust a campaign's
budget or move it through its lifecycle as work progresses. The frontend
must call the real backend API, and changes should persist for the life of
the running backend process. Every derived metric shown in the UI must come
from the backend — the frontend only renders what it's given.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns three tables:

```sql
CREATE TABLE channels (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY,
  channel_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  budget_cents INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE TABLE campaign_metrics (
  id INTEGER PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  metric_date TEXT NOT NULL,
  impressions INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  conversions INTEGER NOT NULL,
  spend_cents INTEGER NOT NULL,
  revenue_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);
```

Valid campaign statuses are `draft`, `active`, `paused`, and `completed`.
Money is stored as integer cents. `metric_date` is stored as `YYYY-MM-DD`.

A campaign response joins in its channel and aggregated, derived metrics:

```json
{
  "id": 1,
  "name": "Spring Launch",
  "status": "active",
  "budget_cents": 250000,
  "starts_at": "2025-02-01T00:00:00.000Z",
  "ends_at": "2025-02-28T23:59:59.000Z",
  "channel": { "id": 1, "name": "Search", "slug": "search" },
  "metrics": {
    "impressions": 12000,
    "clicks": 840,
    "conversions": 72,
    "spend_cents": 95000,
    "revenue_cents": 210000,
    "ctr": 0.07,
    "conversion_rate": 0.0857,
    "cpa_cents": 1319,
    "roas": 2.2105,
    "budget_remaining_cents": 155000,
    "over_budget": false
  },
  "created_at": "2025-01-10T09:00:00.000Z",
  "updated_at": "2025-01-10T09:00:00.000Z"
}
```

A daily metric row includes the same derived rates for that single day:

```json
{
  "id": 1,
  "campaign_id": 1,
  "metric_date": "2025-02-10",
  "impressions": 1000,
  "clicks": 80,
  "conversions": 6,
  "spend_cents": 9000,
  "revenue_cents": 18000,
  "ctr": 0.08,
  "conversion_rate": 0.075,
  "cpa_cents": 1500,
  "roas": 2
}
```

Errors always take the shape `{ "error": "Human-readable message" }`.

### Derived metric rules

```txt
ctr = clicks / impressions                 (0 if impressions is 0)
conversion_rate = conversions / clicks      (0 if clicks is 0)
cpa_cents = spend_cents / conversions       (0 if conversions is 0)
roas = revenue_cents / spend_cents          (0 if spend_cents is 0)
budget_remaining_cents = budget_cents - spend_cents
over_budget = spend_cents > budget_cents
```

Rates (`ctr`, `conversion_rate`, `roas`) are rounded to 4 decimal places.
`cpa_cents` is rounded to the nearest integer cent. All of this is computed
server-side — the frontend must render backend values, not recompute them.

### `GET /campaigns`

Returns `{ "campaigns": [] }`, each with metrics summed across all of its
`campaign_metrics` rows (0 for a campaign with none). Ordered by status
group (`active`, `paused`, `draft`, `completed`), then `starts_at`
descending, then `id` ascending.

Supports optional `status`, `channel_id`, `start_date`, and `end_date`
query parameters, combinable. Date filters bound *which metric rows are
summed* — a campaign that matches the other filters still appears (with
zero metrics) even if it has no metrics in the date range.

Validation: invalid `status` → 400 `Invalid campaign status`; invalid
`channel_id` → 400 `Invalid channel id`; missing channel → 404
`Channel not found`; malformed `start_date`/`end_date` → 400
`Invalid start date` / `Invalid end date`; `start_date` after `end_date` →
400 `Invalid date range`.

### `GET /campaigns/:id`

Returns `{ "campaign": {}, "daily_metrics": [] }`, daily metrics ordered by
`metric_date` ascending then `id` ascending. Supports the same optional
`start_date`/`end_date` filters and validation as `GET /campaigns`, applied
to both the aggregated `campaign.metrics` and the returned `daily_metrics`.

Validation: invalid id → 400 `Invalid campaign id`; missing campaign → 404
`Campaign not found`; same date validation as above.

### `GET /campaign-options`

Returns `{ "channels": [] }` — every channel, ordered by `id` ascending.

### `GET /campaigns/summary`

Returns aggregate dashboard KPIs across every campaign matching the same
optional `status`/`channel_id`/`start_date`/`end_date` filters as
`GET /campaigns`:

```json
{
  "summary": {
    "total_campaigns": 8,
    "active": 2,
    "paused": 2,
    "draft": 2,
    "completed": 2,
    "impressions": 43800,
    "clicks": 2790,
    "conversions": 246,
    "spend_cents": 462000,
    "revenue_cents": 968000,
    "ctr": 0.0637,
    "conversion_rate": 0.0882,
    "cpa_cents": 1878,
    "roas": 2.0952,
    "over_budget": 2
  }
}
```

Every status key is present, including zero. `over_budget` counts
campaigns (after filtering) whose filtered spend exceeds their budget.

### `PATCH /campaigns/:id`

Updates `budget_cents` and/or `status`. Request body may include either or
both fields.

Validation, checked in this order:

- invalid id → 400 `Invalid campaign id`
- missing campaign → 404 `Campaign not found`
- empty body → 400 `No update fields provided`
- any field other than `budget_cents`/`status` → 400 `Unknown update field`
- `budget_cents` present but not an integer >= 0 → 400 `Invalid budget`
- `status` present but not a valid status → 400 `Invalid campaign status`
- `status` present but not a valid transition from the current status →
  400 `Invalid status transition`
- the campaign's current status is `completed` → 400 `Campaign is completed`

Allowed status transitions:

```txt
draft -> active
draft -> paused
active -> paused
active -> completed
paused -> active
paused -> completed
completed -> (none — terminal)
```

On success: `updated_at` changes, and the response is
`{ "campaign": {} }` with metrics recalculated from the campaign's full
metric history (same shape as `GET /campaigns/:id`'s `campaign` field).

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading, error, and empty states; list campaigns and
show the selected campaign's KPIs and daily metrics; filter by status,
channel, and date range; show a summary KPI panel; update a campaign's
budget and status; display backend validation errors; and show persisted
changes after reload.

## Reference Flow

1. Load campaigns and render the selected campaign's KPIs and daily
   metrics.
2. Filter by status, channel, or date range and view the summary panel.
3. Update a campaign's budget or status through the backend API, including
   the validation errors for invalid transitions and persisted successful
   changes.
