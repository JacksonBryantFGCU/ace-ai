---
id: marketplace-order-console
title: Marketplace Order Console
summary: "Build an internal marketplace order operations console with a React frontend and an Express + SQLite backend."
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
    - { path: shared/marketplace.ts, role: readonly }
  entry: frontend/src/App.tsx
rubric:
  - criterion: Backend API behavior
    weight: 25
    detail: "Implements the joined order query and detail, filtering, summary metrics, transactional order creation with inventory decrement, and transactional fulfillment/cancellation with inventory restore, with correct order-state rules and stable JSON response shapes."
  - criterion: Frontend product workflow
    weight: 25
    detail: "Fetches from the real backend, renders usable states, lists and filters orders, shows order detail and items, creates orders, fulfills and cancels orders, and surfaces backend validation."
  - criterion: Fullstack integration
    weight: 25
    detail: "Uses VITE_API_BASE_URL, preserves backend state across refreshes, and surfaces backend validation errors in the UI."
  - criterion: Code clarity
    weight: 15
    detail: "Keeps the React and Express code readable, focused, and consistent with the scenario conventions, including the SQLite joins and transactions."
  - criterion: Accessibility and UX
    weight: 10
    detail: "Uses accessible labels, clear controls, and predictable feedback during loading, errors, and saves."
source: authored
status: verified
visibility: public
version: 1
steps:
  - id: load-orders
    kind: implement
    prompt: "Complete the order loading workflow. The backend should list orders joined with their customer (including item and seller counts), return order detail with joined items/products/sellers, and return customer/seller/active-product options; the frontend should fetch all three from VITE_API_BASE_URL and render loading/error/empty states, the order list, and the selected order's items."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend joined order query
        weight: 35
        detail: "GET /orders returns customer, status, subtotal, item_count, and seller_count for every order, ordered by created_at descending then id ascending; GET /orders/:id returns the order with its items joined to product and seller; GET /order-options returns every customer, every seller, and only active products from active sellers."
      - criterion: Frontend order list and detail rendering
        weight: 35
        detail: "The React app fetches from VITE_API_BASE_URL, renders loading/error/empty states, lists orders, and shows the selected order's items with product, seller, quantity, and totals."
      - criterion: Real API integration
        weight: 30
        detail: "The frontend does not rely on hardcoded order data."
    weight: 30
    checkpoint:
      files:
        - solution/step-1/backend/src/app.ts
        - solution/step-1/frontend/src/App.tsx
    hints:
      - "Keep the frontend API base URL configurable through VITE_API_BASE_URL."
      - "item_count and seller_count are derived from order_items, not stored columns — a correlated subquery or a join plus GROUP BY both work."
      - "seller_count counts distinct sellers across an order's items, since one order can span multiple sellers."
  - id: filter-summarize-and-create
    kind: implement
    prompt: "Add status, customer, and seller filtering, a summary panel, and order creation. GET /orders should validate the optional status, customer_id, and seller_id query parameters, GET /orders/summary should return order counts and revenue, POST /orders should validate and create a pending order transactionally, and the UI should expose filters, a summary panel, and a create-order form."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend filters, summary, and order creation
        weight: 35
        detail: "GET /orders validates status/customer_id/seller_id (seller_id matches orders containing at least one item from that seller); GET /orders/summary returns total/pending/fulfilled/cancelled counts and gross/pending revenue; POST /orders validates the customer and every item (product exists and is active, seller is active, quantity is a positive integer within inventory, no duplicate products), computes line totals and the subtotal server-side, and decrements inventory transactionally."
      - criterion: Frontend filters, summary, and create form
        weight: 35
        detail: "The UI lets users filter orders, view the summary panel, and create a multi-item order through the backend, showing validation errors and updating the order list, summary, and product options after a successful create."
      - criterion: Previous behavior
        weight: 30
        detail: "Unfiltered order loading and the order detail view remain intact."
    weight: 30
    checkpoint:
      files:
        - solution/step-2/backend/src/app.ts
        - solution/step-2/frontend/src/App.tsx
    hints:
      - "Validate every item before writing anything — a bad item later in the array should reject the whole order, not partially create it."
      - "A duplicate product id anywhere in the items array is invalid, even if earlier items in the array were otherwise fine."
      - "unit_price_cents on an order item is copied from the product's current price at creation time, not looked up later."
  - id: fulfill-and-cancel
    kind: implement
    prompt: "Implement order fulfillment and cancellation. PATCH /orders/:id/fulfill and PATCH /orders/:id/cancel should only act on pending orders, and the React UI should let a candidate fulfill or cancel an order, display backend validation errors, and update the order, its detail, and the summary from the saved response."
    verification: hybrid
    verify: { harness: none }
    rubric:
      - criterion: Backend fulfillment and cancellation rules
        weight: 30
        detail: "Both endpoints validate the id and current order status (only pending orders can transition), fulfillment sets fulfilled_at without touching inventory, and cancellation sets cancelled_at and restores inventory for every item, all within a transaction."
      - criterion: Frontend fulfill/cancel workflow
        weight: 30
        detail: "The UI submits fulfillment and cancellation through the backend, shows validation errors, and updates the order's status and the summary from the saved response."
      - criterion: Persistence
        weight: 25
        detail: "A successful fulfillment or cancellation persists in the backend and remains visible after reload."
      - criterion: Previous behavior
        weight: 15
        detail: "Order loading, filtering, the summary panel, and order creation continue to work after fulfillment and cancellation are implemented."
    weight: 40
    checkpoint:
      files:
        - solution/step-3/backend/src/app.ts
        - solution/step-3/frontend/src/App.tsx
    hints:
      - "Fulfilled and cancelled orders are terminal — neither can be fulfilled or cancelled again, and a fulfilled order can't be cancelled or vice versa."
      - "Cancelling restores inventory for every item on the order, not just the first one."
      - "After a successful fulfill or cancel, use the backend response to update that order's status (and its detail panel) and refresh the summary."
