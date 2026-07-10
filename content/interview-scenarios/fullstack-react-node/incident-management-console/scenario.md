---
id: incident-management-console
title: Incident Management Console
summary: "Build an internal incident management console with a React frontend and an Express + SQLite backend."
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
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements incident/timeline loading, filtering, summary counts, responder assignment, timeline updates, and status transitions with correct incident-state rules and stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, lists and filters incidents, shows incident detail and timeline, assigns responders, posts updates, and transitions/resolves incidents through the API."
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
  - id: load-incidents
    kind: implement
    prompt: "Complete the incident loading workflow. The backend should list incidents joined with their service and assigned responder, return incident detail with an ordered timeline, and return service/active-responder options; the frontend should fetch all three from VITE_API_BASE_URL and render loading/error states, the incident list, the selected incident's details, and its timeline."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend incident and timeline loading
        weight: 35
        detail: "GET /incidents returns incidents joined with service and assigned responder (null when unassigned) in the documented default order; GET /incidents/:id returns the incident plus its timeline ordered by created_at then id; GET /incident-options returns all services and active-only responders."
      - criterion: Frontend loading flow
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL, renders loading/error states, lists incidents, and shows the selected incident's details and timeline."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not rely on hardcoded incident, service, or responder data."
    weight: 25
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "Default ordering is severity (sev1, sev2, sev3), then status (open, investigating, monitoring, resolved), then started_at descending, then id ascending — apply all four in that order."
      - "Inactive responders (Casey Kim) are hidden from GET /incident-options but a resolved incident can still reference an active responder as its assignee."
  - id: filter-summarize-assign-update
    kind: implement
    prompt: "Add filtering, the summary panel, responder assignment, and timeline updates. GET /incidents should support status/severity/service_id/assigned filters, GET /incidents/summary should return incident counts, PATCH /incidents/:id/assign should assign an active responder to an unresolved incident, and POST /incidents/:id/events should add a timeline update to an unresolved incident — each creating the documented timeline event. The UI should expose filters, a summary panel, an assignment control, and an update form with backend validation error display."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend filtering and summary
        weight: 25
        detail: "GET /incidents validates and applies status/severity/service_id/assigned filters (individually and combined) while preserving default ordering, and GET /incidents/summary returns accurate counts for every status and severity key plus unassigned unresolved incidents."
      - criterion: Backend assignment and updates
        weight: 25
        detail: "PATCH /incidents/:id/assign and POST /incidents/:id/events enforce active-responder and resolved-incident rules, create the documented assigned/update timeline events, and update the incident's updated_at."
      - criterion: Frontend filter/assign/update workflow
        weight: 25
        detail: "The UI lets the candidate filter incidents, see the summary panel, assign a responder, and post a timeline update through the backend, showing backend validation errors and the updated state from the saved response."
      - criterion: Previous behavior
        weight: 25
        detail: "The unmodified incident loading, detail, and timeline behavior from step 1 remains intact."
    weight: 35
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "Validate service_id like a foreign key lookup: reject a non-positive-integer id with 400, then a well-formed but missing service with 404."
      - "assigned=true/false must be parsed from the string query value — anything else is a 400 { error: \"Invalid assigned filter\" }."
      - "unassigned in the summary counts unresolved incidents with no assigned_responder_id — a resolved-but-unassigned incident does not count."
  - id: status-transitions-and-resolution
    kind: implement
    prompt: "Implement status transitions and resolution. PATCH /incidents/:id/status should enforce the documented transition table, set resolved_at only when resolving, and create a status_changed or resolved timeline event; the React UI should let a candidate change status (including resolving), display backend validation errors, and persist changes after reload while blocking further assignment/update/status changes once an incident is resolved."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend status transition rules
        weight: 30
        detail: "PATCH /incidents/:id/status enforces the allowed transition table, rejects any change to an already-resolved incident with a distinct error from an otherwise-invalid transition, validates the acting responder and message, sets resolved_at only when transitioning to resolved, and creates a status_changed event for other transitions and a resolved event when resolving."
      - criterion: Frontend status/resolution workflow
        weight: 30
        detail: "The UI submits status changes and resolution through the backend, shows validation errors, and updates the status indicator, resolved state, and timeline from the saved response."
      - criterion: Persistence and blocking
        weight: 25
        detail: "A resolved incident's state persists after reload, and its assignment, update, and status controls no longer render or submit."
      - criterion: Previous behavior
        weight: 15
        detail: "Incident loading, filtering, the summary panel, assignment, and timeline updates continue to work after status transitions and resolution are implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Check the incident's current status against 'resolved' before checking the transition table — an already-resolved incident always returns { error: \"Incident is already resolved\" }, even for a nonsensical target status."
      - "resolved_at is set only when the new status is resolved; every other transition leaves it null."
      - "After a successful assign, update, or status change, refetch the incident detail so the UI reflects the saved response, not just the optimistic local state."
