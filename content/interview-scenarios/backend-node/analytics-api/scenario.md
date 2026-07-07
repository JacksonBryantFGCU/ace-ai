---
id: analytics-api
title: Analytics API
summary: "Build an Express + SQLite Analytics API with idempotent event ingestion, aggregate reporting, daily active users, and funnel metrics."
category: backend-node
skills:
  - rest-api
  - express
  - sqlite
  - aggregation
jobRoles:
  - backend
  - fullstack
tags:
  - category:backend-rest-api
  - framework:express
  - database:sqlite
  - pattern:analytics-aggregation
difficulty: hard
experienceMin: junior
experienceMax: senior
estimatedMinutes: 60
stack:
  languages:
    - typescript
  harness: node-vm
language:
  primary: typescript
runtime: node
framework: express
verification:
  engine: node
database:
  engine: sqlite
workspace:
  files:
    - { path: app.ts, role: edit }
    - { path: db.ts, role: readonly }
    - { path: backend-types.d.ts, role: readonly }
  entry: app.ts
rubric:
  - criterion: Event ingestion correctness
    weight: 25
    detail: "Validates events, serializes properties safely, handles idempotency by external_id, and returns stable event responses."
  - criterion: Aggregate SQL and time filtering
    weight: 25
    detail: "Uses SQLite aggregation with inclusive time ranges, event type filtering, zero-count types, and distinct active user counts."
  - criterion: Derived analytics metrics
    weight: 20
    detail: "Calculates daily active users with zero-filled days and fixed-stage funnel conversion rates from distinct user counts."
  - criterion: Validation and error handling
    weight: 15
    detail: "Handles shared reporting validation, missing accounts, invalid timestamps, invalid event types, and stable JSON error shapes."
  - criterion: Maintainability
    weight: 15
    detail: "Preserves previous behavior, avoids unsafe SQL construction, keeps helper code readable, and does not expose database-only fields."
source: authored
status: verified
version: 1
steps:
  - id: event-ingestion
    kind: implement
    prompt: "Implement POST /events in workspace/app.ts. Validate event payloads, verify accounts, store properties as JSON text, return parsed properties, generate created_at, and make duplicate external_id submissions idempotent."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Check for an existing external_id before inserting a new event."
      - "Validate properties as a plain object and store it with JSON.stringify."
      - "Return properties, not properties_json."
  - id: event-counts-and-dau
    kind: implement
    prompt: "Add GET /analytics/events and GET /analytics/daily-active-users. Reuse shared account/time-range validation, aggregate counts in SQLite, support event_type filtering, count distinct active users by UTC day, and fill missing days."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-2.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-2/app.ts] }
    hints:
      - "Reporting endpoints require account_id, start, and end."
      - "Use GROUP BY event_type for event counts and GROUP BY substr(occurred_at, 1, 10) for daily buckets."
      - "Initialize zero values before applying aggregate rows."
  - id: funnel-metrics
    kind: implement
    prompt: "Add GET /analytics/funnel. Count distinct users for signup, project_created, and subscription_started in a time range, calculate conversion rates relative to signup users, and keep previous endpoints working."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-3.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-3/app.ts] }
    hints:
      - "The funnel stages are fixed and ordered: signup, project_created, subscription_started."
      - "This scenario does not require per-user event ordering."
      - "If there are zero signup users, all conversion rates should be 0."
---

## Overview

You are working on an internal analytics service for a SaaS product. The service
ingests product events and exposes reporting endpoints used by product and
customer success dashboards.

The Express app and SQLite database bridge already exist. Implement the missing
route behavior in `workspace/app.ts` while preserving earlier functionality as
you move through the steps.

Difficulty: Hard. Expected time: 45-60 minutes.

## Tech Stack

- TypeScript
- Node
- Express
- SQLite

## Database

The database is already created and seeded before each verification run:

```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  account_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  properties_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
```

Valid event types:

- `page_view`
- `signup`
- `project_created`
- `invite_sent`
- `subscription_started`
- `subscription_cancelled`

Store event properties as JSON text in SQLite, but return them as `properties`
objects from the API. Do not return `properties_json`.

## Time Range Rules

Reporting endpoints require:

- `account_id`
- `start`
- `end`

`account_id` must be a positive integer and must refer to an existing account.
`start` and `end` must be valid ISO-style timestamps. If `start` is after `end`,
return `{ "error": "Invalid time range" }`.

Time ranges are inclusive:

```txt
occurred_at >= start
occurred_at <= end
```