---

## Overview

You are building an internal marketplace order operations console in a
fullstack React + Express + SQLite workspace. The app must call the real
backend, persist updates for the life of the running process, and keep
earlier behavior working as you move through the steps.

## Product Context

You are working on an internal console for a small team that operates a
multi-seller marketplace. Operators need to see orders across customers and
sellers, drill into an order's line items, filter by status/customer/seller,
watch summary metrics, place new orders on a customer's behalf, and move
orders through fulfillment or cancellation as they're processed. The
frontend must call the real backend API, and changes should persist for the
life of the running backend process.

## Tech Stack

- TypeScript
- Express
- SQLite through sql.js
- React
- Vite

## Backend Contract

The backend owns five tables:

```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE sellers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  seller_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL,
  inventory_count INTEGER NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (seller_id) REFERENCES sellers(id)
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  fulfilled_at TEXT,
  cancelled_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (seller_id) REFERENCES sellers(id)
);
```

Valid seller statuses are `active` and `suspended`. Valid order statuses are
`pending`, `fulfilled`, and `cancelled`. Money is stored as integer cents.

An order summary joins in its customer and item/seller counts:

```json
{
  "id": 1,
  "customer": { "id": 1, "name": "Alex Rivera", "email": "alex@example.com" },
  "status": "pending",
  "subtotal_cents": 12900,
  "item_count": 2,
  "seller_count": 1,
  "created_at": "2025-02-10T15:00:00.000Z",
  "updated_at": "2025-02-10T15:00:00.000Z",
  "fulfilled_at": null,
  "cancelled_at": null
}
```

An order detail joins in each item's product and seller:

```json
{
  "order": {},
  "items": [
    {
      "id": 1,
      "product": { "id": 1, "name": "Wireless Keyboard", "sku": "TECH-KEY-001" },
      "seller": { "id": 1, "name": "Tech Supply Co" },
      "quantity": 2,
      "unit_price_cents": 4500,
      "line_total_cents": 9000
    }
  ]
}
```

