import { describe, expect, it } from "vitest";
import { runSqliteTests } from "@/lib/scenarios/execution/engines/node/sqlite/run";
import { createDatabase } from "@/lib/scenarios/execution/engines/node/sqlite/sqlite-db";
import { executionPlatform } from "@/server/scenarios/execution-platform";
import type { NodeRunInput } from "@/lib/scenarios/execution/engines/node/runtime";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";

const SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

const SEED = `INSERT INTO users (email, name) VALUES ('a@x.com', 'Ada'), ('b@x.com', 'Bel');`;

/** A scenario ships `workspace/db.ts` re-exporting the injected database. */
const DB_TS = `export { db } from "@ace/db";`;

function runSqlite(test: string, opts: { schema?: string; seed?: string; extra?: NodeRunInput["workspaceFiles"] } = {}) {
  return runSqliteTests(
    {
      workspaceFiles: [{ path: "db.ts", content: DB_TS, role: "readonly" }, ...(opts.extra ?? [])],
      testFiles: [{ path: "tests/e.test.ts", content: `import { db } from "../workspace/db";\n${test}` }],
    },
    { schema: opts.schema ?? SCHEMA, seed: opts.seed },
  );
}

describe("sqlite engine — direct database API", () => {
  it("creates a database from schema and runs CRUD", async () => {
    const { db, close } = await createDatabase(SCHEMA);
    try {
      const ins = db.run("INSERT INTO users (email, name) VALUES (?, ?)", ["z@x.com", "Zed"]);
      expect(ins.changes).toBe(1);
      expect(ins.lastInsertRowid).toBe(1);
      expect(db.get("SELECT name FROM users WHERE email = ?", ["z@x.com"])).toEqual({ name: "Zed" });
      expect(db.all("SELECT * FROM users")).toHaveLength(1);
      db.run("UPDATE users SET name = ? WHERE id = ?", ["Zoe", 1]);
      expect(db.get<{ name: string }>("SELECT name FROM users WHERE id = 1")!.name).toBe("Zoe");
      db.run("DELETE FROM users WHERE id = 1");
      expect(db.all("SELECT * FROM users")).toEqual([]);
    } finally {
      close();
    }
  });

  it("applies a seed file", async () => {
    const { db, close } = await createDatabase(SCHEMA, SEED);
    try {
      expect(db.all("SELECT email FROM users ORDER BY id")).toEqual([{ email: "a@x.com" }, { email: "b@x.com" }]);
    } finally {
      close();
    }
  });

  it("rolls back a failed transaction", async () => {
    const { db, close } = await createDatabase(SCHEMA, SEED);
    try {
      const move = db.transaction(() => {
        db.run("INSERT INTO users (email, name) VALUES ('c@x.com', 'Cid')");
        throw new Error("abort");
      });
      expect(() => move()).toThrow("abort");
      expect(db.all("SELECT * FROM users")).toHaveLength(2); // insert rolled back
    } finally {
      close();
    }
  });

  it("commits a successful transaction", async () => {
    const { db, close } = await createDatabase(SCHEMA, SEED);
    try {
      const add = db.transaction((email: string, name: string) => db.run("INSERT INTO users (email, name) VALUES (?, ?)", [email, name]));
      add("c@x.com", "Cid");
      expect(db.all("SELECT * FROM users")).toHaveLength(3);
    } finally {
      close();
    }
  });
});

