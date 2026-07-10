---
id: subscription-settings-dashboard
title: Subscription Settings Dashboard
summary: "Build a subscription settings dashboard with a React frontend and an Express + SQLite backend."
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
difficulty: medium
experienceMin: entry
experienceMax: junior
estimatedMinutes: 50
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
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements subscription and plan loading, plan/billing/seat updates, and cancellation/reactivation with correct subscription-state rules and stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, shows the current plan and available plans, updates plan/billing/seats, and cancels/reactivates through the API."
  - criterion: Fullstack integration
    weight: 25
    detail: "Uses VITE_API_BASE_URL, preserves backend state across refreshes, and surfaces backend validation in the UI."
  - criterion: Code clarity
    weight: 15
    detail: "Keeps the React and Express code readable, focused, and consistent with the scenario conventions."
  - criterion: Accessibility and UX
    weight: 10
    detail: "Uses accessible labels, clear controls, and predictable feedback during loading, errors, and saves."
source: authored
status: verified
visibility: public
version: 1
steps:
  - id: load-subscription
    kind: implement
    prompt: "Complete the subscription loading workflow. The backend should return the current customer's subscription (joined with customer and plan) and the list of active plans, and the frontend should fetch both from VITE_API_BASE_URL and render loading/error states, the current plan/status, and the available plans."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend subscription and plan loading
        weight: 35
        detail: "GET /subscription returns the current customer's subscription joined with customer and plan details using the documented response shape; GET /plans returns only active plans ordered by price_cents ascending then id ascending."
      - criterion: Frontend loading flow
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL, renders loading/error states, and shows the customer, current plan/status, and available plans."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not rely on hardcoded subscription or plan data."
    weight: 30
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "The current customer is always id 1 — there's no login or customer switching in this scenario."
      - "Inactive plans are hidden from GET /plans, even though a subscription can still reference one."
  - id: update-plan-billing-seats
    kind: implement
    prompt: "Add the ability to change plan, billing cycle, and seats. PATCH /subscription should validate the request and enforce the subscription-state rules, and the UI should expose plan, billing cycle, and seats controls with an update action and backend validation error display."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend update validation
        weight: 35
        detail: "PATCH /subscription rejects unknown/empty updates, validates plan_id, billing_cycle, and seats, enforces that cancelled subscriptions can't be changed and past_due subscriptions can't change plan, and enforces the seat/plan-minimum rule using the resulting plan even when only one field changes."
      - criterion: Frontend update workflow
        weight: 35
        detail: "The UI lets the candidate change plan, billing cycle, and seats through the backend, and shows backend validation errors and the updated state from the saved response."
      - criterion: Previous behavior
        weight: 30
        detail: "The unmodified subscription loading and plan listing behavior remains intact."
    weight: 30
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "Only plan_id, billing_cycle, and seats are allowed in the PATCH body — reject anything else with { error: \"Unknown update field\" }."
      - "When plan_id isn't provided, validate seats against the current plan's seats_included; when it is provided, validate against the new plan's."
      - "A cancelled subscription rejects the whole update; a past_due subscription only rejects a plan_id change."
  - id: cancel-and-reactivate
    kind: implement
    prompt: "Implement cancellation and reactivation. POST /subscription/cancel and POST /subscription/reactivate should enforce the documented state rules, and the React UI should let a candidate cancel or reactivate, show a scheduled-cancellation indicator, display backend validation errors, and persist changes after reload."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend cancellation and reactivation rules
        weight: 30
        detail: "POST /subscription/cancel and POST /subscription/reactivate enforce the documented validation, including rejecting an already-cancelled subscription, a duplicate scheduled cancellation, and reactivating a subscription with no scheduled cancellation."
      - criterion: Frontend cancel/reactivate workflow
        weight: 30
        detail: "The UI submits cancellation and reactivation through the backend, shows validation errors, and updates the scheduled-cancellation indicator from the saved response."
      - criterion: Persistence
        weight: 25
        detail: "Successful cancellation and reactivation persist in the backend and remain visible after reload."
      - criterion: Previous behavior
        weight: 15
        detail: "Subscription loading, plan listing, and plan/billing/seat updates continue to work after cancellation and reactivation are implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Cancellation sets cancel_at_period_end to true; it does not change status to cancelled immediately."
      - "Reactivating a subscription that was never scheduled for cancellation returns { error: \"Subscription is not scheduled for cancellation\" } with HTTP 400."
      - "After a successful cancel or reactivate, use the backend response to update both the status indicator and the cancellation button shown."
---

## Overview

You are building a subscription settings dashboard in a fullstack React +
Express + SQLite workspace. The app must call the real backend, persist
updates for the life of the running process, and keep earlier behavior
working as you move through the steps.

## Product Context

You are working on the account settings area of a SaaS product. A customer
needs to see their current plan and billing status, review the plans they
could switch to, change their plan, billing cycle, or seat count, and cancel
or reactivate their subscription. The frontend must call the real backend
API, and changes should persist for the life of the running backend process.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns three tables:

```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE plans (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  seats_included INTEGER NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  seats INTEGER NOT NULL,
  cancel_at_period_end INTEGER NOT NULL,
  current_period_end TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);
```

Valid plan tiers are `starter`, `pro`, and `business`. Valid subscription
statuses are `active`, `past_due`, and `cancelled`. Valid billing cycles are
`monthly` and `annual`. Money is stored in integer cents.

