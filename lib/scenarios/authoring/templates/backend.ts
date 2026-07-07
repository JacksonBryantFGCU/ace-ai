import { splitFrontmatter, splitSections } from "@/lib/scenarios/parse";
import { SCENARIO_VISIBILITIES, scenarioSchema } from "@/lib/scenarios/schema";
import type { AuthoredBundle } from "@/lib/scenarios/authoring/types";

/**
 * The canonical BACKEND scenario template (Phase 10).
 *
 * Every backend interview scenario is generated from this one shape, so the whole
 * library shares a folder layout, an execution profile, and a testing style. The
 * template targets the production backend stack the Execution Platform runs:
 * TypeScript on Node, Express in memory, and a fresh in-memory SQLite database per
 * verification (`framework: express` + `database: { engine: sqlite }`).
 *
 * The scaffold it emits is intentionally MINIMAL but COMPLETE: a single working
 * `GET /health` endpoint with one passing test, so a freshly generated scenario is
 * green from the first `scenario:check`. Authors grow it from there — adding
 * `workspace/routes.ts`, more steps under `solution/step-N/`, and richer tests —
 * following `docs/README.md`.
 *
 * It is PURE (no fs): the CLI/Studio decides where to write the returned files.
 */

/** The canonical folder layout every backend scenario follows. `optional` files
 *  are conventions to grow into; the scaffold emits only the required set. */
export const BACKEND_TEMPLATE_LAYOUT: readonly { path: string; role: string; optional?: boolean }[] = [
  { path: "scenario.md", role: "definition" },
  { path: "workspace/app.ts", role: "edit (entry) — the Express app" },
  { path: "workspace/db.ts", role: "readonly — re-exports the injected database" },
  { path: "workspace/backend-types.d.ts", role: "readonly — editor/runtime type declarations" },
  { path: "workspace/routes.ts", role: "edit — route handlers (larger scenarios)", optional: true },
  { path: "database/schema.sql", role: "the CREATE TABLE statements (required)" },
  { path: "database/seed.sql", role: "seed rows applied after the schema", optional: true },
  { path: "tests/step-1.test.ts", role: "authored tests for step 1" },
  { path: "solution/step-1/app.ts", role: "reference solution for step 1" },
  { path: "preview/", role: "live preview (backend scenarios usually omit this)", optional: true },
];

export interface BackendScaffoldInput {
  /** Folder name === scenario id (kebab-case). */
  slug: string;
  /** Human title. */
  title: string;
  /** One-line summary (10–200 chars, distinct from the title). */
  summary: string;
  /** Category folder (must be a known backend category). Defaults to `backend-node`. */
  category?: string;
  /** Omit for public scenarios; set to `internal` only for templates/reference fixtures. */
  visibility?: (typeof SCENARIO_VISIBILITIES)[number];
}

/** `workspace/db.ts` — the read-only bridge to the engine-provided database. The
 *  candidate imports it as `./db`; the SQLite engine injects the real handle. */
const DB_TS = `// Provided by the SQLite verification engine: a fresh in-memory database per run,
// with database/schema.sql (and database/seed.sql) already applied. Import it
// anywhere in the workspace as \`import { db } from "./db";\`. Read-only — do not edit.
export { db } from "@ace/db";
`;

/** `workspace/backend-types.d.ts` — readonly editor declarations for engine-provided modules. */
const BACKEND_TYPES_D_TS = `// Editor/type declarations for modules provided by the backend verification engine.
// Runtime implementations are injected by the Node/Express/SQLite engine.

declare module "express" {
  export interface Request {
    method: string;
    url: string;
    originalUrl: string;
    path: string;
    query: Record<string, string | string[]>;
    params: Record<string, string>;
    headers: Record<string, string>;
    body: unknown;
    cookies: Record<string, string>;
    get(name: string): string | undefined;
  }

  export interface Response {
    statusCode: number;
    status(code: number): Response;
    set(field: string | Record<string, string>, value?: string): Response;
    json(body: unknown): Response;
    send(body?: unknown): Response;
    sendStatus(code: number): Response;
    end(data?: unknown): void;
  }

  export type NextFunction = (err?: unknown) => void;
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => unknown;

  export interface Router {
    use(path: string, ...handlers: RequestHandler[]): Router;
    use(...handlers: RequestHandler[]): Router;
    get(path: string, ...handlers: RequestHandler[]): Router;
    post(path: string, ...handlers: RequestHandler[]): Router;
    put(path: string, ...handlers: RequestHandler[]): Router;
    patch(path: string, ...handlers: RequestHandler[]): Router;
    delete(path: string, ...handlers: RequestHandler[]): Router;
    all(path: string, ...handlers: RequestHandler[]): Router;
  }

  export interface Express extends Router {
    listen(...args: unknown[]): never;
  }

  export interface ExpressFactory {
    (): Express;
    json(): RequestHandler;
    urlencoded(): RequestHandler;
    Router(): Router;
  }

  const express: ExpressFactory;
  export default express;
}

declare module "@ace/db" {
  export type SqlParams = unknown[] | Record<string, unknown> | undefined;

  export interface DbApi {
    run(sql: string, params?: SqlParams): { changes: number; lastInsertRowid: number };
    get<T = Record<string, unknown>>(sql: string, params?: SqlParams): T | undefined;
    all<T = Record<string, unknown>>(sql: string, params?: SqlParams): T[];
    exec(sql: string): void;
    transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R;
  }

  export const db: DbApi;
  export default db;
}
`;

