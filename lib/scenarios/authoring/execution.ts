import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";
import { resolveExecutionProfile, validateProfileCombo } from "@/lib/scenarios/execution/profile";
import { isUnsupportedModule } from "@/lib/scenarios/execution/engines/node/diagnostics";

const AT = "scenario.md → language/runtime/framework/verification";

/**
 * Execution-metadata validation (Phase 6): the generalized language / runtime /
 * framework / engine axes must form a legal combination. Catches impossible
 * pairings — React + Python runtime, Express + Browser runtime, Spring +
 * TypeScript, SQL + React, … — that a per-field check alone would miss.
 *
 * Works whether the scenario declares the metadata explicitly or omits it (the
 * profile is then derived from the legacy `stack.harness`), so it validates the
 * ACTUAL profile every scenario will execute under.
 */
export function validateExecution(bundle: AuthoredBundle): Diagnostic[] {
  const { scenario } = bundle;
  if (!scenario) return []; // frontmatter validator already reported the parse failure

  const profile = resolveExecutionProfile(scenario);
  const out: Diagnostic[] = validateProfileCombo(profile).map((problem) =>
    diag.error(
      "execution/incompatible-metadata",
      AT,
      `Incompatible execution metadata: ${problem}`,
      "Align language, runtime, framework, and verification.engine so they describe one real stack. " +
        "See docs/README.md for execution platform notes.",
    ),
  );

  // Engine-specific checks. The Node engine (v1) runs pure TypeScript modules:
  // only relative workspace imports are allowed — plus the bundled `express`
  // (Express mode) and the injected `@ace/db` (SQLite mode).
  if (profile.engine === "node") {
    const expressMode = profile.framework === "express";
    const sqliteMode = profile.database?.engine === "sqlite";
    const allowed = new Set<string>();
    if (expressMode) allowed.add("express");
    if (sqliteMode) allowed.add("@ace/db");
    allowed.add("crypto");
    allowed.add("node:crypto");
    out.push(...validateNodeImports(bundle, allowed));
    if (expressMode) out.push(...validateExpress(bundle));
    if (sqliteMode) out.push(...validateSqlite(bundle));
  }

  return out;
}

/** A specifier is "bare" when it is neither relative (`.`) nor absolute (`/`). */
const IMPORT_RE = /(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

function validateNodeImports(bundle: AuthoredBundle, allowed: Set<string>): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const [path, content] of Object.entries(bundle.files)) {
    if (!/^(workspace|tests)\//.test(path)) continue;
    if (!/\.(ts|tsx|js|jsx|mts|cts)$/.test(path)) continue;
    IMPORT_RE.lastIndex = 0;
    for (const match of content.matchAll(IMPORT_RE)) {
      const spec = match[1]!;
      if (spec.startsWith(".") || spec.startsWith("/")) continue; // relative/absolute are fine
      if (allowed.has(spec)) continue; // engine-provided module (express / @ace/db)
      if (isUnsupportedModule(spec)) {
        out.push(
          diag.error(
            "execution/unsupported-node-import",
            `${path}`,
            `imports "${spec}", which the Node engine (v1) does not support (no filesystem, network, processes, or databases).`,
            "Keep candidate code to pure TypeScript modules with relative imports only. Node/npm modules will be supported by a later engine version.",
          ),
        );
      } else {
        out.push(
          diag.warning(
            "execution/non-relative-node-import",
            `${path}`,
            `imports the bare specifier "${spec}"; the Node engine (v1) resolves only relative workspace imports.`,
            "Use a relative import (./ or ../) to another workspace file. External packages are not available in v1.",
          ),
        );
      }
    }
  }
  return out;
}

/**
 * Express-scenario checks (framework: express). The engine drives the app in
 * memory via `request(app)`, so the workspace entry MUST export an Express app
 * as its default and MUST NOT call `app.listen()`.
 */
