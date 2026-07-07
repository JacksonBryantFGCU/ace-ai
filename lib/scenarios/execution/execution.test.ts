import { describe, expect, it } from "vitest";
import type { Scenario } from "@/lib/scenarios/schema";
import {
  ENGINE_COMPATIBILITY,
  profileFromHarness,
  resolveExecutionProfile,
  validateProfileCombo,
  type ExecutionProfile,
} from "@/lib/scenarios/execution/profile";
import { createEngineRegistry, EngineRegistry } from "@/lib/scenarios/execution/registry";
import { ExecutionPlatform } from "@/lib/scenarios/execution/platform";
import { PLACEHOLDER_ENGINES, pythonEngine, sqlEngine } from "@/lib/scenarios/execution/engines/placeholder";
import type { ExecutionEngine } from "@/lib/scenarios/execution/engine";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";

function scenario(overrides: Partial<Scenario>): Scenario {
  return {
    stack: { languages: ["typescript"], harness: "component" },
    ...overrides,
  } as Scenario;
}

function contextFor(profile: ExecutionProfile): ExecutionContext {
  return {
    scenarioSlug: "s",
    step: { id: "step", harness: "node-vm" },
    workspaceFiles: [],
    testFiles: [],
    profile,
    verificationOptions: {},
    environment: "server",
    metadata: {},
  };
}

describe("profileFromHarness", () => {
  it("maps the React harness to the react engine on the browser runtime", () => {
    expect(profileFromHarness("component")).toEqual({
      language: { primary: "typescript", secondary: undefined },
      runtime: "browser",
      framework: "react",
      engine: "react",
      database: null,
    });
  });

  it("maps reserved harnesses to their engines without a framework", () => {
    expect(profileFromHarness("node-vm").engine).toBe("node");
    expect(profileFromHarness("python").engine).toBe("python");
    expect(profileFromHarness("sqlite").engine).toBe("sql");
  });

  it("resolves an unknown harness (and discussion-only) to no engine", () => {
    expect(profileFromHarness("mystery").engine).toBeNull();
    expect(profileFromHarness("none").engine).toBeNull();
  });
});

describe("resolveExecutionProfile", () => {
  it("derives the profile from legacy stack when no explicit metadata is present", () => {
    expect(resolveExecutionProfile(scenario({}))).toMatchObject({ engine: "react", runtime: "browser", framework: "react" });
  });

  it("prefers explicit generalized metadata over the derived defaults", () => {
    const s = scenario({
      stack: { languages: ["typescript"], harness: "node-vm" },
      language: { primary: "typescript" },
      runtime: "node",
      framework: "express",
      verification: { engine: "node" },
    });
    expect(resolveExecutionProfile(s)).toEqual({
      language: { primary: "typescript" },
      runtime: "node",
      framework: "express",
      engine: "node",
      database: null,
    });
  });
});

describe("validateProfileCombo", () => {
  const base = (o: Partial<ExecutionProfile>): ExecutionProfile => ({
    language: { primary: "typescript" },
    runtime: "browser",
    framework: "react",
    engine: "react",
    database: null,
    ...o,
  });

  it("accepts a coherent React profile", () => {
    expect(validateProfileCombo(base({}))).toEqual([]);
  });

  it("rejects React on a non-browser runtime (React + Python runtime)", () => {
    expect(validateProfileCombo(base({ runtime: "python" })).length).toBeGreaterThan(0);
  });

  it("rejects Express on the browser runtime", () => {
    const p = base({ engine: "node", runtime: "browser", framework: "express" });
    expect(validateProfileCombo(p).some((m) => m.includes("runtime"))).toBe(true);
  });

  it("rejects Spring with TypeScript", () => {
    const p = base({ engine: "java", runtime: "jvm", framework: "spring", language: { primary: "typescript" } });
    expect(validateProfileCombo(p).some((m) => m.includes("language"))).toBe(true);
  });

  it("rejects a SQL engine paired with the React framework", () => {
    const p = base({ engine: "sql", runtime: "node", framework: "react", language: { primary: "sql" } });
    expect(validateProfileCombo(p).some((m) => m.includes("framework"))).toBe(true);
  });

  it("treats a discussion-only profile (no engine) as valid", () => {
    expect(validateProfileCombo(base({ engine: null }))).toEqual([]);
  });
});

describe("EngineRegistry", () => {
  it("registers, looks up, and lists engines", () => {
    const registry = createEngineRegistry(PLACEHOLDER_ENGINES);
    expect(registry.get("python")).toBe(pythonEngine);
    expect(registry.has("sql")).toBe(true);
    expect(registry.list()).toHaveLength(PLACEHOLDER_ENGINES.length);
    expect(registry.get(null)).toBeUndefined();
  });

  it("rejects a duplicate registration (single source of truth)", () => {
    const registry = new EngineRegistry().register(pythonEngine);
    expect(() => registry.register(pythonEngine)).toThrow(/already registered/);
  });
});

describe("ExecutionPlatform", () => {
  const platform = new ExecutionPlatform(createEngineRegistry(PLACEHOLDER_ENGINES));

  it("returns a structured, non-throwing 'not implemented' result for a placeholder engine", async () => {
    const result = await platform.verify(contextFor(profileFromHarness("python")));
    expect(result.status).toBe("unsupported");
    expect(result.engine).toBe("python");
    expect(result.message).toMatch(/not implemented/i);
    expect(result.meta?.notImplemented).toBe(true);
  });

  it("returns unsupported when no engine is registered for the profile", async () => {
    const result = await platform.verify(contextFor(profileFromHarness("none")));
    expect(result.status).toBe("unsupported");
  });

  it("normalizes an engine throw into a structured errored result (never throws)", async () => {
    const boom: ExecutionEngine = {
      ...pythonEngine,
      id: "python",
      verify: () => Promise.reject(new Error("kaboom")),
    };
    const platform2 = new ExecutionPlatform(new EngineRegistry().register(boom));
    const result = await platform2.verify(contextFor(profileFromHarness("python")));
    expect(result.status).toBe("errored");
    expect(result.errors[0]?.message).toBe("kaboom");
  });

  it("advertises capabilities per engine", () => {
    expect(platform.capabilitiesFor("sql")?.supportsDatabase).toBe(true);
    expect(platform.capabilitiesFor("python")?.supportsFilesystem).toBe(true);
  });
});

describe("engine compatibility table", () => {
  it("covers every engine id", () => {
    for (const engine of Object.keys(ENGINE_COMPATIBILITY)) {
      expect(ENGINE_COMPATIBILITY[engine as keyof typeof ENGINE_COMPATIBILITY].runtimes.length).toBeGreaterThan(0);
    }
  });

  it("placeholder engines advertise intended capabilities even though execution is not implemented", () => {
    expect(sqlEngine.capabilities().supportsDatabase).toBe(true);
    expect(pythonEngine.supports(profileFromHarness("python"))).toBe(true);
    expect(pythonEngine.supports(profileFromHarness("component"))).toBe(false);
  });
});
