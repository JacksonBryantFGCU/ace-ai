---
id: banking-transfers-api
title: Banking Transfers API
summary: "Build an Express + SQLite Banking Transfers API with account reads, atomic transfers, double-entry ledger entries, and idempotency."
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
  - pattern:transactional-ledger
difficulty: hard
experienceMin: junior
experienceMax: senior
estimatedMinutes: 60
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
  - criterion: Account read behavior
    weight: 20
    detail: "Implements account listing, filtering, detail retrieval, ledger history, and stable joined response shapes."
  - criterion: Transfer validation and transaction safety
    weight: 25
    detail: "Validates accounts, statuses, amounts, descriptions, and uses a SQLite transaction so failed transfers leave no partial state."
  - criterion: Balance and ledger correctness
    weight: 25
    detail: "Debits and credits integer-cent balances correctly, creates exactly two ledger entries, and records balance_after_cents."
  - criterion: Idempotency and transfer detail
    weight: 15
    detail: "Returns existing transfers for duplicate idempotency keys without mutating balances or ledger entries, and exposes transfer details safely."
  - criterion: Maintainability
    weight: 15
    detail: "Preserves previous behavior, uses parameterized SQL, avoids floating-point money, and keeps route code auditable."
source: authored
status: verified
version: 1
steps:
  - id: list-and-fetch-accounts
    kind: implement
    prompt: "Implement GET /accounts and GET /accounts/:id in workspace/app.ts. Return joined customer summaries, support validated customer/status filters, return account details with ordered ledger history, and handle invalid or missing ids."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Use joins between accounts and customers for both list and detail responses."
      - "Ledger entries for account detail should be ordered by created_at ASC, id ASC."
      - "Validate filters before querying rows."
  - id: create-transfers
    kind: implement
    prompt: "Add POST /transfers. Validate accounts, statuses, amount, and description, then create a completed transfer, update both balances, and write debit/credit ledger entries in one SQLite transaction."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-2.test.ts] }
    weight: 45
    checkpoint: { files: [solution/step-2/app.ts] }
    hints:
      - "Check idempotency_key before validating the rest of the request."
      - "Only open accounts can send or receive transfers."
      - "The transfer row, both account updates, and both ledger entries should be inside the same transaction."
  - id: transfer-details-and-idempotency
    kind: implement
    prompt: "Add GET /transfers/:id and complete duplicate idempotency behavior. Transfer detail should include ordered ledger entries, and duplicate idempotency keys must return the original transfer without applying it again."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-3.test.ts] }
    weight: 25
    checkpoint: { files: [solution/step-3/app.ts] }
    hints:
      - "Duplicate idempotency keys should not debit, credit, insert a transfer, or insert ledger entries again."
      - "Transfer ledger entries should be ordered by id ASC."
      - "The duplicate response should include duplicate: true."
---

## Overview

You are working on an internal money movement service for a small fintech
product. The service reads customer bank accounts, creates transfers between
accounts, records double-entry ledger history, and protects transfer creation
with idempotency keys.

The Express app and SQLite database bridge already exist. Implement the missing
route behavior in `workspace/app.ts` while preserving earlier functionality as
you move through the steps.

Difficulty: Hard. Expected time: 45-60 minutes.

## Tech Stack

- TypeScript
- Node
- Express
- SQLite

## Money Rules

All money is represented as integer cents. Do not use floating-point dollars.
Use `balance_cents` and `amount_cents` throughout the API and database.

## Database

The database is already created and seeded before each verification run:

```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  balance_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE transfers (
  id INTEGER PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  from_account_id INTEGER NOT NULL,
  to_account_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (from_account_id) REFERENCES accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES accounts(id)
);

CREATE TABLE ledger_entries (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  transfer_id INTEGER NOT NULL,
  direction TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (transfer_id) REFERENCES transfers(id)
);
```

Valid account statuses are `open`, `frozen`, and `closed`. Transfers can only be
created from and to open accounts.

Valid ledger directions are `debit` and `credit`. A successful transfer creates
one debit ledger entry for the source account and one credit ledger entry for
the destination account.

