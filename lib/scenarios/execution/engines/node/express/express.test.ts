import { describe, expect, it } from "vitest";
import { runExpressTests } from "@/lib/scenarios/execution/engines/node/express/run";
import { executionPlatform } from "@/server/scenarios/execution-platform";
import type { NodeRunInput } from "@/lib/scenarios/execution/engines/node/runtime";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";

/** Run an Express app + a single test file that imports it as `app`. */
function runExpress(app: string, test: string, extra: NodeRunInput["workspaceFiles"] = []) {
  return runExpressTests({
    workspaceFiles: [{ path: "app.ts", content: app, role: "edit" }, ...extra],
    testFiles: [{ path: "tests/e.test.ts", content: `import app from "../workspace/app";\n${test}` }],
  });
}

const BASE_APP = `
import express from "express";
const app = express();
app.use(express.json());
`;

async function firstOutcome(promise: ReturnType<typeof runExpress>) {
  const result = await promise;
  return { result, test: result.tests[0] };
}

describe("express engine — methods & responses", () => {
  it("handles a simple GET returning JSON", async () => {
    const { result, test } = await firstOutcome(
      runExpress(
        `${BASE_APP} app.get("/ping", (req, res) => res.json({ ok: true })); export default app;`,
        `test("GET", async () => { const r = await request(app).get("/ping"); expect(r.status).toBe(200); expect(r.body).toEqual({ ok: true }); });`,
      ),
    );
    expect(result.diagnostics).toEqual([]);
    expect(test).toMatchObject({ passed: true });
  });

  it("parses a POST JSON body via express.json() and returns 201", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP} app.post("/echo", (req, res) => res.status(201).json(req.body)); export default app;`,
        `test("POST", async () => { const r = await request(app).post("/echo").send({ a: 1, b: "x" }); expect(r.status).toBe(201); expect(r.body).toEqual({ a: 1, b: "x" }); });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });

  it("supports PUT with a route param", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP} app.put("/items/:id", (req, res) => res.json({ id: req.params.id, body: req.body })); export default app;`,
        `test("PUT", async () => { const r = await request(app).put("/items/42").send({ name: "n" }); expect(r.body).toEqual({ id: "42", body: { name: "n" } }); });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });

  it("supports PATCH and DELETE (204, no body)", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP}
         app.patch("/items/:id", (req, res) => res.json({ patched: req.params.id }));
         app.delete("/items/:id", (req, res) => res.status(204).end());
         export default app;`,
        `test("PATCH+DELETE", async () => {
           const p = await request(app).patch("/items/7");
           expect(p.body).toEqual({ patched: "7" });
           const d = await request(app).delete("/items/7");
           expect(d.status).toBe(204);
         });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });

  it("reads query parameters", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP} app.get("/search", (req, res) => res.json({ q: req.query.q })); export default app;`,
        `test("query", async () => { const r = await request(app).get("/search").query({ q: "hello" }); expect(r.body).toEqual({ q: "hello" }); });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });
});

describe("express engine — middleware, routers, errors", () => {
  it("runs app-level middleware and next()", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP}
         app.use((req, res, next) => { res.set("X-MW", "1"); next(); });
         app.get("/", (req, res) => res.json({ ok: true }));
         export default app;`,
        `test("mw", async () => { const r = await request(app).get("/"); expect(r.headers["x-mw"]).toBe("1"); expect(r.body).toEqual({ ok: true }); });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });

  it("mounts a nested Router", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `import express from "express";
         const app = express();
         const api = express.Router();
         api.get("/health", (req, res) => res.json({ status: "ok" }));
         app.use("/api", api);
         export default app;`,
        `test("router", async () => { const r = await request(app).get("/api/health"); expect(r.status).toBe(200); expect(r.body).toEqual({ status: "ok" }); });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });

  it("returns 404 for an unmatched route", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP} app.get("/", (req, res) => res.send("hi")); export default app;`,
        `test("404", async () => { const r = await request(app).get("/missing"); expect(r.status).toBe(404); });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });

  it("routes a thrown error to error middleware (500)", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP}
         app.get("/boom", () => { throw new Error("kaboom"); });
         app.use((err, req, res, next) => { res.status(500).json({ error: err.message }); });
         export default app;`,
        `test("500", async () => { const r = await request(app).get("/boom"); expect(r.status).toBe(500); expect(r.body).toEqual({ error: "kaboom" }); });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });

  it("falls back to a default 500 when an error is unhandled", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP} app.get("/boom", async () => { throw new Error("nope"); }); export default app;`,
        `test("default500", async () => { const r = await request(app).get("/boom"); expect(r.status).toBe(500); });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });
});

describe("express engine — headers & cookies", () => {
  it("sets response headers and cookies, and reads request cookies", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP}
         app.get("/set", (req, res) => { res.set("X-Custom", "yes"); res.cookie("sid", "abc"); res.json({ got: req.cookies.sid }); });
         export default app;`,
        `test("hc", async () => {
           const r = await request(app).get("/set").set("Cookie", "sid=abc");
           expect(r.headers["x-custom"]).toBe("yes");
           expect(r.headers["set-cookie"]).toContain("sid=abc");
           expect(r.body).toEqual({ got: "abc" });
         });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });

  it("leaves req.body undefined-ish when express.json() is not used", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `import express from "express";
         const app = express();
         app.post("/raw", (req, res) => res.json({ hasBody: req.body !== undefined && Object.keys(req.body || {}).length > 0 }));
         export default app;`,
        `test("noparse", async () => { const r = await request(app).post("/raw").send({ a: 1 }); expect(r.body).toEqual({ hasBody: false }); });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });
});

