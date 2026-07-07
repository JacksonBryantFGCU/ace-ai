/**
 * Structured diagnostics for the Node engine. Every failure is CATEGORIZED and
 * carries a message (and, where known, a file/line/stack) — the engine never
 * lets a raw Node crash escape.
 */
export type NodeDiagnosticCategory =
  | "compilation" // TypeScript failed to compile
  | "import" // a module could not be resolved
  | "unsupported" // a disallowed feature (fs/http/child_process/…) was requested
  | "runtime" // an exception while loading/evaluating a module
  | "assertion" // an expect() assertion failed (per-test)
  | "timeout" // a test/run exceeded its time budget (per-test)
  | "internal" // an unexpected engine fault
  // ── SQLite engine (Phase 9) ──
  | "schema" // database/schema.sql failed to apply
  | "migration" // a schema migration failed
  | "query" // a SQL statement failed (syntax / no such table|column / type)
  | "constraint" // NOT NULL / UNIQUE / CHECK constraint failed
  | "foreign-key" // FOREIGN KEY constraint failed
  | "transaction" // a transaction could not begin/commit/rollback
  | "seed" // database/seed.sql failed to apply
  | "connection"; // the database could not be opened

export interface NodeDiagnostic {
  category: NodeDiagnosticCategory;
  message: string;
  file?: string;
  line?: number;
  stack?: string;
}

/**
 * Error carrier used inside the runtime so a categorized failure can be thrown
 * across the module linker and recovered with its category intact. Extends the
 * host `Error` so `instanceof` checks in the host realm work.
 */
export class NodeExecError extends Error {
  constructor(
    readonly category: NodeDiagnosticCategory,
    message: string,
    readonly file?: string,
    readonly line?: number,
  ) {
    super(message);
    this.name = "NodeExecError";
  }
}

/** Node built-ins + common backend packages that v1 explicitly does NOT support.
 *  A bare import of any of these yields an "unsupported" (not merely "not found")
 *  diagnostic so the author gets an actionable message. */
export const UNSUPPORTED_MODULES: ReadonlySet<string> = new Set([
  "fs",
  "fs/promises",
  "node:fs",
  "http",
  "https",
  "node:http",
  "net",
  "node:net",
  "dgram",
  "child_process",
  "node:child_process",
  "worker_threads",
  "node:worker_threads",
  "cluster",
  "os",
  "node:os",
  "process",
  "node:process",
  "express",
  "fastify",
  "@nestjs/core",
  "koa",
  "pg",
  "mysql",
  "mysql2",
  "sqlite3",
  "better-sqlite3",
  "mongodb",
  "redis",
  "ws",
  "socket.io",
  "axios",
  "node-fetch",
]);

export function isUnsupportedModule(spec: string): boolean {
  if (spec === "crypto" || spec === "node:crypto") return false;
  return UNSUPPORTED_MODULES.has(spec) || spec.startsWith("node:");
}