Errors always take the shape `{ "error": "Human-readable message" }`.

### `GET /orders`

Returns `{ "orders": [] }`, ordered by `created_at` descending, then `id`
ascending. Supports optional `status`, `customer_id`, and `seller_id` query
parameters, which can be combined. `seller_id` matches any order containing
at least one item from that seller.

Validation: invalid `status` → 400 `Invalid order status`; invalid
`customer_id` → 400 `Invalid customer id`; missing customer → 404
`Customer not found`; invalid `seller_id` → 400 `Invalid seller id`; missing
seller → 404 `Seller not found`.

### `GET /orders/:id`

Returns `{ "order": {}, "items": [] }`, items ordered by `id` ascending.
Validation: invalid id → 400 `Invalid order id`; missing order → 404
`Order not found`.

### `GET /order-options`

Returns `{ "customers": [], "sellers": [], "products": [] }` for building
filters and the create-order form: every customer, every seller, and only
active products from active sellers, each ordered by `id` ascending.

### `GET /orders/summary`

Returns order metrics across every order:

```json
{
  "summary": {
    "total_orders": 8,
    "pending": 4,
    "fulfilled": 2,
    "cancelled": 2,
    "gross_revenue_cents": 16800,
    "pending_revenue_cents": 42600
  }
}
```

`gross_revenue_cents` sums fulfilled orders only; `pending_revenue_cents`
sums pending orders only; cancelled orders never count toward revenue.

### `POST /orders`

Creates a pending order. Request body:
`{ "customer_id", "items": [{ "product_id", "quantity" }] }`.

Validation, checked before anything is written:

- invalid `customer_id` → 400 `Invalid customer id`
- missing customer → 404 `Customer not found`
- missing/empty `items` → 400 `Items are required`
- duplicate `product_id` within the request → 400 `Duplicate product in order`
- invalid `product_id` → 400 `Invalid product id`
- missing product → 404 `Product not found`
- inactive product → 400 `Product is inactive`
- product's seller is suspended → 400 `Seller is suspended`
- non-positive or non-integer quantity → 400 `Invalid quantity`
- quantity exceeds inventory → 400 `Insufficient inventory`

On success: line totals and the subtotal are calculated server-side, each
item's `unit_price_cents` is copied from the product's current price,
inventory is decremented per item, and the order is created with status
`pending`, all in a single transaction. Returns HTTP 201 with the created
order detail (same shape as `GET /orders/:id`).

### `PATCH /orders/:id/fulfill`

Fulfills a pending order: sets status `fulfilled`, sets `fulfilled_at`,
updates `updated_at`. Does not change inventory.

Validation: invalid id → 400 `Invalid order id`; missing order → 404
`Order not found`; already fulfilled → 400 `Order is already fulfilled`;
cancelled → 400 `Order is cancelled`. Returns HTTP 200 with the updated
order detail.

### `PATCH /orders/:id/cancel`

Cancels a pending order: sets status `cancelled`, sets `cancelled_at`,
updates `updated_at`, and restores inventory for every item, all in a
transaction.

Validation: invalid id → 400 `Invalid order id`; missing order → 404
`Order not found`; already cancelled → 400 `Order is already cancelled`;
fulfilled → 400 `Order is fulfilled`. Returns HTTP 200 with the updated
order detail.

## Frontend Contract

The React app must read the backend URL from:

```txt
VITE_API_BASE_URL
```

The app should show loading, error, and empty states; list orders and show
the selected order's items; filter by status, customer, and seller; show a
summary panel; create a multi-item order; display backend validation
errors; fulfill and cancel orders; and show persisted changes after reload.

## Reference Flow

1. Load orders and render the selected order's items.
2. Filter by status, customer, or seller, view the summary, and place a new
   order through the backend API.
3. Fulfill or cancel an order through the backend API, including the
   validation errors for invalid transitions and persisted successful
   changes.
