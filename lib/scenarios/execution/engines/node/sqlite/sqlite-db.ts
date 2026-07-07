/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { NodeExecError, type NodeDiagnosticCategory } from "@/lib/scenarios/execution/engines/node/diagnostics";

/**
 * The in-memory SQLite database backing the SQLite engine. It uses `sql.js`
 * (real SQLite compiled to WebAssembly, already a project dependency) loaded
 * HOST-side — candidate code never touches it directly, only the small `db` API
 * injected into the sandbox. A brand-new `:memory:` database is created per
 * verification run and closed afterward: no files, no persistence, no shared
 * state.
 */

// Root a require at a real filesystem URL so the WASM + module resolve from
// node_modules at runtime (never bundled), mirroring the React host-module trick.
const nodeRequire = createRequire(pathToFileURL(join(process.cwd(), "package.json")).href);

let sqlJsPromise: Promise<any> | null = null;
function getSqlJs(): Promise<any> {
  if (!sqlJsPromise) {
    const initSqlJs = nodeRequire("sql.js");
    const wasmBinary = readFileSync(nodeRequire.resolve("sql.js/dist/sql-wasm.wasm"));
    sqlJsPromise = initSqlJs({ wasmBinary }) as Promise<any>;
  }
  return sqlJsPromise;
}

export type SqlParams = unknown[] | Record<string, unknown> | undefined;

/** The better-sqlite3-style surface exposed to candidate code + tests. */
export interface DbApi {
  run(sql: string, params?: SqlParams): { changes: number; lastInsertRowid: number };
  get<T = Record<string, unknown>>(sql: string, params?: SqlParams): T | undefined;
  all<T = Record<string, unknown>>(sql: string, params?: SqlParams): T[];
  exec(sql: string): void;
  transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R;
}

export interface DatabaseHandle {
  db: DbApi;
  close(): void;
}

function classify(message: string): NodeDiagnosticCategory {
  if (/UNIQUE constraint failed/i.test(message)) return "constraint";
  if (/NOT NULL constraint failed/i.test(message)) return "constraint";
  if (/CHECK constraint failed/i.test(message)) return "constraint";
  if (/FOREIGN KEY constraint failed/i.test(message)) return "foreign-key";
  if (/cannot start a transaction|no transaction is active|within a transaction/i.test(message)) return "transaction";
  return "query"; // syntax errors, "no such table/column", type errors, …
}

function sqlError(e: unknown): NodeExecError {
  const message = e instanceof Error ? e.message : String(e);
  return new NodeExecError(classify(message), message);
}

/** Coerce JS values to what sql.js can bind (number | string | Uint8Array | null). */
function coerce(value: unknown): unknown {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === undefined) return null;
  return value;
}

function normalizeParams(params: SqlParams): unknown[] | Record<string, unknown> | undefined {
  if (params == null) return undefined;
  if (Array.isArray(params)) return params.map(coerce);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const val = coerce(v);
    if (/^[:@$]/.test(k)) out[k] = val;
    else {
      out[`:${k}`] = val;
      out[`@${k}`] = val;
      out[`$${k}`] = val;
    }
  }
  return out;
}

function makeDbApi(raw: any): DbApi {
  const lastInsertRowid = (): number => {
    const res = raw.exec("SELECT last_insert_rowid()");
    return Number(res[0]?.values?.[0]?.[0] ?? 0);
  };

  const api: DbApi = {
    run(sql, params) {
      const stmt = raw.prepare(sql);
      try {
        const p = normalizeParams(params);
        if (p !== undefined) stmt.bind(p);
        stmt.step();
      } catch (e) {
        throw sqlError(e);
      } finally {
        stmt.free();
      }
      return { changes: raw.getRowsModified(), lastInsertRowid: lastInsertRowid() };
    },
    get(sql, params) {
      const stmt = raw.prepare(sql);
      try {
        const p = normalizeParams(params);
        if (p !== undefined) stmt.bind(p);
        const row = stmt.step() ? stmt.getAsObject() : undefined;
        return row as any;
      } catch (e) {
        throw sqlError(e);
      } finally {
        stmt.free();
      }
    },
    all(sql, params) {
      const stmt = raw.prepare(sql);
      const rows: any[] = [];
      try {
        const p = normalizeParams(params);
        if (p !== undefined) stmt.bind(p);
        while (stmt.step()) rows.push(stmt.getAsObject());
      } catch (e) {
        throw sqlError(e);
      } finally {
        stmt.free();
      }
      return rows;
    },
    exec(sql) {
      try {
        raw.run(sql);
      } catch (e) {
        throw sqlError(e);
      }
    },
    transaction(fn) {
      return (...args) => {
        api.exec("BEGIN");
        try {
          const result = fn(...args);
          api.exec("COMMIT");
          return result;
        } catch (e) {
          try {
            api.exec("ROLLBACK");
          } catch {
            /* ignore rollback failure */
          }
          throw e;
        }
      };
    },
  };
  return api;
}

/**
 * Create a fresh in-memory database, apply `schema.sql`, then (if present)
 * `seed.sql`. Schema/seed failures throw a categorized `NodeExecError` so the
 * caller can surface them as run-level diagnostics.
 */
export async function createDatabase(schema: string, seed?: string): Promise<DatabaseHandle> {
  const SQL = await getSqlJs();
  const raw = new SQL.Database();
  try {
    raw.run("PRAGMA foreign_keys = ON;");
  } catch {
    /* pragma best-effort */
  }
  try {
    if (schema.trim()) raw.run(schema);
  } catch (e) {
    raw.close();
    throw new NodeExecError("schema", `schema.sql failed: ${e instanceof Error ? e.message : String(e)}`, "database/schema.sql");
  }
  if (seed && seed.trim()) {
    try {
      raw.run(seed);
    } catch (e) {
      raw.close();
      throw new NodeExecError("seed", `seed.sql failed: ${e instanceof Error ? e.message : String(e)}`, "database/seed.sql");
    }
  }
  return { db: makeDbApi(raw), close: () => raw.close() };
}
