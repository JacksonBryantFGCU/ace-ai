---
id: authentication-api
title: Authentication API
summary: "Build an Express + SQLite Authentication API with registration, login, bearer-token profile access, and logout."
category: backend-node
skills:
  - rest-api
  - express
  - sqlite
  - authentication
jobRoles:
  - backend
  - fullstack
tags:
  - category:backend-rest-api
  - framework:express
  - database:sqlite
  - pattern:authentication
difficulty: medium
experienceMin: junior
experienceMax: senior
estimatedMinutes: 40
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
  - criterion: Authentication API behavior
    weight: 25
    detail: "Implements registration, login, profile retrieval, and logout with correct status codes and JSON response shapes."
  - criterion: SQLite persistence and session state
    weight: 20
    detail: "Uses SQLite for users and sessions, enforces unique emails, creates tokens, and revokes only the current token."
  - criterion: Validation and safe errors
    weight: 20
    detail: "Validates registration, login, bearer auth, and tokens with predictable errors that do not leak credential details."
  - criterion: Password and token safety
    weight: 20
    detail: "Hashes passwords, avoids password/hash leakage, generates opaque tokens, and rejects revoked tokens."
  - criterion: Code clarity and reuse
    weight: 15
    detail: "Keeps auth helpers readable, reuses safe user/session logic, and preserves earlier step behavior."
source: authored
status: verified
version: 1
steps:
  - id: register-users
    kind: implement
    prompt: "Implement POST /auth/register in workspace/app.ts. Validate email, password, and name; normalize email; hash passwords; enforce unique emails; create a session token; and return a safe user object."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Normalize email with trim().toLowerCase() before validation and lookup."
      - "Use scryptSync from node:crypto with a random salt; store the salt and hash together."
      - "Return only id, email, name, and created_at for users. Never return password_hash."
  - id: login-users
    kind: implement
    prompt: "Add POST /auth/login. Normalize email, verify the password against the stored hash, return the same error for unknown email and wrong password, create a fresh session token, and preserve registration behavior."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-2.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-2/app.ts] }
    hints:
      - "The seed user is alex@example.com with password Password123!."
      - "Parse your stored password hash format to recover the salt before calling scryptSync for verification."
      - "Every successful login should insert a new sessions row with a new opaque token."
  - id: authenticated-session-flow
    kind: implement
    prompt: "Add GET /auth/me and POST /auth/logout. Require Authorization: Bearer <token>, reject missing, malformed, invalid, and revoked tokens, return the current safe user, and revoke only the current session on logout."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-3.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-3/app.ts] }
    hints:
      - "Create a shared helper that parses the bearer token and loads the active session plus user."
      - "Missing or malformed Authorization headers should return Authentication required."
      - "Invalid or revoked tokens should return Invalid or expired token."
---

## Overview

You are working on the authentication service for a small SaaS admin tool. The
team needs a focused API for user registration, login, bearer-token profile
access, and logout.

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

The database is already created before each verification run:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

The seed data includes one user for login testing:

- Email: `alex@example.com`
- Password: `Password123!`
- Name: `Alex Rivera`

The database stores only a password hash for this user. Do not store plaintext
passwords.

## API Contract

Safe user objects returned by the API should have this shape:

```ts
{
  id: number;
  email: string;
  name: string;
  created_at: string;
}
```

Registration and login responses should return:

```json
{
  "token": "opaque-session-token",
  "user": {
    "id": 1,
    "email": "alex@example.com",
    "name": "Alex Rivera",
    "created_at": "2025-01-10T09:00:00.000Z"
  }
}
```

Never return `password`, `password_hash`, session table internals, or revoked
tokens. Error responses should use:

```json
{
  "error": "Human-readable error message"
}
```

## Step 1: Register Users

Implement:

- `POST /auth/register`

Request body:

```json
{
  "email": "sam@example.com",
  "password": "Password123!",
  "name": "Sam Carter"
}
```

Requirements:

- Trim and lowercase email.
- Validate email is present and has a basic email shape.
- Require password and enforce a minimum length of 8 characters.
- Trim name and reject empty names.
- Reject duplicate emails with HTTP 409.
- Hash passwords before storing them.
- Insert the user into SQLite.
- Create a session token in SQLite.
- Return HTTP 201 with `{ "token": "...", "user": {...} }`.
- Never return password hashes.

Validation errors:

- Missing email: `{ "error": "Email is required" }`
- Invalid email: `{ "error": "Invalid email" }`
- Missing password: `{ "error": "Password is required" }`
- Weak password: `{ "error": "Password must be at least 8 characters" }`
- Missing or blank name: `{ "error": "Name is required" }`
- Duplicate email: `{ "error": "Email already registered" }`

## Step 2: Login Users

Implement:

- `POST /auth/login`

Request body:

```json
{
  "email": "alex@example.com",
  "password": "Password123!"
}
```

Requirements:

- Trim and lowercase email.
- Require email and password.
- Look up the user by normalized email.
- Verify the password against the stored password hash.
- Return the same HTTP 401 error for unknown email and wrong password.
- Create a new session token on every successful login.
- Return HTTP 200 with token and safe user.
- Keep registration working.

Validation errors:

- Missing email: `{ "error": "Email is required" }`
- Missing password: `{ "error": "Password is required" }`
- Invalid credentials: `{ "error": "Invalid email or password" }`

## Step 3: Authenticated Session Flow

Implement:

- `GET /auth/me`
- `POST /auth/logout`

Authenticated requests must use:

```http
Authorization: Bearer opaque-session-token
```

`GET /auth/me` should return:

```json
{
  "user": {
    "id": 1,
    "email": "alex@example.com",
    "name": "Alex Rivera",
    "created_at": "2025-01-10T09:00:00.000Z"
  }
}
```

`POST /auth/logout` should revoke the current session token and return:

```json
{
  "message": "Logged out"
}
```

Requirements:

- Reject missing or malformed Authorization headers with HTTP 401 and `{ "error": "Authentication required" }`.
- Reject invalid or revoked tokens with HTTP 401 and `{ "error": "Invalid or expired token" }`.
- Look up tokens in the `sessions` table.
- Reject sessions where `revoked_at` is already set.
- Set `revoked_at` when logging out.
- Logout should revoke only the current token, not every token for the user.
- Keep registration and login working.

## Workspace

- **`app.ts`** *(edit, entry)* - the Express app and route handlers.
- **`db.ts`** *(readonly)* - re-exports the SQLite database injected by the
  verification engine.
- **`backend-types.d.ts`** *(readonly)* - editor declarations for Express,
  `node:crypto`, and the injected SQLite handle.

## Reference Solutions

- `solution/step-1/app.ts` - registration with password hashing and session creation.
- `solution/step-2/app.ts` - registration plus login.
- `solution/step-3/app.ts` - full authenticated session flow.

## Evaluation Notes

The tests are cumulative. Each checkpoint must preserve behavior from earlier
steps while adding the current step's authentication behavior.

Strong solutions use SQLite for users and sessions, store salted password hashes
instead of plaintext passwords, return only safe user objects, generate opaque
tokens, reject invalid and revoked tokens consistently, and keep helper code
readable enough to audit.

Reference solutions live under `solution/step-N/`, so they import readonly
workspace helpers with paths like `../../workspace/db`. When a checkpoint is
applied to the candidate workspace, the checkpoint source normalizes that import
to `./db` because the solution file is overlaid at the workspace root as
`app.ts`.