## Step 1: Event Ingestion

Implement:

- `POST /events`

Request body:

```json
{
  "external_id": "evt_1001",
  "account_id": 1,
  "user_id": "user_123",
  "event_type": "page_view",
  "occurred_at": "2025-01-10T09:00:00.000Z",
  "properties": {
    "path": "/dashboard"
  }
}
```

Requirements:

- Require a non-empty `external_id`.
- Require and validate `account_id`, then verify the account exists.
- Require a non-empty `user_id`.
- Validate `event_type`.
- Require and validate `occurred_at`.
- Validate optional `properties` as an object.
- Default missing `properties` to `{}`.
- Trim string fields where appropriate.
- Store `properties` as JSON text.
- Return `properties` as an object.
- Generate `created_at` server-side.
- Make duplicate `external_id` submissions idempotent: return the existing event
  with status 200 and `duplicate: true`.
- Return newly created events with status 201.

Validation errors:

- `{ "error": "External id is required" }`
- `{ "error": "Account id is required" }`
- `{ "error": "Invalid account id" }`
- `{ "error": "Account not found" }`
- `{ "error": "User id is required" }`
- `{ "error": "Invalid event type" }`
- `{ "error": "Occurred at is required" }`
- `{ "error": "Invalid occurred at" }`
- `{ "error": "Invalid properties" }`

## Step 2: Event Counts and Daily Active Users

Implement:

- `GET /analytics/events`
- `GET /analytics/daily-active-users`

`GET /analytics/events` should return total event counts and counts by event
type for an account and inclusive time range:

```json
{
  "total_events": 18,
  "by_type": {
    "page_view": 10,
    "signup": 2,
    "project_created": 3,
    "invite_sent": 2,
    "subscription_started": 1,
    "subscription_cancelled": 0
  }
}
```

Requirements:

- Validate shared reporting parameters.
- Count events with SQLite aggregation.
- Include zero counts for every event type.
- Support optional `event_type` filtering.
- Reject invalid event type filters.

`GET /analytics/daily-active-users` should return distinct active users per UTC
calendar day:

```json
{
  "days": [
    { "date": "2025-01-10", "active_users": 3 },
    { "date": "2025-01-11", "active_users": 2 },
    { "date": "2025-01-12", "active_users": 0 }
  ]
}
```

Requirements:

- Count distinct `user_id` per day.
- Include every calendar date in the inclusive range.
- Include zero-activity days.
- Order dates ascending.

## Step 3: Funnel Metrics

Implement:

- `GET /analytics/funnel`

The funnel stages are fixed:

- `signup`
- `project_created`
- `subscription_started`

Response shape:

```json
{
  "funnel": [
    { "stage": "signup", "users": 10, "conversion_rate": 1 },
    { "stage": "project_created", "users": 6, "conversion_rate": 0.6 },
    { "stage": "subscription_started", "users": 3, "conversion_rate": 0.3 }
  ]
}
```

Requirements:

- Validate shared reporting parameters.
- Count distinct users for each fixed stage.
- Preserve stage order exactly.
- Conversion rates are relative to signup users.
- The first stage conversion rate is `1` when signup users exist.
- If signup users are zero, all conversion rates are `0`.
- Return numbers, not percentage strings.
- Round rates to two decimal places when needed.

This is a simple stage-count funnel. You do not need to enforce event ordering
per user.

## Workspace

- **`app.ts`** *(edit, entry)* - the Express app and route handlers.
- **`db.ts`** *(readonly)* - re-exports the SQLite database injected by the
  verification engine.
- **`backend-types.d.ts`** *(readonly)* - editor declarations for Express and
  the injected SQLite handle.

## Reference Solutions

- `solution/step-1/app.ts` - idempotent event ingestion.
- `solution/step-2/app.ts` - ingestion plus event counts and daily active users.
- `solution/step-3/app.ts` - full API surface with funnel metrics.

## Evaluation Notes

The tests are cumulative. Each checkpoint must preserve behavior from earlier
steps while adding the current step's behavior.

Strong solutions validate before mutating, use parameterized SQLite queries,
aggregate in SQL where appropriate, fill missing reporting buckets deliberately,
handle duplicate event ingestion idempotently, and keep JSON response contracts
stable.

Reference solutions live under `solution/step-N/`, so they import readonly
workspace helpers with paths like `../../workspace/db`. When a checkpoint is
applied to the candidate workspace, the checkpoint source normalizes that import
to `./db` because the solution file is overlaid at the workspace root as
`app.ts`.