/** `workspace/app.ts` — the STARTER the candidate edits (endpoint left as a TODO). */
const APP_STARTER = `import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO: implement GET /health so it responds 200 with { status: "ok" }.
// \`db\` is a ready in-memory SQLite database (see database/schema.sql).

export default app;
`;

/** `solution/step-1/app.ts` — the reference solution. It imports the workspace via
 *  \`../../workspace/…\`; the checkpoint overlay rewrites that to \`./…\` when applied. */
const APP_SOLUTION = `import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

// GET /health — a liveness probe that also confirms the database is reachable.
app.get("/health", (_req, res) => {
  db.get("SELECT 1");
  res.status(200).json({ status: "ok" });
});

export default app;
`;

const SCHEMA_SQL = `-- A minimal users table so the scenario has real database state to verify.
CREATE TABLE users (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL
);
`;

const SEED_SQL = `INSERT INTO users (email, name) VALUES ('ada@example.com', 'Ada Lovelace');
`;

/** `tests/step-1.test.ts` — verifies the HTTP contract AND the database wiring, the
 *  two things every backend step proves. \`request\` is a global (Express mode). */
const STEP_1_TEST = `import app from "../workspace/app";
import { db } from "../workspace/db";

test("GET /health responds 200 with { status: 'ok' }", async () => {
  const res = await request(app).get("/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: "ok" });
});

test("the seeded database is available to the app", () => {
  const users = db.all("SELECT email FROM users");
  expect(users).toEqual([{ email: "ada@example.com" }]);
});
`;

/** Build the `scenario.md` (frontmatter + body) for a backend scaffold. */
function scenarioMarkdown(input: BackendScaffoldInput): string {
  const category = input.category ?? "backend-node";
  const visibilityLine = input.visibility ? `visibility: ${input.visibility}\n` : "";
  return `---
id: ${input.slug}
title: ${input.title}
summary: "${input.summary}"
category: ${category}
skills:
  - rest-api
  - sqlite
  - http-handlers
jobRoles:
  - backend
  - fullstack
tags:
  - framework:express
  - database:sqlite
  - format:pair-programming
difficulty: easy
experienceMin: entry
experienceMax: senior
estimatedMinutes: 15
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
  - criterion: Correctness
    weight: 100
    detail: "The endpoint returns the specified response and the database wiring works."
source: authored
status: review
${visibilityLine}version: 1
steps:
  - id: implement-health-endpoint
    kind: implement
    prompt: "Implement GET /health in workspace/app.ts so it responds with HTTP 200 and the JSON body { \\"status\\": \\"ok\\" }. The in-memory database is available via the imported db handle."
    verification: automated-tests
    verify: { harness: node-vm, functionName: app, tests: [tests/step-1.test.ts] }
    weight: 100
    checkpoint: { files: [solution/step-1/app.ts] }
    hints:
      - "Register a GET route for \\"/health\\" on the Express app."
      - "Send the status code and JSON together: res.status(200).json({ status: \\"ok\\" })."
      - "You can touch the database (e.g. db.get(\\"SELECT 1\\")) to prove it is reachable before responding."
---

## Overview

A minimal Express + SQLite backend step: implement a \`GET /health\` endpoint that
returns \`{ "status": "ok" }\`. The scenario exists to exercise the full backend
pipeline end to end — Node engine, in-memory Express, and a fresh in-memory SQLite
database — so it is deliberately tiny.

## Workspace

- **\`app.ts\`** *(edit, entry)* — the Express app the candidate completes.
- **\`db.ts\`** *(readonly)* — re-exports the engine-provided database handle.

## Reference Solutions

- \`solution/step-1/app.ts\` — the completed \`GET /health\` endpoint.

## Evaluation Notes

Correctness only: the endpoint returns the specified response and the seeded
database is reachable. Use this template as the starting point for real backend
scenarios (see docs/README.md).
`;
}

/**
 * Generate the files for a new backend scenario, keyed by scenario-relative POSIX
 * path (including `scenario.md`). This is the single source of truth for the
 * backend starting point — the golden template scenario is exactly this output.
 */
export function scaffoldBackendScenario(input: BackendScaffoldInput): Record<string, string> {
  return {
    "scenario.md": scenarioMarkdown(input),
    "workspace/app.ts": APP_STARTER,
    "workspace/db.ts": DB_TS,
    "workspace/backend-types.d.ts": BACKEND_TYPES_D_TS,
    "database/schema.sql": SCHEMA_SQL,
    "database/seed.sql": SEED_SQL,
    "tests/step-1.test.ts": STEP_1_TEST,
    "solution/step-1/app.ts": APP_SOLUTION,
  };
}

/**
 * Build an in-memory `AuthoredBundle` from the scaffold — the same shape the
 * filesystem loader produces — so the authoring toolkit can validate a generated
 * backend scenario without writing anything to disk.
 */
export function createBackendTemplateBundle(input: BackendScaffoldInput): AuthoredBundle {
  const files = scaffoldBackendScenario(input);
  const raw = files["scenario.md"]!;
  const { frontmatter, body } = splitFrontmatter(raw);
  const parsed = scenarioSchema.safeParse(frontmatter);

  const bundleFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    if (path === "scenario.md") continue;
    bundleFiles[path] = content;
  }

  return {
    slug: input.slug,
    category: input.category ?? "backend-node",
    raw,
    frontmatter,
    scenario: parsed.success ? parsed.data : null,
    schemaError: parsed.success ? null : parsed.error.message,
    sections: splitSections(body),
    files: bundleFiles,
  };
}