There is no login or customer switching in this scenario — every endpoint
operates on the fixed current customer, id `1`.

A subscription response joins in the customer and plan:

```json
{
  "customer": {
    "id": 1,
    "name": "Alex Rivera",
    "email": "alex@example.com"
  },
  "subscription": {
    "id": 1,
    "status": "active",
    "billing_cycle": "monthly",
    "seats": 5,
    "cancel_at_period_end": false,
    "current_period_end": "2025-03-01T00:00:00.000Z",
    "created_at": "2025-01-10T09:00:00.000Z",
    "updated_at": "2025-01-10T09:00:00.000Z"
  },
  "plan": {
    "id": 2,
    "name": "Pro",
    "tier": "pro",
    "price_cents": 4900,
    "seats_included": 5
  }
}
```

`cancel_at_period_end` is a boolean in every response, even though it's
stored as `0`/`1` in SQLite.

A plan response is:

```json
{
  "id": 2,
  "name": "Pro",
  "tier": "pro",
  "price_cents": 4900,
  "seats_included": 5
}
```

Errors are always `{ "error": "Human-readable message" }`.

### Subscription rules

- only active plans can be selected on `PATCH /subscription`
- a cancelled subscription cannot change plan, billing cycle, or seats — any
  `PATCH /subscription` on it is rejected
- a past_due subscription cannot change plan, but can still change billing
  cycle and/or seats
- an active subscription can change plan, billing cycle, and seats
- seats must be an integer between 1 and 100
- seats can never be lower than the resulting plan's `seats_included` — the
  resulting plan is the new plan if `plan_id` is provided, otherwise the
  subscription's current plan
- cancellation sets `cancel_at_period_end` to `true`; it does not change
  `status`
- reactivation clears `cancel_at_period_end`; it does not change `status`
- a cancelled subscription cannot be reactivated
- `updated_at` changes on every successful update

### `GET /subscription`

Returns the current customer's subscription.

Response: `{ "customer": {}, "subscription": {}, "plan": {} }`.

Validation: no subscription for the current customer → 404
`{ "error": "Subscription not found" }`.

### `GET /plans`

Returns active plans only, ordered by `price_cents` ascending, then `id`
ascending.

Response: `{ "plans": [] }`.

Inactive plans are hidden, even if the current customer's subscription
references one.

### `PATCH /subscription`

Updates plan, billing cycle, and/or seats on the current customer's
subscription. Allowed fields: `plan_id`, `billing_cycle`, `seats`.

Request: `{ "plan_id": 3, "billing_cycle": "annual", "seats": 10 }` (any
non-empty subset of these three fields).

Success: `200` with `{ "customer": {}, "subscription": {}, "plan": {} }`.

Validation, in order:

- no subscription for the current customer → `404`
  `{ "error": "Subscription not found" }`
- empty body → `400` `{ "error": "No update fields provided" }`
- any field other than `plan_id`/`billing_cycle`/`seats` → `400`
  `{ "error": "Unknown update field" }`
- subscription status is `cancelled` → `400`
  `{ "error": "Subscription cannot be changed" }`
- subscription status is `past_due` and `plan_id` is present → `400`
  `{ "error": "Subscription cannot be changed" }`
- `plan_id` present but not a positive integer → `400`
  `{ "error": "Invalid plan id" }`
- `plan_id` present but no matching plan → `404`
  `{ "error": "Plan not found" }`
- `plan_id` present but the plan is inactive → `400`
  `{ "error": "Plan is inactive" }`
- `billing_cycle` present but not `monthly`/`annual` → `400`
  `{ "error": "Invalid billing cycle" }`
- `seats` present but not an integer from 1-100 → `400`
  `{ "error": "Invalid seats" }`
- resulting seats below the resulting plan's `seats_included` → `400`
  `{ "error": "Seat count is below plan minimum" }`

### `POST /subscription/cancel`

Schedules the current customer's subscription to cancel at the end of the
current billing period.

Success: `200` with `{ "customer": {}, "subscription": { "cancel_at_period_end": true, ... }, "plan": {} }`.

Validation: no subscription → `404` `{ "error": "Subscription not found" }`;
already `cancelled` → `400` `{ "error": "Subscription is already cancelled" }`;
already scheduled (`cancel_at_period_end` already `true`) → `400`
`{ "error": "Cancellation is already scheduled" }`.

### `POST /subscription/reactivate`

Clears a scheduled cancellation on the current customer's subscription.

Success: `200` with `{ "customer": {}, "subscription": { "cancel_at_period_end": false, ... }, "plan": {} }`.

Validation: no subscription → `404` `{ "error": "Subscription not found" }`;
already `cancelled` → `400` `{ "error": "Subscription is already cancelled" }`;
not currently scheduled (`cancel_at_period_end` is `false`) → `400`
`{ "error": "Subscription is not scheduled for cancellation" }`.

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading and error states; show the current customer,
plan, status, billing cycle, seats, and renewal date; list available plans;
let the candidate change plan, billing cycle, and seats; display backend
validation errors; cancel and reactivate the subscription; show a scheduled
cancellation indicator; and show persisted changes after reload.

## Reference Flow

1. Load the current subscription and active plans, and render them.
2. Change plan, billing cycle, and/or seats through the backend API,
   including the validation errors for an invalid or too-small seat count.
3. Cancel and reactivate the subscription through the backend API, including
   the scheduled-cancellation indicator and persisted changes after reload.
