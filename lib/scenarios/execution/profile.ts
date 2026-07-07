import { ENGINE_IDS, RUNTIMES, type Scenario } from "@/lib/scenarios/schema";

export { ENGINE_IDS };

/**
 * Execution metadata — the language-agnostic profile that selects an engine.
 *
 * Four INDEPENDENT concepts (never merged, see docs/README.md):
 *   • language   — TypeScript, JavaScript, Python, Java, C#, SQL, …
 *   • runtime    — Browser, Node, Python, JVM, .NET, …
 *   • framework  — React, Express, Flask, Spring, ASP.NET, FastAPI, … (or none)
 *   • engine     — which VerificationEngine executes it (react, node, python, …)
 *
 * A scenario declares this via the generalized frontmatter blocks
 * (`language` / `runtime` / `framework` / `verification.engine`). For backward
 * compatibility, when those are absent the profile is DERIVED from the legacy
 * `stack.harness`, so every existing React scenario resolves to the react engine
 * with zero content changes. No React assumptions live outside this file.
 */

/** The concrete verification engines the platform can host. Only `react` is
 *  implemented today; the rest are registered placeholders (docs §Engines).
 *  Canonical list lives in the schema so frontmatter validation and the engine
 *  registry share one source of truth. */
export type EngineId = (typeof ENGINE_IDS)[number];

/** Where candidate code runs. Independent of language and framework. */
export type RuntimeId = (typeof RUNTIMES)[number];

export interface ExecutionProfile {
  language: { primary: string; secondary?: string[] };
  runtime: RuntimeId;
  /** null = no application framework (e.g. a plain-Node or SQL exercise). */
  framework: string | null;
  /** null = discussion-only step (legacy `harness: none`) — nothing to execute. */
  engine: EngineId | null;
  /** A provisioned database for the run (Phase 9), or null when the scenario
   *  needs none. Independent of engine/framework. */
  database: { engine: string } | null;
}

type Harness = Scenario["stack"]["harness"];

/**
 * Legacy `stack.harness` → generalized profile. THE single mapping that bridges
 * the old React-centric metadata to the new engine model — no switch statements
 * anywhere else.
 */
const HARNESS_PROFILE: Record<Harness, { engine: EngineId | null; runtime: RuntimeId; framework: string | null }> = {
  component: { engine: "react", runtime: "browser", framework: "react" },
  "node-vm": { engine: "node", runtime: "node", framework: null },
  python: { engine: "python", runtime: "python", framework: null },
  sqlite: { engine: "sql", runtime: "node", framework: null },
  none: { engine: null, runtime: "browser", framework: null },
};

const DEFAULT_LANGUAGE: Record<EngineId, string> = {
  react: "typescript",
  node: "typescript",
  python: "python",
  java: "java",
  csharp: "csharp",
  sql: "sql",
};

/** Build a profile straight from a harness id (used where only a step is in hand,
 *  e.g. the server verification entrypoint). An unrecognized harness resolves to
 *  no engine, so the platform returns a structured "unsupported" result. */
export function profileFromHarness(harness: string, languages?: readonly string[]): ExecutionProfile {
  const base = HARNESS_PROFILE[harness as Harness] ?? { engine: null, runtime: "browser" as RuntimeId, framework: null };
  const primary = languages?.[0] ?? (base.engine ? DEFAULT_LANGUAGE[base.engine] : "typescript");
  const secondary = languages && languages.length > 1 ? [...languages.slice(1)] : undefined;
  return { language: { primary, secondary }, runtime: base.runtime, framework: base.framework, engine: base.engine, database: null };
}

/**
 * Resolve a scenario's execution profile. Prefers the explicit generalized
 * metadata; falls back to deriving each field from the legacy `stack` so
 * existing scenarios keep working unchanged.
 */
export function resolveExecutionProfile(scenario: Scenario): ExecutionProfile {
  const derived = profileFromHarness(scenario.stack.harness, scenario.stack.languages);
  return {
    language: scenario.language ?? derived.language,
    runtime: scenario.runtime ?? derived.runtime,
    framework: scenario.framework ?? derived.framework,
    engine: scenario.verification?.engine ?? derived.engine,
    database: scenario.database ?? derived.database,
  };
}

/**
 * What each engine can legally be paired with. The authoring toolkit uses this
 * to reject impossible combinations (React + Python runtime, Express + Browser,
 * Spring + TypeScript, SQL + React, …) with clear diagnostics. Extending an
 * engine's reach is a one-line edit here.
 */
export const ENGINE_COMPATIBILITY: Record<
  EngineId,
  { runtimes: readonly RuntimeId[]; frameworks: readonly string[]; languages: readonly string[] }
> = {
  react: { runtimes: ["browser"], frameworks: ["react"], languages: ["typescript", "javascript"] },
  node: {
    runtimes: ["node"],
    frameworks: ["express", "fastify", "nest", "koa", "none"],
    languages: ["typescript", "javascript"],
  },
  python: {
    runtimes: ["python"],
    frameworks: ["flask", "fastapi", "django", "none"],
    languages: ["python"],
  },
  java: { runtimes: ["jvm"], frameworks: ["spring", "none"], languages: ["java"] },
  csharp: { runtimes: ["dotnet"], frameworks: ["aspnet", "none"], languages: ["csharp"] },
  sql: { runtimes: ["node", "python"], frameworks: ["none"], languages: ["sql"] },
};

/** Validate that a profile's runtime/framework/language are legal for its engine.
 *  Returns a list of human-readable problems ([] = valid). Discussion-only
 *  profiles (engine null) have nothing to execute, so they're always valid. */
export function validateProfileCombo(profile: ExecutionProfile): string[] {
  if (!profile.engine) return [];
  const compat = ENGINE_COMPATIBILITY[profile.engine];
  const problems: string[] = [];
  if (!compat.runtimes.includes(profile.runtime)) {
    problems.push(
      `engine "${profile.engine}" runs on runtime(s) [${compat.runtimes.join(", ")}], not "${profile.runtime}".`,
    );
  }
  const framework = profile.framework ?? "none";
  if (!compat.frameworks.includes(framework)) {
    problems.push(
      `engine "${profile.engine}" supports framework(s) [${compat.frameworks.join(", ")}], not "${framework}".`,
    );
  }
  if (!compat.languages.includes(profile.language.primary)) {
    problems.push(
      `engine "${profile.engine}" executes language(s) [${compat.languages.join(", ")}], not "${profile.language.primary}".`,
    );
  }
  return problems;
}
