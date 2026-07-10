---
id: job-application-tracker
title: Job Application Tracker
summary: "Build a job application tracker with a React frontend and an Express + SQLite backend."
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
difficulty: easy
experienceMin: entry
experienceMax: junior
estimatedMinutes: 40
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
    - { path: shared/applications.ts, role: readonly }
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements application listing/filtering, summary counts, creation, and status/notes updates with correct validation and stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, filters applications, shows a summary, creates applications, and updates status/notes through the API."
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
  - id: load-applications
    kind: implement
    prompt: "Complete the application loading workflow. The backend should return seeded applications from SQLite ordered by applied_at, and the frontend should fetch from VITE_API_BASE_URL and render loading, error, empty, and list states showing company, role, location, status, source, and notes."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend application list
        weight: 35
        detail: "GET /applications returns deterministic seeded applications from SQLite, ordered by applied_at descending, with a stable response shape."
      - criterion: Frontend loading flow
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL, renders loading/error/empty states, and lists each application's company, role, location, status, source, and notes."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not rely on hardcoded application data."
    weight: 30
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "The list endpoint should return { applications: [...] }, ordered by applied_at DESC, id ASC."
      - "Applications without notes should still render a clear empty-notes state."
  - id: filter-summarize-and-create
    kind: implement
    prompt: "Add status and source filtering, a summary panel, and application creation. GET /applications should validate the optional status and source query parameters, GET /applications/summary should return counts for every status (including zero), POST /applications should validate and create applications, and the UI should expose filters, a summary panel, and a create form."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend filters, summary, and creation
        weight: 35
        detail: "GET /applications validates status/source filters; GET /applications/summary returns counts for every status; POST /applications validates required fields, status, source, and notes, and defaults status/source when omitted."
      - criterion: Frontend filters, summary, and create form
        weight: 35
        detail: "The UI lets users filter applications, view the summary panel, and create an application through the backend, showing validation errors and updating the list and summary."
      - criterion: Previous behavior
        weight: 30
        detail: "The unfiltered application loading behavior remains intact."
    weight: 30
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "Valid statuses are draft, applied, interviewing, offer, and rejected; valid sources are company_site, linkedin, referral, and other."
      - "Company, role, and location are required and trimmed; status defaults to draft and source defaults to other when omitted."
      - "Notes are trimmed; an empty trimmed value becomes null, and anything over 500 characters is rejected."
  - id: update-application
    kind: implement
    prompt: "Implement application updates. PATCH /applications/:id should validate the id and the status/notes fields, and the React UI should let a candidate update an application's status and notes, display backend validation errors, and update the summary from the saved response."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend update validation
        weight: 30
        detail: "PATCH /applications/:id validates ids, rejects unknown or missing fields, and validates status and notes (including the length limit)."
      - criterion: Frontend update workflow
        weight: 30
        detail: "The UI submits status/notes updates through the backend, shows validation errors, and updates the application card and summary from the saved response."
      - criterion: Persistence
        weight: 25
        detail: "Successful updates persist in the backend and remain visible after reload."
      - criterion: Previous behavior
        weight: 15
        detail: "Application loading, filtering, the summary panel, and creation continue to work after updates are implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Only status and notes may be updated; any other field should return { error: \"Unknown update field\" }."
      - "An empty request body should return { error: \"No update fields provided\" }."
      - "After saving, use the backend response to update both the application and the summary panel."
---

## Overview

You are building a personal job search dashboard in a fullstack React +
Express + SQLite workspace. The app must call the real backend, persist
updates for the life of the running process, and keep earlier behavior
working as you move through the steps.

## Product Context

You are building a personal tracker for job applications. You need to review
applications, see a quick summary of where things stand, filter by status or
source, log new applications, and update status and notes as things
progress. The frontend must call the real backend API, and changes should
persist for the life of the running backend process.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns an `applications` table:

```sql
CREATE TABLE applications (
  id INTEGER PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  applied_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Valid statuses are `draft`, `applied`, `interviewing`, `offer`, and
`rejected`. Valid sources are `company_site`, `linkedin`, `referral`, and
`other`.

```json
{
  "id": 1,
  "company": "Stripe",
  "role": "Frontend Engineer Intern",
  "location": "Remote",
  "status": "applied",
  "source": "company_site",
  "notes": "Submitted through careers page.",
  "applied_at": "2025-01-10T09:00:00.000Z",
  "updated_at": "2025-01-10T09:00:00.000Z"
}
```

### `GET /applications`

Returns `{ "applications": [] }`, ordered by `applied_at` descending (then
`id` ascending). Supports optional `status` and `source` query parameters. An
invalid `status` returns HTTP 400 with `{ "error": "Invalid status" }`; an
invalid `source` returns HTTP 400 with `{ "error": "Invalid source" }`.

### `GET /applications/summary`

Returns counts for every status, including statuses with zero applications:

```json
{
  "summary": {
    "total": 8,
    "draft": 2,
    "applied": 2,
    "interviewing": 2,
    "offer": 0,
    "rejected": 2
  }
}
```

### `POST /applications`

Creates an application. Request body:
`{ "company": "...", "role": "...", "location": "...", "status"?, "source"?, "notes"? }`.

Validation:

- missing/empty company → 400 `Company is required`
- missing/empty role → 400 `Role is required`
- missing/empty location → 400 `Location is required`
- invalid status → 400 `Invalid status`
- invalid source → 400 `Invalid source`
- notes that isn't a string → 400 `Invalid notes`
- notes over 500 characters → 400 `Notes are too long`

Company, role, and location are trimmed. `status` defaults to `draft` and
`source` defaults to `other` when omitted. Notes are trimmed; an empty
trimmed value becomes `null`. Returns HTTP 201 with the created
`application`.

### `PATCH /applications/:id`

Updates `status` and/or `notes` (the only allowed fields).

Validation:

- invalid id → 400 `Invalid application id`
- missing application → 404 `Application not found`
- empty body → 400 `No update fields provided`
- any field other than `status`/`notes` → 400 `Unknown update field`
- invalid status → 400 `Invalid status`
- notes that isn't a string → 400 `Invalid notes`
- notes over 500 characters → 400 `Notes are too long`

Returns HTTP 200 with the updated `application`.

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading, error, and empty states; list applications;
filter by status and source; show a summary panel; create an application;
display backend validation errors; update an application's status and
notes; and show persisted changes after reload.

## Reference Flow

1. Load seeded applications and render them.
2. Filter applications by status and source, view the summary, and create a
   new application through the backend API.
3. Update an application's status and notes through the backend API,
   including validation errors and persisted successful updates.