describe("sqlite engine — through the runtime", () => {
  it("exposes db to candidate tests and runs queries", async () => {
    const result = await runSqlite(
      `test("crud", () => {
         db.run("INSERT INTO users (email, name) VALUES (?, ?)", ["k@x.com", "Kai"]);
         const row = db.get("SELECT name FROM users WHERE email = ?", ["k@x.com"]);
         expect(row).toEqual({ name: "Kai" });
         expect(db.all("SELECT * FROM users").length).toBe(1);
       });`,
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.tests[0]).toMatchObject({ passed: true });
  });

  it("reports a schema error as a run-level diagnostic (no crash)", async () => {
    const result = await runSqlite(`test("t", () => {});`, { schema: "CREATE TABLE (broken sql" });
    expect(result.tests).toHaveLength(0);
    expect(result.diagnostics[0]).toMatchObject({ category: "schema", file: "database/schema.sql" });
  });

  it("reports a seed error as a run-level diagnostic", async () => {
    const result = await runSqlite(`test("t", () => {});`, { seed: "INSERT INTO nope VALUES (1);" });
    expect(result.diagnostics[0]!.category).toBe("seed");
  });

  it("categorizes a UNIQUE constraint failure", async () => {
    const result = await runSqlite(
      `test("unique", () => {
         db.run("INSERT INTO users (email, name) VALUES ('dup@x.com', 'A')");
         expect(() => db.run("INSERT INTO users (email, name) VALUES ('dup@x.com', 'B')")).toThrow();
       });`,
    );
    expect(result.tests[0]).toMatchObject({ passed: true });
  });

  it("categorizes an uncaught constraint failure by category", async () => {
    const result = await runSqlite(
      `test("notnull", () => { db.run("INSERT INTO users (email) VALUES ('x@x.com')"); });`,
    );
    expect(result.tests[0]).toMatchObject({ passed: false, category: "constraint" });
  });

  it("enforces foreign keys", async () => {
    const result = await runSqlite(
      `test("fk", () => { db.run("INSERT INTO posts (user_id, title) VALUES (999, 'orphan')"); });`,
    );
    expect(result.tests[0]).toMatchObject({ passed: false, category: "foreign-key" });
  });

  it("blocks unsupported imports but allows the db module", async () => {
    const result = await runSqlite(`import * as fs from "fs";\ntest("t", () => { expect(fs).toBeDefined(); });`);
    expect(result.diagnostics[0]!.category).toBe("unsupported");
  });
});

describe("sqlite engine — isolation & determinism", () => {
  it("gives each run a brand-new database (no shared state)", async () => {
    const test = `test("fresh", () => {
      expect(db.all("SELECT * FROM users")).toHaveLength(0);
      db.run("INSERT INTO users (email, name) VALUES ('once@x.com', 'Once')");
      expect(db.all("SELECT * FROM users")).toHaveLength(1);
    });`;
    const a = await runSqlite(test);
    const b = await runSqlite(test);
    expect(a.tests[0]!.passed).toBe(true);
    expect(b.tests[0]!.passed).toBe(true); // starts empty again → not leaked
  });
});

describe("sqlite engine — Express + SQLite composition", () => {
  it("verifies HTTP responses AND database state together", async () => {
    const app = `import express from "express";
      import { db } from "./db";
      const app = express();
      app.use(express.json());
      app.post("/users", (req, res) => {
        const info = db.run("INSERT INTO users (email, name) VALUES (?, ?)", [req.body.email, req.body.name]);
        res.status(201).json({ id: info.lastInsertRowid });
      });
      app.get("/users", (req, res) => res.json(db.all("SELECT id, email, name FROM users ORDER BY id")));
      export default app;`;
    const result = await runSqliteTests(
      {
        workspaceFiles: [
          { path: "db.ts", content: DB_TS, role: "readonly" },
          { path: "app.ts", content: app, role: "edit" },
        ],
        testFiles: [
          {
            path: "tests/api.test.ts",
            content: `import app from "../workspace/app";
              import { db } from "../workspace/db";
              test("creates a user via HTTP and persists it", async () => {
                const res = await request(app).post("/users").send({ email: "http@x.com", name: "Http" });
                expect(res.status).toBe(201);
                expect(res.body).toEqual({ id: 1 });
                const list = await request(app).get("/users");
                expect(list.body).toEqual([{ id: 1, email: "http@x.com", name: "Http" }]);
                expect(db.get("SELECT COUNT(*) AS n FROM users")).toEqual({ n: 1 });
              });`,
          },
        ],
      },
      { schema: SCHEMA, withExpress: true },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.tests[0]).toMatchObject({ passed: true });
  });
});

describe("sqlite engine — ExecutionPlatform integration", () => {
  it("runs a SQLite context end-to-end through the shared platform", async () => {
    const context: ExecutionContext = {
      scenarioSlug: "s",
      step: { id: "impl", harness: "node-vm" },
      workspaceFiles: [{ path: "db.ts", content: DB_TS, role: "readonly" }],
      testFiles: [
        {
          path: "tests/e.test.ts",
          content: `import { db } from "../workspace/db";
            test("seeded", () => { expect(db.all("SELECT * FROM users").length).toBe(2); });`,
        },
      ],
      profile: { language: { primary: "typescript" }, runtime: "node", framework: null, engine: "node", database: { engine: "sqlite" } },
      database: { schema: SCHEMA, seed: SEED },
      verificationOptions: {},
      environment: "server",
      metadata: {},
    };
    const result = await executionPlatform.verify(context);
    expect(result.engine).toBe("node");
    expect(result.status).toBe("passed");
  });
});
