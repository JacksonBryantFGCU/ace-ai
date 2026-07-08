---
id: customer-feedback-dashboard
title: Customer Feedback Dashboard
summary: "Build a customer feedback dashboard with a React frontend and an Express + SQLite backend."
category: fullstack-react-node
skills:
  - react
  - express
  - sqlite
  - integration
jobRoles:
  - fullstack
tags:
  - category:fullstack-reference
  - framework:react
  - framework:express
  - database:sqlite
difficulty: medium
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
    - { path: shared/feedback.ts, role: readonly }
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements feedback listing, filtering, update validation, and persistence with stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, filters feedback, and submits updates through the API."
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
  - id: load-feedback
    kind: implement
    prompt: "Complete the feedback loading workflow. The backend should return seeded feedback from SQLite, and the frontend should fetch from VITE_API_BASE_URL and render loading, error, empty, and list states."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend feedback list
        weight: 35
        detail: "GET /feedback returns deterministic seeded feedback from SQLite with the expected response shape."
      - criterion: Frontend loading flow
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL and renders loading, error, empty, and list states."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not rely on hardcoded feedback data."
    weight: 30
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "The list endpoint should return { feedback: [...] }."
      - "Do not hardcode the seeded feedback in the React UI."
  - id: filter-feedback
    kind: implement
    prompt: "Add status filtering across the backend and frontend. GET /feedback should validate the optional status query parameter, and the UI should request the selected status from the API."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend status filter
        weight: 35
        detail: "GET /feedback validates status filters and returns only matching records."
      - criterion: Frontend filter control
        weight: 35
        detail: "The UI lets users filter by status and requests the filtered data through the API."
      - criterion: Previous behavior
        weight: 30
        detail: "The unfiltered feedback loading behavior remains intact."
    weight: 30
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "Valid statuses are new, reviewing, and resolved."
      - "Invalid status filters should return { error: \"Invalid status\" } with HTTP 400."
      - "The frontend can refetch when the selected filter changes."
  - id: update-feedback
    kind: implement
    prompt: "Implement feedback updates. PATCH /feedback/:id should validate the id, status, and response, and the React form should display backend validation errors and update the UI from the saved response."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend update validation
        weight: 30
        detail: "PATCH /feedback/:id validates ids, statuses, response type, response length, and resolved-response requirements."
      - criterion: Frontend update workflow
        weight: 30
        detail: "The UI submits updates through the backend, shows validation errors, and updates state from the saved response."
      - criterion: Persistence
        weight: 25
        detail: "Successful updates persist in the backend and remain visible after reload."
      - criterion: Previous behavior
        weight: 15
        detail: "Feedback loading and filtering continue to work after updates are implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Resolved feedback requires a non-empty response."
      - "Keep response length at or below 500 characters."
      - "After saving, use the backend response to update the frontend state."
---

## Overview

You are building a customer success dashboard in a fullstack React + Express +
SQLite workspace. The app must call the real backend, persist updates for the
life of the running process, and keep earlier behavior working as you move
through the steps.

## Product Context

You are working on a small customer success dashboard. Support teammates need to
review feedback, filter it by status, and resolve items with a written response.
The frontend must call the real backend API, and changes should persist for the
life of the running backend process.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns a `feedback` table:

```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY,
  customer_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  response TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Valid statuses are `new`, `reviewing`, and `resolved`.

### `GET /feedback`

Returns:

```json
{
  "feedback": []
}
```

Supports optional `status`. Invalid status returns HTTP 400:

```json
{
  "error": "Invalid status"
}
```

### `PATCH /feedback/:id`

Updates status and optional response. Validation rules:

- invalid id returns HTTP 400 with `Invalid feedback id`
- missing feedback returns HTTP 404 with `Feedback not found`
- invalid status returns HTTP 400 with `Invalid status`
- response must be a string if provided
- response maximum length is 500 characters
- resolved feedback requires a non-empty response

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading, error, empty, and list states. It should allow
filtering feedback by status, editing status and response, submitting updates to
the backend, displaying backend validation errors, and showing persisted changes
after reload.

## Reference Flow

1. Load seeded feedback from the backend and render it.
2. Filter feedback by status through the backend API.
3. Update feedback status and response through the backend API, including
   validation errors and persisted successful updates.
