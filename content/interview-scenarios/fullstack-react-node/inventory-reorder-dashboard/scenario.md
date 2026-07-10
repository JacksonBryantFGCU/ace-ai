---
id: inventory-reorder-dashboard
title: Inventory Reorder Dashboard
summary: "Build an inventory reorder dashboard with a React frontend and an Express + SQLite backend."
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
    - { path: shared/inventory.ts, role: readonly }
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements product listing, category and low-stock filtering, summary counts, and update validation with stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, filters and summarizes inventory, and submits stock/status updates through the API."
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
  - id: load-inventory
    kind: implement
    prompt: "Complete the inventory loading workflow. The backend should return seeded products from SQLite with a computed needs_reorder field, and the frontend should fetch from VITE_API_BASE_URL and render loading, error, empty, and list states with a visible low-stock indicator."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend product list
        weight: 35
        detail: "GET /products returns deterministic seeded products from SQLite with the expected response shape, including the computed needs_reorder field."
      - criterion: Frontend loading flow
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL and renders loading, error, empty, and list states with a visible low-stock indicator."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not rely on hardcoded product data."
    weight: 30
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "The list endpoint should return { products: [...] }."
      - "needs_reorder is computed from stock and reorder_level; it is never stored in the database."
  - id: filter-and-summarize
    kind: implement
    prompt: "Add category filtering, low-stock filtering, and an inventory summary across the backend and frontend. GET /products should validate the optional category and low_stock query parameters, GET /products/summary should return aggregate counts, and the UI should expose filter controls and a summary panel."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend filters and summary
        weight: 35
        detail: "GET /products validates category and low_stock filters and returns only matching records; GET /products/summary returns correct aggregate counts."
      - criterion: Frontend filter and summary UI
        weight: 35
        detail: "The UI lets users filter by category and low stock, requests the filtered data through the API, and renders the summary panel."
      - criterion: Previous behavior
        weight: 30
        detail: "The unfiltered inventory loading behavior remains intact."
    weight: 30
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "Valid categories are apparel, electronics, home, and books."
      - "Invalid category filters should return { error: \"Invalid category\" } with HTTP 400; invalid low_stock values should return { error: \"Invalid low stock filter\" } with HTTP 400."
      - "low_stock accepts the literal string values \"true\" or \"false\"."
  - id: update-inventory
    kind: implement
    prompt: "Implement inventory updates. PATCH /products/:id should validate the id and the stock/reorder_status fields, and the React form should display backend validation errors, update the UI from the saved response, and refresh the summary after a successful save."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend update validation
        weight: 30
        detail: "PATCH /products/:id validates ids, rejects unknown or missing fields, and validates stock and reorder_status values."
      - criterion: Frontend update workflow
        weight: 30
        detail: "The UI submits updates through the backend, shows validation errors, and updates state and the summary from the saved response."
      - criterion: Persistence
        weight: 25
        detail: "Successful updates persist in the backend and remain visible after reload."
      - criterion: Previous behavior
        weight: 15
        detail: "Inventory loading, filtering, and the summary panel continue to work after updates are implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Only stock and reorder_status may be updated; any other field should return { error: \"Unknown update field\" }."
      - "Stock must be a non-negative integer."
      - "After saving, use the backend response to update the frontend state and re-fetch the summary."
---

## Overview

You are building an inventory operations dashboard in a fullstack React +
Express + SQLite workspace. The app must call the real backend, persist
updates for the life of the running process, and keep earlier behavior
working as you move through the steps.

## Product Context

You are working on an internal ecommerce inventory dashboard. Operations
teammates need to review product stock, filter by category or low-stock
status, see a quick summary of inventory health, and update stock levels or
reorder status as shipments come in. The frontend must call the real backend
API, and changes should persist for the life of the running backend process.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns a `products` table:

```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL,
  reorder_level INTEGER NOT NULL,
  reorder_status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Valid categories are `apparel`, `electronics`, `home`, and `books`. Valid
reorder statuses are `none`, `needed`, and `ordered`.

Every product response includes a computed `needs_reorder` field
(`stock <= reorder_level`). It is never stored in the database.

```json
{
  "id": 1,
  "name": "Wireless Mouse",
  "sku": "ELEC-MOUSE-001",
  "category": "electronics",
  "stock": 8,
  "reorder_level": 10,
  "reorder_status": "needed",
  "needs_reorder": true,
  "updated_at": "2025-01-10T09:00:00.000Z"
}
```

### `GET /products`

Returns:

```json
{
  "products": []
}
```

Supports optional `category` and `low_stock` query parameters. An invalid
category returns HTTP 400 with `{ "error": "Invalid category" }`. An invalid
`low_stock` value (anything other than `true` or `false`) returns HTTP 400
with `{ "error": "Invalid low stock filter" }`.

### `GET /products/summary`

Returns:

```json
{
  "summary": {
    "total_products": 8,
    "low_stock": 4,
    "ordered": 2
  }
}
```

### `PATCH /products/:id`

Updates `stock` and/or `reorder_status`. Validation rules:

- invalid id returns HTTP 400 with `Invalid product id`
- missing product returns HTTP 404 with `Product not found`
- an empty body returns HTTP 400 with `No update fields provided`
- any field other than `stock` or `reorder_status` returns HTTP 400 with `Unknown update field`
- `stock` must be a non-negative integer, otherwise HTTP 400 with `Invalid stock`
- `reorder_status` must be one of `none`, `needed`, `ordered`, otherwise HTTP 400 with `Invalid reorder status`

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading, error, empty, and list states. It should allow
filtering products by category and low-stock status, display an inventory
summary, edit stock and reorder status, submit updates to the backend,
display backend validation errors, and show persisted changes after reload.

## Reference Flow

1. Load seeded products from the backend and render them, including a
   low-stock indicator.
2. Filter products by category and low-stock status, and display a summary
   panel, through the backend API.
3. Update product stock and reorder status through the backend API,
   including validation errors and persisted successful updates.