---

## Overview

You are building an internal incident management console in a fullstack
React + Express + SQLite workspace. The app must call the real backend,
persist updates for the life of the running process, and keep earlier
behavior working as you move through the steps.

## Product Context

You are working on the on-call tooling for an engineering organization.
Engineers need to see open and past incidents across services, drill into a
single incident's timeline, assign a responder, post updates as the incident
progresses, and move the incident through its lifecycle to resolution. The
frontend must call the real backend API, and changes should persist for the
life of the running backend process.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns four tables:

```sql
CREATE TABLE services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE responders (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE incidents (
  id INTEGER PRIMARY KEY,
  service_id INTEGER NOT NULL,
  assigned_responder_id INTEGER,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (assigned_responder_id) REFERENCES responders(id)
);

CREATE TABLE incident_events (
  id INTEGER PRIMARY KEY,
  incident_id INTEGER NOT NULL,
  responder_id INTEGER,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (incident_id) REFERENCES incidents(id),
  FOREIGN KEY (responder_id) REFERENCES responders(id)
);
```

Valid service statuses are `operational`, `degraded`, and `down`. Valid
responder roles are `engineer`, `manager`, and `support`. Valid incident
severities are `sev1`, `sev2`, and `sev3`. Valid incident statuses are `open`,
`investigating`, `monitoring`, and `resolved`. Valid timeline event types are
`created`, `assigned`, `status_changed`, `update`, and `resolved`.

An incident response joins in the service and assigned responder:

```json
{
  "id": 1,
  "service": {
    "id": 1,
    "name": "API Gateway",
    "slug": "api-gateway",
    "status": "degraded"
  },
  "assigned_responder": {
    "id": 1,
    "name": "Alex Rivera",
    "email": "alex@example.com",
    "role": "engineer"
  },
  "title": "Elevated API latency",
  "description": "Requests to the API Gateway are timing out.",
  "severity": "sev2",
  "status": "investigating",
  "started_at": "2025-02-10T15:00:00.000Z",
  "resolved_at": null,
  "created_at": "2025-02-10T15:05:00.000Z",
  "updated_at": "2025-02-10T15:30:00.000Z"
}
```

If the incident is unassigned, `assigned_responder` is `null`.

A timeline event response joins in the acting responder:

```json
{
  "id": 1,
  "incident_id": 1,
  "responder": {
    "id": 1,
    "name": "Alex Rivera",
    "email": "alex@example.com",
    "role": "engineer"
  },
  "event_type": "update",
  "message": "Restarted API worker pool.",
  "created_at": "2025-02-10T15:20:00.000Z"
}
```

If the event has no responder (a `created` event), `responder` is `null`.

Errors are always `{ "error": "Human-readable message" }`.

### Incident rules

- only active responders can be assigned
- a resolved incident cannot be assigned, cannot receive new timeline updates,
  and cannot change status again
- `resolved_at` is set only when status becomes `resolved`; it stays `null`
  for every other status
- assigning a responder creates an `assigned` timeline event with a message
  like `Assigned to Alex Rivera.`
- adding an update creates an `update` timeline event with the trimmed message
- resolving an incident creates a `resolved` timeline event; every other
  status change creates a `status_changed` timeline event
- `updated_at` changes whenever an incident is assigned, updated, or has its
  status changed

Allowed status transitions:

```txt
open -> investigating
investigating -> monitoring
investigating -> resolved
monitoring -> investigating
monitoring -> resolved
resolved -> (no further transitions)
```

### `GET /incidents`

Returns incidents, optionally filtered.

Response: `{ "incidents": [] }`.

Optional query filters: `status`, `severity`, `service_id`, `assigned`
(`true`/`false`). Filters combine with AND.

Default ordering: severity (`sev1`, `sev2`, `sev3`), then status (`open`,
`investigating`, `monitoring`, `resolved`), then `started_at` descending, then
`id` ascending.

Validation, in order:

- `status` present but not a valid status → `400`
  `{ "error": "Invalid incident status" }`
- `severity` present but not a valid severity → `400`
  `{ "error": "Invalid severity" }`
- `service_id` present but not a positive integer → `400`
  `{ "error": "Invalid service id" }`
- `service_id` present but no matching service → `404`
  `{ "error": "Service not found" }`