function validateExpress(bundle: AuthoredBundle): Diagnostic[] {
  const { scenario } = bundle;
  const out: Diagnostic[] = [];
  const entry = scenario?.workspace.entry;
  const entryContent = entry ? bundle.files[`workspace/${entry}`] : undefined;

  if (entryContent !== undefined && !/\bexport\s+default\b/.test(entryContent)) {
    out.push(
      diag.error(
        "express/no-default-export",
        `workspace/${entry}`,
        "the Express entry does not `export default` an app.",
        "End the file with `export default app;` so tests can `import app from \"../workspace/…\"` and drive it with request(app).",
      ),
    );
  }

  for (const [path, content] of Object.entries(bundle.files)) {
    if (!/^workspace\//.test(path) || !/\.(ts|js|mts|cts)$/.test(path)) continue;
    if (/\.listen\s*\(/.test(content)) {
      out.push(
        diag.error(
          "express/uses-listen",
          `${path}`,
          "calls `.listen()`, which the Express engine does not support (it runs in memory, no ports).",
          "Remove the `app.listen(...)` call. The engine drives the exported app directly with request(app).",
        ),
      );
    }
  }

  const testFiles = Object.entries(bundle.files).filter(([p]) => /^tests\//.test(p));
  const importsApp = testFiles.some(([, content]) => /\bimport\s+\w+\s+from\s+["']\.\.?\/[^"']*["']/.test(content));
  if (testFiles.length > 0 && !importsApp) {
    out.push(
      diag.warning(
        "express/tests-missing-app-import",
        "tests/",
        "no test file imports the app as a default import.",
        'Tests should `import app from "../workspace/app"` and exercise it via request(app).',
      ),
    );
  }

  return out;
}

/**
 * SQLite-scenario checks (database.engine: sqlite). Static heuristics on the
 * schema — existence, duplicate tables, and foreign keys that reference an
 * undeclared table. Full SQL correctness (parse/constraint errors) is verified
 * against real SQLite at execution time and by the async `validateDatabase`.
 */
const CREATE_TABLE_RE = /create\s+table\s+(?:if\s+not\s+exists\s+)?["'`[]?(\w+)["'`\]]?/gi;
const REFERENCES_RE = /references\s+["'`[]?(\w+)["'`\]]?/gi;

function validateSqlite(bundle: AuthoredBundle): Diagnostic[] {
  const out: Diagnostic[] = [];
  const schema = bundle.files["database/schema.sql"];

  if (schema === undefined) {
    out.push(
      diag.error(
        "sqlite/missing-schema",
        "database/schema.sql",
        "a SQLite scenario must provide database/schema.sql.",
        "Add database/schema.sql with the CREATE TABLE statements applied to a fresh in-memory DB before tests run.",
      ),
    );
    return out;
  }

  const tables = new Set<string>();
  CREATE_TABLE_RE.lastIndex = 0;
  for (const m of schema.matchAll(CREATE_TABLE_RE)) {
    const name = m[1]!.toLowerCase();
    if (tables.has(name)) {
      out.push(
        diag.error(
          "sqlite/duplicate-table",
          "database/schema.sql",
          `table "${m[1]}" is created more than once.`,
          "Remove the duplicate CREATE TABLE, or use CREATE TABLE IF NOT EXISTS intentionally.",
        ),
      );
    }
    tables.add(name);
  }

  REFERENCES_RE.lastIndex = 0;
  for (const m of schema.matchAll(REFERENCES_RE)) {
    const ref = m[1]!.toLowerCase();
    if (!tables.has(ref)) {
      out.push(
        diag.error(
          "sqlite/foreign-key-unknown-table",
          "database/schema.sql",
          `a FOREIGN KEY references table "${m[1]}", which is not declared in the schema.`,
          "Declare the referenced table before the table that references it (SQLite creates tables top-to-bottom).",
        ),
      );
    }
  }

  return out;
}

/**
 * Async database validation: apply schema.sql (+ seed.sql) to a REAL fresh
 * in-memory SQLite and surface any parse/constraint error as a diagnostic. Runs
 * only for SQLite scenarios; a no-op (and never touches sql.js) otherwise, so
 * existing scenarios are unaffected.
 */
export async function validateDatabase(bundle: AuthoredBundle): Promise<Diagnostic[]> {
  const { scenario } = bundle;
  if (!scenario) return [];
  const profile = resolveExecutionProfile(scenario);
  if (profile.database?.engine !== "sqlite") return [];

  const schema = bundle.files["database/schema.sql"];
  if (schema === undefined) return []; // already reported by validateSqlite

  const { createDatabase } = await import("@/lib/scenarios/execution/engines/node/sqlite/sqlite-db");
  const { NodeExecError } = await import("@/lib/scenarios/execution/engines/node/diagnostics");
  try {
    const handle = await createDatabase(schema, bundle.files["database/seed.sql"]);
    handle.close();
    return [];
  } catch (e) {
    const isSchema = e instanceof NodeExecError && e.category === "schema";
    return [
      diag.error(
        isSchema ? "sqlite/invalid-schema" : "sqlite/invalid-seed",
        isSchema ? "database/schema.sql" : "database/seed.sql",
        `SQL failed to apply: ${e instanceof Error ? e.message : String(e)}`,
        "Fix the SQL so it runs against a fresh SQLite database.",
      ),
    ];
  }
}
