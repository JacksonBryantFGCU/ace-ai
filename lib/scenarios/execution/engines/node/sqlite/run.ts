import { runNodeTests, type NodeRunInput, type NodeRunResult } from "@/lib/scenarios/execution/engines/node/runtime";
import { NodeExecError } from "@/lib/scenarios/execution/engines/node/diagnostics";
import { createDatabase } from "@/lib/scenarios/execution/engines/node/sqlite/sqlite-db";
import { createExpressModule } from "@/lib/scenarios/execution/engines/node/express/express-app";
import { createRequest } from "@/lib/scenarios/execution/engines/node/express/request-driver";

/** The specifier candidate/scenario code imports the database from. A scenario
 *  typically ships `workspace/db.ts` = `export { db } from "@ace/db";`. */
export const DB_MODULE_SPECIFIER = "@ace/db";

export interface SqliteRunOptions {
  /** `database/schema.sql` contents (applied to a fresh DB before tests). */
  schema: string;
  /** Optional `database/seed.sql` contents. */
  seed?: string;
  /** Also expose the bundled Express + request driver (framework: express). */
  withExpress?: boolean;
}

/**
 * Run a SQLite interview — a THIN composition over the Node runtime (Phase 7),
 * exactly like the Express layer. Per run it:
 *   1. creates a FRESH in-memory SQLite database and applies schema (+ seed),
 *   2. injects the small `db` API as the `@ace/db` builtin (and, in Express mode,
 *      the bundled express + request driver),
 *   3. delegates to `runNodeTests` (compilation, linker, vm, diagnostics, limits
 *      all unchanged),
 *   4. destroys the database in `finally` — no persistence, no shared state.
 *
 * Schema/seed failures are returned as run-level diagnostics (never thrown to a
 * raw crash).
 */
export async function runSqliteTests(input: NodeRunInput, options: SqliteRunOptions): Promise<NodeRunResult> {
  let handle;
  try {
    handle = await createDatabase(options.schema, options.seed);
  } catch (e) {
    if (e instanceof NodeExecError) {
      return { tests: [], diagnostics: [{ category: e.category, message: e.message, file: e.file, line: e.line, stack: e.stack }] };
    }
    return {
      tests: [],
      diagnostics: [{ category: "connection", message: e instanceof Error ? e.message : String(e) }],
    };
  }

  try {
    const builtins: Record<string, unknown> = {
      ...input.builtins,
      [DB_MODULE_SPECIFIER]: { db: handle.db, default: handle.db, __esModule: true },
    };
    const extraGlobals: Record<string, unknown> = { ...input.extraGlobals };
    if (options.withExpress) {
      builtins.express = createExpressModule();
      extraGlobals.request = createRequest();
    }
    return await runNodeTests({ ...input, builtins, extraGlobals });
  } finally {
    handle.close();
  }
}