- `assigned` present but not `"true"`/`"false"` → `400`
  `{ "error": "Invalid assigned filter" }`

### `GET /incidents/:id`

Returns one incident with its timeline.

Response: `{ "incident": {}, "events": [] }`, events ordered by `created_at`
ascending, then `id` ascending.

Validation: id not a positive integer → `400`
`{ "error": "Invalid incident id" }`; no matching incident → `404`
`{ "error": "Incident not found" }`.

### `GET /incident-options`

Returns filter/form options.

Response: `{ "services": [], "responders": [] }` — all services, but only
active responders, both ordered by `id` ascending.

### `GET /incidents/summary`

Returns incident counts.

Response:

```json
{
  "summary": {
    "total": 6,
    "open": 2,
    "investigating": 2,
    "monitoring": 1,
    "resolved": 1,
    "sev1": 2,
    "sev2": 1,
    "sev3": 3,
    "unassigned": 2
  }
}
```

Every status and severity key is always present, including zero counts.
`unassigned` counts unresolved incidents with no assigned responder.

### `PATCH /incidents/:id/assign`

Assigns an active responder to an unresolved incident.

Request: `{ "responder_id": 2 }`.

Success: `200` with `{ "incident": {}, "event": {} }`.

Validation, in order:

- id not a positive integer → `400` `{ "error": "Invalid incident id" }`
- no matching incident → `404` `{ "error": "Incident not found" }`
- incident is `resolved` → `400` `{ "error": "Incident is resolved" }`
- `responder_id` not a positive integer → `400`
  `{ "error": "Invalid responder id" }`
- no matching responder → `404` `{ "error": "Responder not found" }`
- responder is inactive → `400` `{ "error": "Responder is inactive" }`
- responder is already the incident's assignee → `400`
  `{ "error": "Responder is already assigned" }`

### `POST /incidents/:id/events`

Adds a timeline update to an unresolved incident.

Request: `{ "responder_id": 1, "message": "Restarted API worker pool." }`.

Success: `201` with `{ "event": {}, "incident": {} }`.

Validation, in order:

- id not a positive integer → `400` `{ "error": "Invalid incident id" }`
- no matching incident → `404` `{ "error": "Incident not found" }`
- incident is `resolved` → `400` `{ "error": "Incident is resolved" }`
- `responder_id` not a positive integer → `400`
  `{ "error": "Invalid responder id" }`
- no matching responder → `404` `{ "error": "Responder not found" }`
- responder is inactive → `400` `{ "error": "Responder is inactive" }`
- message is empty after trimming → `400`
  `{ "error": "Message is required" }`
- trimmed message longer than 500 characters → `400`
  `{ "error": "Message is too long" }`

### `PATCH /incidents/:id/status`

Changes an incident's status.

Request:
`{ "status": "monitoring", "responder_id": 1, "message": "Error rate is back to normal." }`.

Success: `200` with `{ "incident": {}, "event": {} }`.

Validation, in order:

- id not a positive integer → `400` `{ "error": "Invalid incident id" }`
- no matching incident → `404` `{ "error": "Incident not found" }`
- `status` missing/empty → `400` `{ "error": "Status is required" }`
- `status` not a valid incident status → `400`
  `{ "error": "Invalid incident status" }`
- incident is already `resolved` → `400`
  `{ "error": "Incident is already resolved" }`
- transition not allowed from the incident's current status → `400`
  `{ "error": "Invalid status transition" }`
- `responder_id` not a positive integer → `400`
  `{ "error": "Invalid responder id" }`
- no matching responder → `404` `{ "error": "Responder not found" }`
- responder is inactive → `400` `{ "error": "Responder is inactive" }`
- message is empty after trimming → `400`
  `{ "error": "Message is required" }`
- trimmed message longer than 500 characters → `400`
  `{ "error": "Message is too long" }`

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading and error states; list incidents with a way to
select one; show the selected incident's service, assigned responder,
severity, status, and timeline; filter incidents by status, severity,
service, and assignment; show a summary panel; assign a responder; post
timeline updates; change status (including resolving); display backend
validation errors; and show persisted changes after reload, with assignment,
update, and status controls unavailable once an incident is resolved.

## Reference Flow

1. Load incidents and options, and render the list, selected incident detail,
   and timeline.
2. Filter incidents, view the summary panel, assign a responder, and post a
   timeline update through the backend API, including validation errors.
3. Change an incident's status — including resolving it — through the backend
   API, including validation errors, persisted changes after reload, and
   blocked further changes on a resolved incident.