## Step 1: List and Fetch Accounts

Implement:

- `GET /accounts`
- `GET /accounts/:id`

`GET /accounts` should return all accounts with customer summary fields. Support
optional `customer_id` and `status` filters, including combined filters. Default
ordering is `id ASC`.

Validation errors:

- `{ "error": "Invalid customer id" }`
- `{ "error": "Customer not found" }`
- `{ "error": "Invalid account status" }`

`GET /accounts/:id` should return one account with customer details and ordered
ledger history. Return `{ "error": "Invalid account id" }` for invalid ids and
`{ "error": "Account not found" }` for missing accounts.

## Step 2: Create Transfers Atomically

Implement:

- `POST /transfers`

Request body:

```json
{
  "idempotency_key": "transfer_1001",
  "from_account_id": 1,
  "to_account_id": 2,
  "amount_cents": 2500,
  "description": "Rent split"
}
```

Requirements:

- Require a non-empty `idempotency_key`.
- Return an existing transfer if the idempotency key was already used.
- Validate source and destination account ids.
- Verify both accounts exist.
- Reject same-account transfers.
- Require both accounts to be open.
- Require `amount_cents` to be an integer greater than zero.
- Reject insufficient funds.
- Validate optional description, trim it, convert empty strings to `null`, and
  enforce a 120 character maximum.
- Create a completed transfer.
- Debit the source account and credit the destination account.
- Update both account balances and `updated_at` values.
- Create exactly two ledger entries with resulting balances.
- Perform all mutations inside one SQLite transaction.

Validation errors:

- `{ "error": "Idempotency key is required" }`
- `{ "error": "Source account id is required" }`
- `{ "error": "Invalid source account id" }`
- `{ "error": "Destination account id is required" }`
- `{ "error": "Invalid destination account id" }`
- `{ "error": "Source account not found" }`
- `{ "error": "Destination account not found" }`
- `{ "error": "Cannot transfer to the same account" }`
- `{ "error": "Source account is not open" }`
- `{ "error": "Destination account is not open" }`
- `{ "error": "Amount is required" }`
- `{ "error": "Invalid amount" }`
- `{ "error": "Insufficient funds" }`
- `{ "error": "Invalid description" }`
- `{ "error": "Description is too long" }`

## Step 3: Idempotency and Transfer Details

Implement:

- `GET /transfers/:id`
- duplicate idempotency behavior for `POST /transfers`

`GET /transfers/:id` should return one transfer with its two ledger entries
ordered by `id ASC`. Return `{ "error": "Invalid transfer id" }` for invalid ids
and `{ "error": "Transfer not found" }` for missing transfers.

Duplicate idempotency keys should return the original transfer with status 200
and `duplicate: true`. Duplicate requests must not debit balances again, credit
balances again, create another transfer row, or create more ledger entries.

## Workspace

- **`app.ts`** *(edit, entry)* - the Express app and route handlers.
- **`db.ts`** *(readonly)* - re-exports the SQLite database injected by the
  verification engine.
- **`backend-types.d.ts`** *(readonly)* - editor declarations for Express and
  the injected SQLite handle.

## Reference Solutions

- `solution/step-1/app.ts` - account list/detail endpoints.
- `solution/step-2/app.ts` - account reads plus transactional transfer creation.
- `solution/step-3/app.ts` - full API surface with transfer detail and idempotency.

## Evaluation Notes

The tests are cumulative. Each checkpoint must preserve behavior from earlier
steps while adding the current step's behavior.

Strong solutions validate before mutating, use parameterized SQLite queries,
keep money as integer cents, wrap transfer mutations in a transaction, write
ledger entries with resulting balances, and handle idempotency before applying a
transfer.

Reference solutions live under `solution/step-N/`, so they import readonly
workspace helpers with paths like `../../workspace/db`. When a checkpoint is
applied to the candidate workspace, the checkpoint source normalizes that import
to `./db` because the solution file is overlaid at the workspace root as
`app.ts`.
