import { describe, expect, it } from "vitest";
import {
  scaffoldBackendScenario,
  createBackendTemplateBundle,
  BACKEND_TEMPLATE_LAYOUT,
  type BackendScaffoldInput,
} from "@/lib/scenarios/authoring/templates/backend";
import { validateScenario } from "@/lib/scenarios/authoring/validate";
import { validateSolution } from "@/lib/scenarios/authoring/solution";
import { resolveExecutionProfile } from "@/lib/scenarios/execution/profile";
import { createExecutionPlatform } from "@/lib/scenarios/execution/platform-factory";
import { loadAuthoredBundleBySlug } from "@/server/scenarios/authoring";

/**
 * Phase 10 — Backend Authoring Platform tests. Cover the template and the
 * platform integration that binds it: scaffold → validation →
 * ExecutionPlatform → Node/Express/SQLite. React scenarios are asserted unchanged.
 */

const TEMPLATE_INPUT: BackendScaffoldInput = {
  slug: "template-health-check",
  title: "Template Health Check",
  summary: "Platform template: implement GET /health returning { status: ok } on an Express + SQLite backend.",
  visibility: "internal",
};

const EXEC_TIMEOUT = 30000;

// Execute solutions through the SAME shared platform the CLI uses.
const { platform } = createExecutionPlatform();
const verify = (context: Parameters<typeof platform.verify>[0]) => platform.verify(context);

describe("backend template", () => {
  it("scaffolds the documented canonical file set", () => {
    const files = scaffoldBackendScenario(TEMPLATE_INPUT);
    expect(Object.keys(files).sort()).toEqual(
      [
        "scenario.md",
        "workspace/app.ts",
        "workspace/db.ts",
        "workspace/backend-types.d.ts",
        "database/schema.sql",
        "database/seed.sql",
        "tests/step-1.test.ts",
        "solution/step-1/app.ts",
      ].sort(),
    );
    // The layout constant documents at least the required files it emits.
    const layoutPaths = new Set(BACKEND_TEMPLATE_LAYOUT.map((l) => l.path));
    expect(layoutPaths.has("workspace/app.ts")).toBe(true);
    expect(layoutPaths.has("database/schema.sql")).toBe(true);
  });

  it("resolves to the Node → Express → SQLite profile", () => {
    const bundle = createBackendTemplateBundle(TEMPLATE_INPUT);
    expect(bundle.scenario).not.toBeNull();
    const profile = resolveExecutionProfile(bundle.scenario!);
    expect(profile.engine).toBe("node");
    expect(profile.runtime).toBe("node");
    expect(profile.framework).toBe("express");
    expect(profile.database).toEqual({ engine: "sqlite" });
  });

  it("passes static + real-database validation with no errors", async () => {
    const bundle = createBackendTemplateBundle(TEMPLATE_INPUT);
    const report = await validateScenario(bundle); // static + validateDatabase (no solution run)
    const errors = report.diagnostics.filter((d) => d.level === "error");
    expect(errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("executes its reference solution green through the platform", async () => {
    const bundle = createBackendTemplateBundle(TEMPLATE_INPUT);
    const diagnostics = await validateSolution(bundle, verify);
    expect(diagnostics.filter((d) => d.level === "error")).toEqual([]);
    // The step really ran (not skipped as unsupported / no-tests-ran).
    expect(diagnostics.map((d) => d.code)).not.toContain("solution/harness-not-runnable");
    expect(diagnostics.map((d) => d.code)).not.toContain("solution/no-tests-ran");
  }, EXEC_TIMEOUT);
});

describe("ExecutionPlatform dispatch is profile-driven (no per-scenario branching)", () => {
  it("advertises the Node engine's database capability and the React engine's browser capability", () => {
    expect(platform.capabilitiesFor("node")?.supportsDatabase).toBe(true);
    expect(platform.capabilitiesFor("react")?.supportsBrowser).toBe(true);
  });

  it("routes a React scenario to the react engine and backend scenarios to the node engine", () => {
    const react = loadAuthoredBundleBySlug("todo-list");
    expect(react).not.toBeNull();
    expect(resolveExecutionProfile(react!.bundle.scenario!).engine).toBe("react");

    const backend = loadAuthoredBundleBySlug("notes-rest-api");
    expect(backend).not.toBeNull();
    expect(resolveExecutionProfile(backend!.bundle.scenario!).engine).toBe("node");
  });
});

describe("frontend scenarios remain unaffected", () => {
  it("a React scenario still validates statically with no errors under the new pipeline", async () => {
    const react = loadAuthoredBundleBySlug("todo-list");
    const report = await validateScenario(react!.bundle); // static only
    expect(report.diagnostics.filter((d) => d.level === "error")).toEqual([]);
  });
});
