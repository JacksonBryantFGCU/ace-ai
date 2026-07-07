---
id: url-shortener-api
title: URL Shortener API
summary: "Build an Express + SQLite URL Shortener API with validated link creation, redirects, click tracking, updates, and analytics."
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
  - pattern:redirect-analytics
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
  - criterion: Link creation and validation
    weight: 25
    detail: "Validates original URLs, custom aliases, titles, expirations, uniqueness, and deterministic generated short codes."
  - criterion: Link reads and response shaping
    weight: 15
    detail: "Lists and fetches links with click counts, boolean active state, computed expiration state, filters, and stable JSON shapes."
  - criterion: Redirects and click tracking
    weight: 20
    detail: "Resolves active non-expired links, rejects inactive or expired links, redirects safely, and records exactly one click per successful redirect."
  - criterion: Updates and expiration handling
    weight: 15
    detail: "Validates allowed update fields, preserves immutable link fields, updates active/title/expiration state, and refreshes updated_at."
  - criterion: Analytics correctness
    weight: 25
    detail: "Aggregates clicks by UTC date and referrer, normalizes direct traffic, respects inclusive ranges, and zero-fills ranged daily buckets."
source: authored
status: verified
version: 1
steps:
  - id: create-and-fetch-links
    kind: implement
    prompt: "Implement POST /links, GET /links, and GET /links/:shortCode. Validate URLs and aliases, generate unique short codes, create active links, include click counts, compute expiration state, and support active/expired filters."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Use the URL constructor for validation and require http or https."
      - "Generated short codes should retry when a collision exists."
      - "Return is_active as a boolean even though SQLite stores 0 or 1."
  - id: redirects-and-updates
    kind: implement
    prompt: "Add GET /r/:shortCode and PATCH /links/:shortCode. Successful redirects should record clicks and return 302. Updates should validate allowed fields and return the updated link with click count."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-2.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-2/app.ts] }
    hints:
      - "Check inactive links before expired links."
      - "Failed redirects should not record clicks."
      - "Allow expires_at: null to clear expiration."
  - id: click-analytics
    kind: implement
    prompt: "Add GET /links/:shortCode/analytics. Aggregate clicks by UTC date and referrer, normalize missing referrers to direct, support optional inclusive start/end ranges, and zero-fill days only when a range is provided."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-3.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-3/app.ts] }
    hints:
      - "If start is provided, end is required, and vice versa."
      - "Use substr(clicked_at, 1, 10) for UTC day buckets."
      - "Order referrers by clicks DESC, then referrer ASC."
---

## Overview

You are working on a URL shortening service for a small developer tools product.
The service creates short links, redirects users to original URLs, tracks clicks,
and reports simple link analytics.

Difficulty: Hard. Expected time: 45-60 minutes.

## Tech Stack

- TypeScript
- Node
- Express
- SQLite

## Database

The database is already created and seeded before each verification run:

```sql
CREATE TABLE links (
  id INTEGER PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  title TEXT,
  is_active INTEGER NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE clicks (
  id INTEGER PRIMARY KEY,
  link_id INTEGER NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  clicked_at TEXT NOT NULL,
  FOREIGN KEY (link_id) REFERENCES links(id)
);
```

## Rules

Short codes may contain `A-Z`, `a-z`, `0-9`, `-`, and `_`. Generated codes are
six characters. Custom aliases must be 3-32 characters and unique.

Original URLs must be valid absolute `http:` or `https:` URLs. Do not silently
add a protocol.

Links may expire. Expired links should not redirect, but should still appear in
list/detail responses with `is_expired: true`.

## Step 1: Create and Fetch Short Links

Implement:

- `POST /links`
- `GET /links`
- `GET /links/:shortCode`

Requirements:

- Validate `original_url`, optional `custom_alias`, optional `title`, and optional `expires_at`.
- Use a custom alias as `short_code` when provided.
- Generate a unique six-character short code when no alias is provided.
- Retry generated codes when collisions exist.
- Create active links.
- Return `is_active` as boolean and compute `is_expired`.
- Include `click_count`.
- Support `active` and `expired` filters on `GET /links`.

## Step 2: Redirects and Link Updates

Implement:

- `GET /r/:shortCode`
- `PATCH /links/:shortCode`

Successful redirects should return 302 with a `Location` header and record one
click with optional referrer and user-agent. Missing, inactive, and expired links
should not record clicks.

Updates may change `title`, `is_active`, and `expires_at`. Reject unknown fields,
validate each allowed field, allow `expires_at: null`, update `updated_at`, and
preserve `short_code` and `original_url`.

## Step 3: Click Analytics

Implement:

- `GET /links/:shortCode/analytics`

Return total clicks, clicks by UTC date, and clicks by referrer. Treat missing or
empty referrer as `direct`. If `start` or `end` is provided, both are required.
Ranges are inclusive. With a range, include zero-click days. Without a range,
include only days with clicks.

## Workspace

- **`app.ts`** *(edit, entry)* - the Express app and route handlers.
- **`db.ts`** *(readonly)* - re-exports the SQLite database injected by the verification engine.
- **`backend-types.d.ts`** *(readonly)* - editor declarations for Express and the injected SQLite handle.

## Reference Solutions

- `solution/step-1/app.ts` - link creation and reads.
- `solution/step-2/app.ts` - link creation/reads plus redirects and updates.
- `solution/step-3/app.ts` - full API with analytics.

## Evaluation Notes

The tests are cumulative. Strong solutions validate before mutating, use
parameterized SQLite queries, avoid random-only generated codes, record clicks
only for successful redirects, and keep analytics response shapes stable.

Reference solutions live under `solution/step-N/`, so they import readonly
workspace helpers with paths like `../../workspace/db`. When a checkpoint is
applied to the candidate workspace, the checkpoint source normalizes that import
to `./db`.
