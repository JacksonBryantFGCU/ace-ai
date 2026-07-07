---
id: task-tracker-api
title: Task Tracker API
summary: "Build an Express + SQLite Task Tracker API with listing, filtering, sorting, status updates, and summary counts."
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
  - pattern:query-and-mutation
difficulty: easy
experienceMin: entry
experienceMax: senior
estimatedMinutes: 30
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
  - criterion: REST API behavior
    weight: 30
    detail: "Implements the required task endpoints with correct status codes and stable JSON response shapes."
  - criterion: SQLite persistence and queries
    weight: 25
    detail: "Reads, updates, filters, sorts, and aggregates through the provided SQLite database instead of hardcoded arrays."
  - criterion: Validation and error handling
    weight: 25
    detail: "Rejects invalid ids, statuses, and sort values with predictable JSON errors."
  - criterion: SQL safety and determinism
    weight: 10
    detail: "Uses parameterized values for user input, whitelists sort columns, and returns deterministic ordering."
  - criterion: Code clarity
    weight: 10
    detail: "Keeps route handlers readable, avoids overengineering, and preserves previous step behavior."
source: authored
status: verified
version: 1
steps:
  - id: list-tasks
    kind: implement
    prompt: "Implement GET /tasks in workspace/app.ts. Return all seeded tasks from SQLite in deterministic id order using the JSON shape { tasks: [...] }."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Use db.all to read from the tasks table."
      - "Select id, title, status, priority, and created_at so the response shape is predictable."
      - "Add ORDER BY id so the list is deterministic."
  - id: filter-and-sort-tasks
    kind: implement
    prompt: "Extend GET /tasks to support optional status and sort query parameters. Validate invalid query values, support combining status with sort, and keep the Step 1 list behavior working."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-2.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-2/app.ts] }
    hints:
      - "Allowed statuses are todo, in_progress, and done."
      - "Parameterize the status value; do not interpolate user input directly into SQL."
      - "For sort, whitelist accepted column names before adding them to ORDER BY."
  - id: update-status-and-summary
    kind: implement
    prompt: "Add PATCH /tasks/:id/status and GET /tasks/summary. Validate ids and status values, update task status in SQLite, return the updated task, and return counts for every status."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-3.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-3/app.ts] }
    hints:
      - "Convert req.params.id to a positive integer before querying."
      - "Check for a missing status separately from an unsupported status value."
      - "Initialize the summary with todo, in_progress, and done set to zero, then fill in database counts."
---

## Overview

You are working on a small internal productivity tool. The team needs a Task
Tracker API that reads tasks from SQLite, supports useful list queries, updates a
task's status, and reports a status summary for dashboards.

The Express app and SQLite database bridge already exist. Implement the missing
route behavior in `workspace/app.ts` while preserving earlier functionality as
you move through the steps.

## Tech Stack

- TypeScript
- Node
- Express
- SQLite

## Database

The `tasks` table is already created and seeded before each verification run:

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  priority INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
```

Valid task statuses are:

- `todo`
- `in_progress`
- `done`

Seed data is deterministic and includes multiple statuses, priorities, and
creation timestamps. Keep all task data in SQLite; do not use module-level arrays
as the source of truth.

## API Contract

Tasks have this shape:

```ts
{
  id: number;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: number;
  created_at: string;
}
```

All successful responses should be JSON. Error responses should use this stable
shape:

```json
{
  "error": "Human-readable error message"
}
```

## Step 1: List Tasks

Implement:

- `GET /tasks`

Requirements:

- Return all seeded tasks from SQLite.
- Return HTTP 200.
- Use the response shape `{ "tasks": [...] }`.
- Include `id`, `title`, `status`, `priority`, and `created_at` for every task.
- Return tasks in deterministic `id` order.

## Step 2: Filtering and Sorting

Extend `GET /tasks` with optional query parameters:

- `status`
- `sort`

Valid status values are `todo`, `in_progress`, and `done`. Invalid status values
should return HTTP 400 with:

```json
{
  "error": "Invalid status"
}
```

Valid sort values are `priority` and `created_at`. Invalid sort values should
return HTTP 400 with:

```json
{
  "error": "Invalid sort"
}
```

Supported examples:

- `GET /tasks?status=todo`
- `GET /tasks?sort=priority`
- `GET /tasks?sort=created_at`
- `GET /tasks?status=todo&sort=priority`

Use parameterized query values for user input. For sort fields, whitelist the
accepted column names before building the `ORDER BY` clause.

## Step 3: Status Updates and Summary

Implement:

- `PATCH /tasks/:id/status`
- `GET /tasks/summary`

`PATCH /tasks/:id/status` accepts:

```json
{
  "status": "done"
}
```

Successful updates should return HTTP 200 with:

```json
{
  "task": {
    "id": 1,
    "title": "Write project brief",
    "status": "done",
    "priority": 2,
    "created_at": "2025-01-10T09:00:00.000Z"
  }
}
```

Validation rules:

- Non-numeric or non-positive ids return HTTP 400 with `{ "error": "Invalid task id" }`.
- Missing tasks return HTTP 404 with `{ "error": "Task not found" }`.
- Missing `status` returns HTTP 400 with `{ "error": "Status is required" }`.
- Unsupported status values return HTTP 400 with `{ "error": "Invalid status" }`.

`GET /tasks/summary` should return counts for every status, even when a count is
zero:

```json
{
  "summary": {
    "todo": 2,
    "in_progress": 1,
    "done": 2
  }
}
```

## Workspace

- **`app.ts`** *(edit, entry)* - the Express app and route handlers.
- **`db.ts`** *(readonly)* - re-exports the SQLite database injected by the
  verification engine.
- **`backend-types.d.ts`** *(readonly)* - editor declarations for Express and
  the injected SQLite handle.

## Reference Solutions

- `solution/step-1/app.ts` - task listing.
- `solution/step-2/app.ts` - listing plus filtering and sorting.
- `solution/step-3/app.ts` - full API surface for the interview.

## Evaluation Notes

The tests are cumulative. Each checkpoint must preserve behavior from earlier
steps while adding the new endpoint behavior for the current step.

Strong solutions use SQLite for every read, update, and aggregate; parameterize
user-provided values; whitelist sort columns; return deterministic ordering; and
keep JSON response shapes consistent.

Reference solutions live under `solution/step-N/`, so they import readonly
workspace helpers with paths like `../../workspace/db`. When a checkpoint is
applied to the candidate workspace, the checkpoint source normalizes that import
to `./db` because the solution file is overlaid at the workspace root as
`app.ts`.
