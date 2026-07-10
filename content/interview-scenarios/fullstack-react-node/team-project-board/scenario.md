---
id: team-project-board
title: Team Project Board
summary: "Build a team project board with a React frontend and an Express + SQLite backend."
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
    - { path: shared/board.ts, role: readonly }
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements the joined board query, filtering, summary counts, task creation, and status-transition-enforced updates with stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, filters the board, shows a summary, creates tasks, and moves tasks through the workflow via the API."
  - criterion: Fullstack integration
    weight: 25
    detail: "Uses VITE_API_BASE_URL, preserves backend state across refreshes, and surfaces backend validation in the UI."
  - criterion: Code clarity
    weight: 15
    detail: "Keeps the React and Express code readable, focused, and consistent with the scenario conventions, including the SQLite joins."
  - criterion: Accessibility and UX
    weight: 10
    detail: "Uses accessible labels, clear controls, and predictable feedback during loading, errors, and saves."
source: authored
status: verified
visibility: public
version: 1
steps:
  - id: load-board
    kind: implement
    prompt: "Complete the board loading workflow. The backend should join tasks with their project and assignee and return them in the documented order, and the frontend should fetch from VITE_API_BASE_URL and render loading, error, empty, and column states."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend joined board query
        weight: 35
        detail: "GET /board joins tasks with projects and members, returns null for unassigned tasks, and orders tasks by status, then priority, then due date (nulls last), then id."
      - criterion: Frontend column rendering
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL, renders loading/error/empty states, and places each task in its status column with project, assignee, priority, and due date."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not rely on hardcoded board data."
    weight: 30
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "A task's assignee should be null in the response when assignee_id is null, not an object with null fields."
      - "SQLite doesn't have NULLS LAST — sort on `due_date IS NULL` before `due_date ASC` to push nulls to the end."
  - id: filter-summarize-and-create
    kind: implement
    prompt: "Add project and assignee filtering, a summary panel, and task creation. GET /board should validate the optional project_id and assignee_id query parameters, GET /board/summary should return counts by status and priority (including zero), POST /tasks should validate and create a task, and the UI should expose filters, a summary panel, and a create form."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend filters, summary, and task creation
        weight: 35
        detail: "GET /board and GET /board/summary validate project_id/assignee_id; POST /tasks validates the project (including archived), assignee, title, description, priority, and due date, and returns the created task with project and assignee details."
      - criterion: Frontend filters, summary, and create form
        weight: 35
        detail: "The UI lets users filter the board, view the summary panel, and create a task through the backend, showing validation errors and updating the board and summary."
      - criterion: Previous behavior
        weight: 30
        detail: "The unfiltered board loading behavior remains intact."
    weight: 30
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "Archived projects can still be viewed on the board, but POST /tasks must reject creating a task on one."
      - "Title is required and trimmed; description is optional, trimmed, and capped at 500 characters; priority is required."
      - "A new task always starts in the todo status regardless of what the request sends."
  - id: move-tasks
    kind: implement
    prompt: "Implement task status updates. PATCH /tasks/:id/status should enforce the allowed workflow transitions, and the React UI should let a candidate move a task, display backend validation errors, and update the board and summary from the saved response."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend transition enforcement
        weight: 30
        detail: "PATCH /tasks/:id/status validates the id and status, and enforces the documented transition graph (including review going back to in_progress and done accepting no further moves)."
      - criterion: Frontend move workflow
        weight: 30
        detail: "The UI submits a status move through the backend, shows validation errors, and updates the task's column and the summary from the saved response."
      - criterion: Persistence
        weight: 25
        detail: "A successful move persists in the backend and remains visible after reload."
      - criterion: Previous behavior
        weight: 15
        detail: "Board loading, filtering, the summary panel, and task creation continue to work after moves are implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Allowed transitions: todo → in_progress, in_progress → review, review → done, review → in_progress. Everything else, including a no-op, is invalid."
      - "A missing status field and an invalid status value are two different errors."
      - "After a successful move, use the backend response to update the task's status (and therefore its column) and refresh the summary."
---

## Overview

