---
id: appointment-booking-portal
title: Appointment Booking Portal
summary: "Build an appointment booking portal with a React frontend and an Express + SQLite backend."
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
    - { path: shared/booking.ts, role: readonly }
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements the joined appointment query, filtering, booking creation with conflict detection and derived ends_at, and finalization rules with stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, filters appointments, books an appointment, and finalizes appointments via the API."
  - criterion: Fullstack integration
    weight: 25
    detail: "Uses VITE_API_BASE_URL, preserves backend state across refreshes, and surfaces backend validation (including booking conflicts) in the UI."
  - criterion: Code clarity
    weight: 15
    detail: "Keeps the React and Express code readable, focused, and consistent with the scenario conventions, including the SQLite joins and overlap query."
  - criterion: Accessibility and UX
    weight: 10
    detail: "Uses accessible labels, clear controls, and predictable feedback during loading, errors, and saves."
source: authored
status: verified
visibility: public
version: 1
steps:
  - id: load-appointments
    kind: implement
    prompt: "Complete the appointment loading workflow. The backend should join appointments with their service and staff and return them in the documented order, plus a booking-options endpoint listing only active services and staff. The frontend should fetch both and render loading, error, empty, and list states."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend joined appointment query
        weight: 35
        detail: "GET /appointments joins in service and staff details and orders appointments by starts_at then id; GET /booking-options returns only active services and staff."
      - criterion: Frontend list rendering
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL, renders loading/error/empty states, and lists each appointment's service, staff, customer, status, and time."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not rely on hardcoded appointment or booking-option data."
    weight: 30
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "listAppointmentsWithDetails() already joins in the service and staff and handles ordering — call it directly."
      - "Pass { activeOnly: true } to listServices()/listStaff() for the booking-options endpoint."
  - id: filter-and-book
    kind: implement
    prompt: "Add staff, status, and date filtering, plus appointment booking. GET /appointments should validate the optional staff_id, status, and date query parameters, and POST /appointments should validate and create a scheduled appointment — including rejecting a time that conflicts with an existing booking for the same staff member."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend filters and booking
        weight: 35
        detail: "GET /appointments validates staff_id/status/date; POST /appointments validates the service (including inactive), staff (including inactive), customer fields, start time, and rejects overlapping bookings for the same staff member while allowing overlap with cancelled ones."
      - criterion: Frontend filters and booking form
        weight: 35
        detail: "The UI lets users filter appointments and book one through the backend, showing validation errors (including conflicts) and updating the list."
      - criterion: Previous behavior
        weight: 30
        detail: "The unfiltered appointment loading behavior remains intact."
    weight: 30
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "ends_at is derived from the service's duration_minutes — never accept it from the request."
      - "A booking conflicts if new.starts_at < existing.ends_at AND new.ends_at > existing.starts_at, for the same staff member, excluding cancelled appointments — hasConflictingAppointment in ./db already implements this."
      - "date must be exactly YYYY-MM-DD; it matches on the UTC date portion of starts_at."
  - id: finalize-appointment
    kind: implement
    prompt: "Implement appointment finalization. PATCH /appointments/:id/status should only allow a scheduled appointment to move to completed or cancelled, and the React UI should let a candidate finalize an appointment, display backend validation errors, and update the appointment from the saved response."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend finalization rules
        weight: 30
        detail: "PATCH /appointments/:id/status validates the id and status, only accepts completed/cancelled as targets, and rejects finalizing an appointment that isn't currently scheduled."
      - criterion: Frontend finalize workflow
        weight: 30
        detail: "The UI submits a finalize action through the backend, shows validation errors, and updates the appointment's status from the saved response."
      - criterion: Persistence
        weight: 25
        detail: "A successful finalize persists in the backend and remains visible after reload."
      - criterion: Previous behavior
        weight: 15
        detail: "Appointment loading, filtering, and booking continue to work after finalization is implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Only scheduled appointments can be finalized; completed and cancelled are both terminal."
      - "A missing status field and an invalid/disallowed status value are different errors."
      - "After a successful finalize, use the backend response to update the appointment's status in place."
---

## Overview

You are building a small front-desk booking portal in a fullstack React +
Express + SQLite workspace. The app must call the real backend, persist
updates for the life of the running process, and keep earlier behavior
working as you move through the steps.

