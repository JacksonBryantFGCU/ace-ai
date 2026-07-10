---
id: event-rsvp-manager
title: Event RSVP Manager
summary: "Build an event RSVP manager with a React frontend and an Express + SQLite backend."
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
    - { path: shared/events.ts, role: readonly }
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements event listing/detail, status and availability filtering, RSVP creation, and RSVP status updates with correct capacity rules and stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, filters events, views event detail with RSVPs, and submits RSVP creation/updates through the API."
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
  - id: load-events
    kind: implement
    prompt: "Complete the event loading workflow. The backend should return seeded events from SQLite with computed capacity fields, and a single event with its RSVPs. The frontend should fetch from VITE_API_BASE_URL, render loading/error/empty states, list events, and show the selected event's RSVPs."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend event list and detail
        weight: 35
        detail: "GET /events and GET /events/:id return deterministic seeded data from SQLite with the expected response shape, including computed going_count, waitlisted_count, spots_remaining, and is_full."
      - criterion: Frontend loading flow
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL, renders loading/error/empty states, lists events, and shows the selected event's RSVPs."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not rely on hardcoded event or RSVP data."
    weight: 30
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "going_count, waitlisted_count, spots_remaining, and is_full are computed, never stored."
      - "GET /events/:id should include the event's rsvps array, ordered by created_at."
  - id: filter-and-create-rsvp
    kind: implement
    prompt: "Add status and availability filtering across the backend and frontend, and let candidates RSVP to a scheduled event. GET /events should validate the optional status and availability query parameters, POST /events/:id/rsvps should validate and create RSVPs with the correct capacity default, and the UI should expose filter controls and an RSVP form."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend filters and RSVP creation
        weight: 35
        detail: "GET /events validates status/availability filters; POST /events/:id/rsvps validates the event, attendee fields, and duplicate RSVPs, and defaults new RSVPs to going or waitlisted based on capacity."
      - criterion: Frontend filter and RSVP form
        weight: 35
        detail: "The UI lets users filter events, submit an RSVP through the backend, and see backend validation errors and updated counts."
      - criterion: Previous behavior
        weight: 30
        detail: "The unfiltered event loading and detail behavior remains intact."
    weight: 30
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "Valid event statuses are scheduled, cancelled, and completed; availability accepts open or full."
      - "Only scheduled events accept new RSVPs; other statuses return { error: \"Event is not accepting RSVPs\" } with HTTP 400."
      - "An attendee's email is unique per event only among non-cancelled RSVPs — a prior cancelled RSVP does not block a new one."
  - id: update-rsvp-status
    kind: implement
    prompt: "Implement RSVP status updates. PATCH /rsvps/:id should validate the id and status, enforce the capacity rule when moving an RSVP to going, and the React UI should let a candidate change an RSVP's status, display backend validation errors, and update counts from the saved response."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend update validation and capacity rule
        weight: 30
        detail: "PATCH /rsvps/:id validates ids, rejects unknown or missing fields, validates the target status, and rejects moving an RSVP to going when the event has no spots remaining."
      - criterion: Frontend update workflow
        weight: 30
        detail: "The UI submits RSVP status updates through the backend, shows validation errors, and updates the RSVP row and event counts from the saved response."
      - criterion: Persistence
        weight: 25
        detail: "Successful updates persist in the backend and remain visible after reload."
      - criterion: Previous behavior
        weight: 15
        detail: "Event loading, filtering, and RSVP creation continue to work after status updates are implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Only status may be updated, and only to going, waitlisted, or cancelled."
      - "Moving an RSVP to going when the event has no spots remaining should return { error: \"Event is full\" } with HTTP 400."
      - "After saving, use the backend response to update both the RSVP row and the event's capacity counts."
---

## Overview

You are building an event operations dashboard in a fullstack React + Express
+ SQLite workspace. The app must call the real backend, persist updates for
the life of the running process, and keep earlier behavior working as you
move through the steps.

## Product Context

You are working on an internal RSVP manager for a community events team.
Organizers need to review upcoming events, see how many people are going or
waitlisted, filter events by status or availability, add attendees, and
change an attendee's RSVP status as plans change. The frontend must call the
real backend API, and changes should persist for the life of the running
backend process.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns two tables:

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE rsvps (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id)
);
```

Valid event statuses are `scheduled`, `cancelled`, and `completed`. Valid RSVP
statuses are `going`, `waitlisted`, and `cancelled`.

Every event response includes four computed fields, none of which are stored
in the database:

- `going_count` — RSVPs on the event with status `going`
- `waitlisted_count` — RSVPs on the event with status `waitlisted`
- `spots_remaining` — `capacity - going_count`, never below `0`
- `is_full` — `going_count >= capacity`

```json
{
  "id": 1,
  "title": "React Meetup",
  "location": "FGCU Tech Lab",
  "starts_at": "2025-02-10T18:00:00.000Z",
  "capacity": 30,
  "status": "scheduled",
  "going_count": 12,
  "waitlisted_count": 2,
  "spots_remaining": 18,
  "is_full": false,
  "created_at": "2025-01-10T09:00:00.000Z",
  "updated_at": "2025-01-10T09:00:00.000Z"
}
```

### `GET /events`

Returns `{ "events": [] }`, ordered by `starts_at` ascending. Supports
optional `status` and `availability` (`open` or `full`) query parameters. An
invalid `status` returns HTTP 400 with `{ "error": "Invalid event status" }`;
an invalid `availability` returns HTTP 400 with
`{ "error": "Invalid availability filter" }`.

### `GET /events/:id`

Returns one event with its `rsvps` array (ordered by `created_at` ascending).
Invalid id returns HTTP 400 with `Invalid event id`; a missing event returns
HTTP 404 with `Event not found`.

### `POST /events/:id/rsvps`

Creates an RSVP for a scheduled event. Request body:
`{ "attendee_name": "...", "attendee_email": "..." }`.

Validation:

- invalid id → 400 `Invalid event id`
- missing event → 404 `Event not found`
- cancelled/completed event → 400 `Event is not accepting RSVPs`
- missing/empty name → 400 `Attendee name is required`
- invalid email → 400 `Invalid attendee email`
- an active (non-cancelled) RSVP already exists for that email on that event
  → 409 `Attendee already RSVP'd`

Attendee name is trimmed; email is trimmed and lowercased. A new RSVP is
created as `going` if the event has capacity, or `waitlisted` if it is full.
Returns HTTP 201 with the created `rsvp` and the updated `event` summary.

### `PATCH /rsvps/:id`

Updates an RSVP's `status` (the only allowed field) to `going`, `waitlisted`,
or `cancelled`.

Validation:

- invalid id → 400 `Invalid RSVP id`
- missing RSVP → 404 `RSVP not found`
- empty body → 400 `No update fields provided`
- any field other than `status` → 400 `Unknown update field`
- invalid status value → 400 `Invalid RSVP status`
- moving an RSVP to `going` when the event has no spots remaining → 400
  `Event is full`

Returns HTTP 200 with the updated `rsvp` and the updated `event` summary.

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading, error, and empty states; list events; show a
selected event's details and RSVPs; filter events by status and
availability; submit new RSVPs; display backend validation errors; update an
RSVP's status; and show persisted changes after reload.

## Reference Flow

1. Load seeded events and render them; selecting an event shows its RSVPs.
2. Filter events by status and availability, and RSVP to a scheduled event
   through the backend API.
3. Update an RSVP's status through the backend API, including the capacity
   validation error and persisted successful updates.
