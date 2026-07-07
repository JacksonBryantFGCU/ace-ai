---
id: blog-comments-api
title: Blog Comments API
summary: "Build an Express + SQLite Blog Comments API with nested public comments, comment creation, pagination, and moderation."
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
  - pattern:nested-comments
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
  - criterion: Public comment API behavior
    weight: 25
    detail: "Implements public comment listing, creation, and moderation endpoints with correct HTTP responses and stable JSON shapes."
  - criterion: SQLite joins and nested response shaping
    weight: 20
    detail: "Uses relational queries to load posts, users, comments, and replies while hiding author emails and internal fields."
  - criterion: Validation and error handling
    weight: 20
    detail: "Validates ids, published post visibility, pagination, author existence, parent relationships, body text, and moderation statuses."
  - criterion: Comment visibility and moderation correctness
    weight: 20
    detail: "Hides pending and hidden comments from public lists, nests only visible replies, defaults new comments to pending, and reflects moderation updates."
  - criterion: Maintainability
    weight: 15
    detail: "Preserves previous step behavior, avoids unsafe SQL construction, keeps helper code readable, and maintains deterministic ordering."
source: authored
status: verified
version: 1
steps:
  - id: list-visible-comments
    kind: implement
    prompt: "Implement GET /posts/:postId/comments in workspace/app.ts. Validate the post id, only list comments for published posts, return visible top-level comments with visible replies, support pagination, and hide author emails."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Treat missing, draft, and archived posts the same public way: return Post not found."
      - "Query top-level comments separately from replies so pagination applies only to top-level comments."
      - "Join users for author names, but do not include author emails in responses."
  - id: create-comments
    kind: implement
    prompt: "Add POST /posts/:postId/comments. Validate published post access, author id, optional parent id, reply depth, and body text. Create pending comments or replies and return the created comment with a safe author object."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-2.test.ts] }
    weight: 35
    checkpoint: { files: [solution/step-2/app.ts] }
    hints:
      - "New comments should default to pending, so they should not appear in the public list until moderated visible."
      - "A parent comment must exist, belong to the same post, and be top-level."
      - "Trim the comment body before storing it and enforce the 500 character maximum after trimming."
  - id: moderate-comments
    kind: implement
    prompt: "Add PATCH /comments/:id/status. Validate the comment id and requested moderation status, allow only visible or hidden, update updated_at, return the updated comment, and ensure public lists reflect the change."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-3.test.ts] }
    weight: 30
    checkpoint: { files: [solution/step-3/app.ts] }
    hints:
      - "The moderation endpoint should reject pending as a target status."
      - "Use the same safe comment response shape as creation."
      - "Visibility rules apply to replies as well as top-level comments."
---

## Overview

You are working on the commenting system for a lightweight publishing platform.
The service needs public comment lists for published posts, pending comment
creation, one-level threaded replies, and a small moderation workflow.

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
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  parent_id INTEGER,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);
```

## Status Rules

Valid post statuses:

- `draft`
- `published`
- `archived`

Only published posts should allow public comment listing and new comment
creation.

Valid comment statuses:

- `visible`
- `pending`
- `hidden`

Public list responses should include only visible top-level comments and visible
replies. New comments default to `pending`. Moderation can set comments to
`visible` or `hidden`; it should not set comments back to `pending`.

## Step 1: List Visible Comments

Implement:

- `GET /posts/:postId/comments`

Response shape:

```json
{
  "comments": [
    {
      "id": 1,
      "post_id": 1,
      "author": { "id": 1, "name": "Alex Rivera" },
      "parent_id": null,
      "body": "Great post.",
      "status": "visible",
      "created_at": "2025-01-10T09:00:00.000Z",
      "updated_at": "2025-01-10T09:00:00.000Z",
      "replies": []
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

Requirements:

- Validate `postId` and return `{ "error": "Invalid post id" }` for invalid ids.
- Return `{ "error": "Post not found" }` for missing, draft, or archived posts.
- Return only visible top-level comments.
- Nest visible replies under their top-level parent.
- Hide pending and hidden comments and replies.
- Support `limit` and `offset`.
- Default `limit` to 20 and `offset` to 0.
- Reject limits above 50.
- Order top-level comments and replies by `created_at ASC, id ASC`.
- Do not expose author emails.

## Step 2: Create Comments and Replies

Implement:

- `POST /posts/:postId/comments`

Top-level comment request:

```json
{
  "author_id": 1,
  "body": "This was helpful."
}
```

Reply request:

```json
{
  "author_id": 2,
  "parent_id": 1,
  "body": "I agree."
}
```

Requirements:

- Validate `postId` and only allow comments on published posts.
- Require a valid existing `author_id`.
- Validate optional `parent_id`.
- Parent comments must exist, belong to the same post, and be top-level.
- Reject replies to replies.
- Require a non-empty body after trimming.
- Enforce a 500 character body limit.
- Insert new comments with status `pending`.
- Generate `created_at` and `updated_at` server-side.
- Return HTTP 201 with the created comment and safe author object.
- Keep pending comments hidden from the public list until moderated.

Validation errors:

- `{ "error": "Invalid post id" }`
- `{ "error": "Post not found" }`
- `{ "error": "Author id is required" }`
- `{ "error": "Invalid author id" }`
- `{ "error": "Author not found" }`
- `{ "error": "Invalid parent id" }`
- `{ "error": "Parent comment not found" }`
- `{ "error": "Parent comment does not belong to this post" }`
- `{ "error": "Cannot reply to a reply" }`
- `{ "error": "Body is required" }`
- `{ "error": "Body is too long" }`

## Step 3: Moderate Comments

Implement:

- `PATCH /comments/:id/status`

Request body:

```json
{
  "status": "hidden"
}
```

Requirements:

- Validate comment id.
- Return `{ "error": "Comment not found" }` for missing comments.
- Require `status`.
- Allow only `visible` or `hidden`.
- Reject `pending` as a moderation target.
- Update `updated_at`.
- Return the updated comment with a safe author object.
- Public list responses should reflect moderation changes.

Validation errors:

- `{ "error": "Invalid comment id" }`
- `{ "error": "Comment not found" }`
- `{ "error": "Status is required" }`
- `{ "error": "Invalid moderation status" }`

## Workspace

- **`app.ts`** *(edit, entry)* - the Express app and route handlers.
- **`db.ts`** *(readonly)* - re-exports the SQLite database injected by the
  verification engine.
- **`backend-types.d.ts`** *(readonly)* - editor declarations for Express and
  the injected SQLite handle.

## Reference Solutions

- `solution/step-1/app.ts` - public comment listing with pagination and nested replies.
- `solution/step-2/app.ts` - listing plus pending comment and reply creation.
- `solution/step-3/app.ts` - full API surface with moderation.

## Evaluation Notes

The tests are cumulative. Each checkpoint must preserve behavior from earlier
steps while adding the current step's behavior.

Strong solutions use SQLite joins for author data, keep public response shapes
stable, hide non-visible comments from public lists, validate parent-child
relationships before inserting, avoid exposing author emails, and keep
moderation behavior easy to audit.

Reference solutions live under `solution/step-N/`, so they import readonly
workspace helpers with paths like `../../workspace/db`. When a checkpoint is
applied to the candidate workspace, the checkpoint source normalizes that import
to `./db` because the solution file is overlaid at the workspace root as
`app.ts`.