## Product Context

You are working on a booking portal for a small service business (salon,
consulting practice, or training studio). Front-desk staff need to see
upcoming appointments, filter by staff member, status, or date, book new
appointments without double-booking a staff member, and mark appointments
complete or cancelled as they happen. The frontend must call the real
backend API, and changes should persist for the life of the running backend
process.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns three tables:

```sql
CREATE TABLE services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE staff (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE appointments (
  id INTEGER PRIMARY KEY,
  service_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);
```

Valid staff roles are `stylist`, `consultant`, `trainer`, and `therapist`.
Valid appointment statuses are `scheduled`, `completed`, and `cancelled`.
Money is stored as integer cents.

An appointment response joins in its service and staff:

```json
{
  "id": 1,
  "service": { "id": 1, "name": "Initial Consultation", "duration_minutes": 60, "price_cents": 7500 },
  "staff": { "id": 1, "name": "Alex Rivera", "email": "alex@example.com", "role": "consultant" },
  "customer_name": "Sam Carter",
  "customer_email": "sam@example.com",
  "starts_at": "2025-02-10T15:00:00.000Z",
  "ends_at": "2025-02-10T16:00:00.000Z",
  "status": "scheduled",
  "notes": "First visit.",
  "created_at": "2025-01-10T09:00:00.000Z",
  "updated_at": "2025-01-10T09:00:00.000Z"
}
```

### `GET /appointments`

Returns `{ "appointments": [] }`, ordered by `starts_at` ascending then `id`
ascending. Supports optional `staff_id`, `status`, and `date` (`YYYY-MM-DD`,
matched against the UTC date of `starts_at`) query parameters, which can be
combined.

Validation: invalid `staff_id` → 400 `Invalid staff id`; missing staff → 404
`Staff not found`; invalid `status` → 400 `Invalid appointment status`;
invalid `date` → 400 `Invalid date`.

### `GET /booking-options`

Returns `{ "services": [], "staff": [] }` — only active services and staff,
ordered by `id` ascending.

### `POST /appointments`

Creates a scheduled appointment. Request body:
`{ "service_id", "staff_id", "customer_name", "customer_email", "starts_at", "notes"? }`.

Validation, in order:

- invalid `service_id` → 400 `Invalid service id`
- missing service → 404 `Service not found`
- inactive service → 400 `Service is inactive`
- invalid `staff_id` → 400 `Invalid staff id`
- missing staff → 404 `Staff not found`
- inactive staff → 400 `Staff member is inactive`
- missing/empty customer name → 400 `Customer name is required`
- invalid customer email → 400 `Invalid customer email`
- unparseable `starts_at` → 400 `Invalid start time`
- a conflicting booking for the same staff member → 400
  `Appointment conflicts with existing booking`
- notes that isn't a string → 400 `Invalid notes`
- notes over 500 characters → 400 `Notes are too long`

Customer name is trimmed; email is trimmed and lowercased; notes are
trimmed and an empty value becomes `null`. `ends_at` is always computed as
`starts_at + service.duration_minutes` — never accepted from the client.
Two appointments for the same staff member conflict when
`new.starts_at < existing.ends_at AND new.ends_at > existing.starts_at`,
considering only non-cancelled appointments. A new appointment always
starts `scheduled`. Returns HTTP 201 with the created `appointment`.

### `PATCH /appointments/:id/status`

Finalizes an appointment. Only `completed` and `cancelled` are valid
targets, and only a currently `scheduled` appointment can change.

Validation: invalid id → 400 `Invalid appointment id`; missing appointment
→ 404 `Appointment not found`; missing `status` → 400 `Status is required`;
invalid or disallowed status value → 400 `Invalid appointment status`; the
appointment isn't `scheduled` → 400 `Appointment is already finalized`.
Returns HTTP 200 with the updated `appointment`; no other field changes.

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading, error, and empty states; list appointments
with their service, staff, customer, status, and time; filter by staff,
status, and date; book an appointment; display backend validation errors
(including conflicts); finalize an appointment; and show persisted changes
after reload.

## Reference Flow

1. Load appointments and booking options and render them.
2. Filter appointments, and book a new appointment through the backend API,
   including the conflict validation error.
3. Finalize an appointment through the backend API, including the
   already-finalized validation error and persisted successful updates.
