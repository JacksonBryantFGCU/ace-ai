---
id: product-catalog-api
title: Product Catalog API
summary: "Build an Express + SQLite Product Catalog API with product listing, detail lookup, filtering, sorting, and creation."
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
  - pattern:catalog-crud
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
    weight: 25
    detail: "Implements listing, detail lookup, filtering, sorting, and creation with correct status codes and JSON response shapes."
  - criterion: SQLite persistence and querying
    weight: 25
    detail: "Uses the provided SQLite database for reads and inserts, including product creation and created-product lookup."
  - criterion: Validation and error handling
    weight: 25
    detail: "Validates ids, categories, active filters, numeric fields, and request bodies with predictable JSON errors."
  - criterion: SQL safety and type normalization
    weight: 15
    detail: "Parameterizes user values, whitelists sort columns, and converts SQLite integer booleans to API booleans."
  - criterion: Code clarity
    weight: 10
    detail: "Keeps handlers readable, avoids overengineering, and preserves previous step behavior."
source: authored
status: verified
version: 1
steps:
  - id: list-and-fetch-products
    kind: implement
    prompt: "Implement GET /products and GET /products/:id in workspace/app.ts. Return seeded products from SQLite, validate ids, return 404 for missing products, and convert is_active from SQLite integers to API booleans."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Use db.all for the list endpoint and db.get for the detail endpoint."
      - "Route params are strings; convert req.params.id to a positive integer before querying."
      - "Map each database row so is_active is true when the stored value is 1 and false when it is 0."
  - id: filter-and-sort-products
    kind: implement
    prompt: "Extend GET /products to support optional category, active, and sort query parameters. Validate invalid query values, support combining filters with sorting, and keep Step 1 behavior working."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-2.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-2/app.ts] }
    hints:
      - "Allowed categories are apparel, electronics, home, and books."
      - "Parse active only from the strings true and false, then query SQLite with 1 or 0."
      - "Parameterize filter values and whitelist sort columns before adding them to ORDER BY."
  - id: create-products
    kind: implement
    prompt: "Add POST /products. Validate the request body, default omitted is_active to true, insert valid products into SQLite, and return the created product with HTTP 201."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-3.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-3/app.ts] }
    hints:
      - "Trim the product name before validating and saving it."
      - "price_cents and stock should be integers greater than or equal to zero."
      - "Use the insert result's lastInsertRowid, then read the row back so the response uses the same product shape as the GET endpoints."
---

## Overview

You are working on an internal product catalog service for a small ecommerce
admin tool. The team needs a focused API for listing products, looking up a
single product, filtering the catalog, and adding new products.

The Express app and SQLite database bridge already exist. Implement the missing
route behavior in `workspace/app.ts` while preserving earlier functionality as
you move through the steps.

Difficulty: Easy. Expected time: 25-30 minutes.

## Tech Stack

- TypeScript
- Node
- Express
- SQLite

## Database

The `products` table is already created and seeded before each verification run:

```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
```

`price_cents` is used instead of decimal dollars to avoid floating-point issues.
`is_active` is stored in SQLite as `1` for active products and `0` for inactive
products.

Valid categories are:

- `apparel`
- `electronics`
- `home`
- `books`

Seed data is deterministic and includes multiple categories, active states,
prices, stock counts, and creation timestamps. Keep all product data in SQLite;
do not use module-level arrays as the source of truth.

## API Contract

Products returned by the API should have this shape:

```ts
{
  id: number;
  name: string;
  category: "apparel" | "electronics" | "home" | "books";
  price_cents: number;
  stock: number;
  is_active: boolean;
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

## Step 1: List and Fetch Products

Implement:

- `GET /products`
- `GET /products/:id`

Requirements:

- Return all seeded products from SQLite.
- Return HTTP 200 for successful list and detail requests.
- Use the response shapes `{ "products": [...] }` and `{ "product": {...} }`.
- Include `id`, `name`, `category`, `price_cents`, `stock`, `is_active`, and `created_at`.
- Convert `is_active` from the SQLite integer into a boolean in API responses.
- Return products in deterministic `id` order.
- Return HTTP 400 with `{ "error": "Invalid product id" }` for invalid ids.
- Return HTTP 404 with `{ "error": "Product not found" }` for missing products.

## Step 2: Filtering and Sorting

Extend `GET /products` with optional query parameters:

- `category`
- `active`
- `sort`

Valid category values are `apparel`, `electronics`, `home`, and `books`. Invalid
category values should return HTTP 400 with:

```json
{
  "error": "Invalid category"
}
```

Valid active filter values are `true` and `false`. Invalid active values should
return HTTP 400 with:

```json
{
  "error": "Invalid active filter"
}
```

Valid sort values are `price`, `stock`, and `created_at`. Invalid sort values
should return HTTP 400 with:

```json
{
  "error": "Invalid sort"
}
```

Supported examples:

- `GET /products?category=electronics`
- `GET /products?active=true`
- `GET /products?sort=price`
- `GET /products?category=electronics&active=true&sort=price`

Use parameterized query values for filters. For sort fields, whitelist the
accepted column names before building the `ORDER BY` clause. Sort in ascending
order and use `id` as a deterministic secondary sort.

## Step 3: Create Products

Implement:

- `POST /products`

Request body:

```json
{
  "name": "Desk Lamp",
  "category": "home",
  "price_cents": 3999,
  "stock": 12,
  "is_active": true
}
```

Successful creation should return HTTP 201 with:

```json
{
  "product": {
    "id": 7,
    "name": "Desk Lamp",
    "category": "home",
    "price_cents": 3999,
    "stock": 12,
    "is_active": true,
    "created_at": "2025-01-10T09:00:00.000Z"
  }
}
```

The actual `id` is generated by SQLite. The server generates `created_at`.

Validation rules:

- Missing or blank `name` returns HTTP 400 with `{ "error": "Name is required" }`.
- Unsupported `category` returns HTTP 400 with `{ "error": "Invalid category" }`.
- `price_cents` must be an integer greater than or equal to `0`; otherwise return `{ "error": "Invalid price" }`.
- `stock` must be an integer greater than or equal to `0`; otherwise return `{ "error": "Invalid stock" }`.
- `is_active` must be a boolean when provided; otherwise return `{ "error": "Invalid active value" }`.
- If `is_active` is omitted, default it to `true`.

## Workspace

- **`app.ts`** *(edit, entry)* - the Express app and route handlers.
- **`db.ts`** *(readonly)* - re-exports the SQLite database injected by the
  verification engine.
- **`backend-types.d.ts`** *(readonly)* - editor declarations for Express and
  the injected SQLite handle.

## Reference Solutions

- `solution/step-1/app.ts` - list and detail endpoints.
- `solution/step-2/app.ts` - list/detail endpoints plus filtering and sorting.
- `solution/step-3/app.ts` - full API surface required by the interview.

## Evaluation Notes

The tests are cumulative. Each checkpoint must preserve behavior from earlier
steps while adding the new endpoint behavior for the current step.

Strong solutions use SQLite for every read and insert; parameterize user-provided
filter values; whitelist sort columns; normalize `is_active` into a boolean at
the API boundary; return deterministic ordering; and keep JSON response shapes
consistent.

Reference solutions live under `solution/step-N/`, so they import readonly
workspace helpers with paths like `../../workspace/db`. When a checkpoint is
applied to the candidate workspace, the checkpoint source normalizes that import
to `./db` because the solution file is overlaid at the workspace root as
`app.ts`.