describe("express engine — state, isolation, timeouts", () => {
  it("shares app state across multiple requests within one run", async () => {
    const { test } = await firstOutcome(
      runExpress(
        `${BASE_APP}
         const items: any[] = [];
         app.post("/items", (req, res) => { items.push(req.body); res.status(201).json(req.body); });
         app.get("/items", (req, res) => res.json(items));
         export default app;`,
        `test("crud", async () => {
           await request(app).post("/items").send({ id: 1 });
           await request(app).post("/items").send({ id: 2 });
           const r = await request(app).get("/items");
           expect(r.body).toEqual([{ id: 1 }, { id: 2 }]);
         });`,
      ),
    );
    expect(test).toMatchObject({ passed: true });
  });

  it("does not leak app state between separate runs", async () => {
    const app = `${BASE_APP}
      const items: any[] = [];
      app.post("/items", (req, res) => { items.push(req.body); res.json(items); });
      export default app;`;
    const test = `test("fresh", async () => { const r = await request(app).post("/items").send({ id: 1 }); expect(r.body).toEqual([{ id: 1 }]); });`;
    const a = await runExpress(app, test);
    const b = await runExpress(app, test);
    expect(a.tests[0]!.passed).toBe(true);
    expect(b.tests[0]!.passed).toBe(true); // would be length 2 if state leaked
  });

  it("times out a hanging handler", async () => {
    const result = await runExpressTests({
      workspaceFiles: [{ path: "app.ts", content: `${BASE_APP} app.get("/hang", async () => { await new Promise(() => {}); }); export default app;`, role: "edit" }],
      testFiles: [{ path: "tests/e.test.ts", content: `import app from "../workspace/app";\ntest("hang", async () => { await request(app).get("/hang"); });` }],
      limits: { testTimeoutMs: 40, totalTimeoutMs: 500 },
    });
    expect(result.tests[0]).toMatchObject({ passed: false, category: "timeout" });
  });
});

describe("express engine — unsupported features", () => {
  it("reports app.listen() as unsupported (no crash, no socket)", async () => {
    const result = await runExpress(
      `${BASE_APP} app.get("/", (req, res) => res.send("x")); app.listen(3000); export default app;`,
      `test("t", async () => { const r = await request(app).get("/"); expect(r.status).toBe(200); });`,
    );
    expect(result.diagnostics[0]!.category).toBe("unsupported");
    expect(result.diagnostics[0]!.message).toMatch(/listen/);
  });

  it("blocks non-express Node imports (e.g. fs) even in Express mode", async () => {
    const result = await runExpress(
      `import express from "express"; import * as fs from "fs"; const app = express(); app.get("/", (req, res) => res.send(String(fs))); export default app;`,
      `test("t", async () => { expect(app).toBeDefined(); });`,
    );
    expect(result.diagnostics[0]!.category).toBe("unsupported");
    expect(result.diagnostics[0]!.message).toMatch(/fs/);
  });

  it("gives a clear error when the imported value is not an app", async () => {
    const result = await runExpressTests({
      workspaceFiles: [{ path: "app.ts", content: `export default { not: "an app" };`, role: "edit" }],
      testFiles: [{ path: "tests/e.test.ts", content: `import app from "../workspace/app";\ntest("t", async () => { await request(app).get("/"); });` }],
    });
    expect(result.tests[0]).toMatchObject({ passed: false, category: "runtime" });
    expect(result.tests[0]!.message).toMatch(/Express app/);
  });
});

describe("express engine — ExecutionPlatform integration", () => {
  it("runs an Express context end-to-end through the shared platform", async () => {
    const context: ExecutionContext = {
      scenarioSlug: "s",
      step: { id: "impl", harness: "node-vm" },
      workspaceFiles: [
        { path: "app.ts", content: `${BASE_APP} app.get("/ping", (req, res) => res.json({ ok: true })); export default app;`, role: "edit" },
      ],
      testFiles: [
        { path: "tests/e.test.ts", content: `import app from "../workspace/app";\ntest("GET", async () => { const r = await request(app).get("/ping"); expect(r.status).toBe(200); });` },
      ],
      profile: { language: { primary: "typescript" }, runtime: "node", framework: "express", engine: "node", database: null },
      verificationOptions: {},
      environment: "server",
      metadata: {},
    };
    const result = await executionPlatform.verify(context);
    expect(result.engine).toBe("node");
    expect(result.status).toBe("passed");
  });
});