You are building a lightweight team project board in a fullstack React +
Express + SQLite workspace. The app must call the real backend, persist
updates for the life of the running process, and keep earlier behavior
working as you move through the steps.

## Product Context

You are working on a small team's project board. The team needs to see
tasks organized by status, know who's working on what, filter by project or
teammate, log new tasks, and move tasks through a fixed workflow as work
progresses. The frontend must call the real backend API, and changes should
persist for the life of the running backend process.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns three tables:

```sql
CREATE TABLE members (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  assignee_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assignee_id) REFERENCES members(id)
);
```

Valid member roles are `designer`, `engineer`, and `manager`. Valid project
statuses are `active` and `archived`. Valid task statuses are `todo`,
`in_progress`, `review`, and `done`. Valid priorities are `low`, `medium`,
and `high`.

A task response joins in its project and assignee:

```json
{
  "id": 1,
  "project_id": 1,
  "project_name": "Mobile Redesign",
  "assignee": { "id": 1, "name": "Alex Rivera", "email": "alex@example.com" },
  "title": "Design onboarding screen",
  "description": "Create first-pass mobile onboarding design.",
  "status": "todo",
  "priority": "high",
  "due_date": "2025-02-01T00:00:00.000Z",
  "created_at": "2025-01-10T09:00:00.000Z",
  "updated_at": "2025-01-10T09:00:00.000Z"
}
```

An unassigned task has `"assignee": null`.

### `GET /board`

Returns `{ "projects": [], "members": [], "tasks": [] }`. `projects` and
`members` are always the full lists; `tasks` supports optional `project_id`
and `assignee_id` query parameters. Tasks are ordered by status
(`todo, in_progress, review, done`), then priority (`high, medium, low`),
then `due_date` ascending with nulls last, then `id` ascending.

Validation: invalid `project_id` → 400 `Invalid project id`; missing
project → 404 `Project not found`; invalid `assignee_id` → 400
`Invalid assignee id`; missing member → 404 `Member not found`.

### `GET /board/summary`

Returns counts by status and priority for the same filters as `GET /board`,
including zero-count keys:

```json
{
  "summary": {
    "total": 8,
    "by_status": { "todo": 2, "in_progress": 2, "review": 1, "done": 3 },
    "by_priority": { "low": 3, "medium": 2, "high": 3 }
  }
}
```

### `POST /tasks`

Creates a task on an active project. Request body:
`{ "project_id", "assignee_id"?, "title", "description"?, "priority", "due_date"? }`.

Validation:

- invalid `project_id` → 400 `Invalid project id`
- missing project → 404 `Project not found`
- archived project → 400 `Project is archived`
- invalid `assignee_id` → 400 `Invalid assignee id`
- missing member → 404 `Assignee not found`
- missing/empty title → 400 `Title is required`
- description that isn't a string → 400 `Invalid description`
- description over 500 characters → 400 `Description is too long`
- invalid or missing priority → 400 `Invalid priority`
- a due date that doesn't parse → 400 `Invalid due date`

Title is trimmed; description is trimmed and an empty value becomes `null`;
a new task always starts in the `todo` status. Returns HTTP 201 with the
created `task` (joined, like the board response).

### `PATCH /tasks/:id/status`

Updates a task's status according to the workflow:

```txt
todo -> in_progress
in_progress -> review
review -> done
review -> in_progress
```

Any other transition — including moving backward from `done`, skipping a
stage, or resubmitting the same status — is invalid.

Validation: invalid id → 400 `Invalid task id`; missing task → 404
`Task not found`; missing `status` → 400 `Status is required`; invalid
status value → 400 `Invalid task status`; disallowed transition → 400
`Invalid status transition`. Returns HTTP 200 with the updated `task`;
no other field changes.

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading, error, and empty states; render `todo`,
`in_progress`, `review`, and `done` columns; filter by project and
assignee; show a summary panel; create a task; display backend validation
errors; move a task through the workflow; and show persisted changes after
reload.

## Reference Flow

1. Load the board and render tasks into their status columns.
2. Filter by project or assignee, view the summary, and create a task
   through the backend API.
3. Move a task through the workflow through the backend API, including the
   transition validation error and persisted successful moves.
