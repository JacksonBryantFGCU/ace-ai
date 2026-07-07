---
id: notes-rest-api
title: Notes REST API
summary: "Build a small Express + SQLite Notes REST API with read, create, validation, and delete behavior."
category: backend-node
skills:
  - rest-api
  - express
  - sqlite
  - validation
jobRoles:
  - backend
  - fullstack
tags:
  - category:backend-rest-api
  - framework:express
  - database:sqlite
  - pattern:crud
difficulty: easy
experienceMin: entry
experienceMax: senior
estimatedMinutes: 25
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
  - criterion: HTTP API correctness
    weight: 45
    detail: "Implements the required Notes endpoints with the expected response bodies and status codes."
  - criterion: SQLite persistence
    weight: 35
    detail: "Reads, inserts, and deletes notes through the provided SQLite database without in-memory shortcuts."
  - criterion: Input validation and edge cases
    weight: 20
    detail: "Rejects invalid input and handles missing or invalid note ids consistently."
source: authored
status: verified
version: 1
steps:
  - id: return-notes
    kind: implement
    prompt: "Implement the read side of the API in workspace/app.ts. GET /notes should return all notes ordered by id, and GET /notes/:id should return one note or HTTP 404 when it does not exist."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Use db.all for the collection endpoint and db.get for the single-note endpoint."
      - "Route params are strings; convert req.params.id to a number before querying by id."
      - "For a missing note, return HTTP 404 with a small JSON error body."
  - id: create-notes
    kind: implement
    prompt: "Add POST /notes. Validate that title and content are non-empty strings, reject invalid bodies with HTTP 400, insert valid notes into SQLite, and return the created note with HTTP 201."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-2.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-2/app.ts] }
    hints:
      - "Call app.use(express.json()) before defining POST routes so req.body is populated."
      - "Trim title and content before validating and saving them."
      - "Use the insert result's lastInsertRowid, then read the row back from the database for the response."
  - id: delete-notes
    kind: implement
    prompt: "Add DELETE /notes/:id. Return HTTP 204 when a note is deleted, HTTP 404 when the note does not exist, and HTTP 400 when the id is invalid."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-3.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-3/app.ts] }
    hints:
      - "Reuse the same id parsing helper for GET /notes/:id and DELETE /notes/:id."
      - "Check whether the note exists before deleting so missing ids return 404."
      - "A successful DELETE should use res.status(204).end() and should not send a JSON body."
---

## Overview

Build a small Notes REST API using Express and the provided in-memory SQLite
database. The API should expose:

- `GET /notes`
- `GET /notes/:id`
- `POST /notes`
- `DELETE /notes/:id`

The `notes` table already exists and starts with seeded data. Keep all note data
in SQLite; do not use module-level arrays or other in-memory storage.

## Workspace

- **`app.ts`** *(edit, entry)* — the Express app and route handlers.
- **`db.ts`** *(readonly)* — re-exports the SQLite database injected by the
  verification engine.

## API Contract

Notes have this shape:

```ts
{
  id: number;
  title: string;
  content: string;
  created_at: string;
}
```

`POST /notes` accepts `title` and `content`. The server owns `id` and
`created_at`.

## Reference Solutions

- `solution/step-1/app.ts` — read endpoints.
- `solution/step-2/app.ts` — read endpoints plus POST validation and insertion.
- `solution/step-3/app.ts` — full CRUD surface required by the interview.

## Evaluation Notes

The tests are cumulative: each step's checkpoint must satisfy all behavior from
that step's scope. Correct solutions use the SQLite `db` handle for every read,
insert, and delete, return deterministic ordering for `GET /notes`, and preserve
the HTTP response contract exactly.

Reference solutions live under `solution/step-N/`, so they import readonly
workspace helpers with paths like `../../workspace/db`. When a checkpoint is
applied to the candidate workspace, the checkpoint source normalizes that import
to `./db` because the solution file is overlaid at the workspace root as
`app.ts`.
