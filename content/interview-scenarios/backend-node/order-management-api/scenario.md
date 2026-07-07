---
id: order-management-api
title: Order Management API
summary: "Build an Express + SQLite Order Management API with joined order reads, transactional creation, stock updates, and status transitions."
category: backend-node
skills:
  - rest-api
  - express
  - sqlite
  - transactions
jobRoles:
  - backend
  - fullstack
tags:
  - category:backend-rest-api
  - framework:express
  - database:sqlite
  - pattern:relational-workflow
difficulty: medium
experienceMin: junior
experienceMax: senior
estimatedMinutes: 45
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
  - criterion: Relational API behavior
    weight: 25
    detail: "Implements order list/detail, creation, and status updates with correct HTTP responses and stable JSON shapes."
  - criterion: SQLite joins and response shaping
    weight: 20
    detail: "Uses joins to return customer and item details without hardcoded data or internal fields."
  - criterion: Order creation correctness
    weight: 25
    detail: "Validates customers/products/quantities, calculates totals from database prices, inserts parent and child rows, and decrements stock."
  - criterion: Transaction and consistency handling
    weight: 15
    detail: "Uses a transaction so failed order creation leaves no partial rows or stock mutations."
  - criterion: Status transitions and code clarity
    weight: 15
    detail: "Enforces allowed status transitions, updates timestamps, preserves previous behavior, and keeps route code auditable."
source: authored
status: verified
version: 1
steps:
  - id: list-and-fetch-orders
    kind: implement
    prompt: "Implement GET /orders and GET /orders/:id in workspace/app.ts. Return joined customer summaries, support a validated status filter, return detailed order items, and handle invalid or missing order ids."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Use joins between orders and customers for the list response."
      - "Use a separate query for order_items joined to products when building the detail response."
      - "Default ordering should be created_at ASC, id ASC."
  - id: create-orders
    kind: implement
    prompt: "Add POST /orders. Validate customer and item inputs, reject inactive or understocked products, calculate totals from product prices, create the order and items in a transaction, decrement stock, and return the created detail."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-2.test.ts] }
    weight: 40
    checkpoint: { files: [solution/step-2/app.ts] }
    hints:
      - "Reject duplicate product ids before inserting anything."
      - "Never trust client-submitted prices; read price_cents from the products table."
      - "Wrap the order insert, item inserts, and stock updates in db.transaction."
  - id: update-order-status
    kind: implement
    prompt: "Add PATCH /orders/:id/status. Validate the order id and requested status, enforce allowed transitions, update updated_at, and return the unchanged order detail shape."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-3.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-3/app.ts] }
    hints:
      - "Allowed statuses are pending, paid, shipped, and cancelled."
      - "Allowed transitions are pending -> paid/cancelled and paid -> shipped/cancelled."
      - "Shipped and cancelled orders are terminal."
---

## Overview

You are working on an internal order management service for a small ecommerce
admin tool. The service needs to read joined relational order data, create new
orders from product inventory, and move orders through a constrained status
workflow.

The Express app and SQLite database bridge already exist. Implement the missing
route behavior in `workspace/app.ts` while preserving earlier functionality as
you move through the steps.

Difficulty: Medium. Expected time: 35-45 minutes.

## Tech Stack

- TypeScript
- Node
- Express
- SQLite

## Database

The database is already created and seeded before each verification run:

```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

Use `price_cents`, `unit_price_cents`, `line_total_cents`, and `total_cents`.
Do not use decimal dollar values. Product prices must come from the database.

## Status Rules

Valid order statuses:

- `pending`
- `paid`
- `shipped`
- `cancelled`

Allowed transitions:

- `pending -> paid`
- `pending -> cancelled`
- `paid -> shipped`
- `paid -> cancelled`

`shipped` and `cancelled` are terminal.

## Step 1: List and Fetch Orders

Implement:

- `GET /orders`
- `GET /orders/:id`

`GET /orders` should return:

```json
{
  "orders": [
    {
      "id": 1,
      "customer_id": 1,
      "customer_name": "Alex Rivera",
      "customer_email": "alex@example.com",
      "status": "pending",
      "total_cents": 7498,
      "created_at": "2025-01-10T09:00:00.000Z",
      "updated_at": "2025-01-10T09:00:00.000Z"
    }
  ]
}
```

Requirements:

- Use joined SQLite queries.
- Default ordering is `created_at ASC, id ASC`.
- Support `GET /orders?status=pending`.
- Reject invalid status filters with `{ "error": "Invalid status" }`.
- Validate order ids and return `{ "error": "Invalid order id" }` for invalid ids.
- Return `{ "error": "Order not found" }` for missing orders.

`GET /orders/:id` should return a detail object with customer details and item
details, including product names, quantities, unit prices, and line totals.

## Step 2: Create Orders

Implement:

- `POST /orders`

Request body:

```json
{
  "customer_id": 1,
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 2, "quantity": 1 }
  ]
}
```

Requirements:

- Validate `customer_id`.
- Verify the customer exists.
- Require at least one item.
- Validate every product id and quantity.
- Reject missing, inactive, understocked, or duplicated product items.
- Calculate unit prices and totals from database product rows.
- Insert the order with status `pending`.
- Insert every order item.
- Decrement product stock.
- Use a SQLite transaction so failed creation leaves no partial rows or stock changes.
- Return HTTP 201 with the created order detail.

Validation errors:

- `{ "error": "Customer id is required" }`
- `{ "error": "Invalid customer id" }`
- `{ "error": "Customer not found" }`
- `{ "error": "At least one item is required" }`
- `{ "error": "Invalid product id" }`
- `{ "error": "Product not found" }`
- `{ "error": "Product is inactive" }`
- `{ "error": "Invalid quantity" }`
- `{ "error": "Insufficient stock" }`
- `{ "error": "Duplicate product item" }`

## Step 3: Update Order Status

Implement:

- `PATCH /orders/:id/status`

Request body:

```json
{
  "status": "paid"
}
```

Requirements:

- Validate order id.
- Verify order exists.
- Require and validate status.
- Enforce allowed transitions.
- Update `updated_at`.
- Return the updated order detail.
- Do not change order items or totals.

Validation errors:

- `{ "error": "Invalid order id" }`
- `{ "error": "Order not found" }`
- `{ "error": "Status is required" }`
- `{ "error": "Invalid status" }`
- `{ "error": "Invalid status transition" }`

## Workspace

- **`app.ts`** *(edit, entry)* - the Express app and route handlers.
- **`db.ts`** *(readonly)* - re-exports the SQLite database injected by the
  verification engine.
- **`backend-types.d.ts`** *(readonly)* - editor declarations for Express and
  the injected SQLite handle.

## Reference Solutions

- `solution/step-1/app.ts` - joined list and detail endpoints.
- `solution/step-2/app.ts` - reads plus transactional order creation.
- `solution/step-3/app.ts` - full API surface with status transitions.

## Evaluation Notes

The tests are cumulative. Each checkpoint must preserve behavior from earlier
steps while adding the current step's behavior.

Strong solutions use SQLite joins for read models, validate before mutating,
calculate totals from product rows, wrap order creation in a transaction, update
stock consistently, enforce status transitions, and keep JSON response shapes
stable.

Reference solutions live under `solution/step-N/`, so they import readonly
workspace helpers with paths like `../../workspace/db`. When a checkpoint is
applied to the candidate workspace, the checkpoint source normalizes that import
to `./db` because the solution file is overlaid at the workspace root as
`app.ts`.
