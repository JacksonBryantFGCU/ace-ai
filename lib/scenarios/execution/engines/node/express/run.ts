import { runNodeTests, type NodeRunInput, type NodeRunResult } from "@/lib/scenarios/execution/engines/node/runtime";
import { createExpressModule } from "@/lib/scenarios/execution/engines/node/express/express-app";
import { createRequest } from "@/lib/scenarios/execution/engines/node/express/request-driver";

/**
 * Run an Express interview — a THIN layer over the Node runtime (Phase 7). It
 * changes nothing about compilation, module linking, the vm sandbox, diagnostics,
 * or limits: it only supplies two per-run extras and delegates.
 *
 *   • `builtins.express` — so candidate code can `import express from "express"`
 *     (the bundled in-memory Express; every other bare import stays blocked).
 *   • `globals.request`  — the in-memory Supertest-style driver tests use.
 *
 * A fresh Express module + request driver are created per run, so state never
 * leaks between verifications.
 */
export function runExpressTests(input: NodeRunInput): Promise<NodeRunResult> {
  return runNodeTests({
    ...input,
    builtins: { ...input.builtins, express: createExpressModule() },
    extraGlobals: { ...input.extraGlobals, request: createRequest() },
  });
}
