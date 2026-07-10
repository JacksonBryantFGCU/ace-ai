import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { splitFrontmatter, splitSections } from "@/lib/scenarios/parse";
import { scenarioSchema } from "@/lib/scenarios/schema";
import {
  crossScenarioDiagnostics,
  validateScenario,
  type ValidateOptions,
} from "@/lib/scenarios/authoring/validate";
import { createExecutionPlatform } from "@/lib/scenarios/execution/platform-factory";
import { realMlStepVerificationDependencies } from "@/server/scenarios/machine-learning-verification-dependencies";
import type { AuthoredBundle, ScenarioReport } from "@/lib/scenarios/authoring/types";

/**
 * Filesystem half of the Scenario Authoring Toolkit: read scenarios off disk into
 * `AuthoredBundle`s and validate them. Deliberately NOT `server-only` — it's author
 * tooling driven by the CLI (`scripts/scenario-toolkit.ts`) and tests, never bundled
 * into a route. All validation LOGIC lives in the pure `lib/scenarios/authoring`.
 */

const CONTENT_ROOT = join(process.cwd(), "content", "interview-scenarios");

interface Location {
  slug: string;
  category: string;
  dir: string;
}

/** Enumerate every `<category>/<slug>/scenario.md` (self-contained; no server-only import). */
function findLocations(): Location[] {
  if (!existsSync(CONTENT_ROOT)) return [];
  const locations: Location[] = [];
  for (const category of readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryDir = join(CONTENT_ROOT, category.name);
    for (const slug of readdirSync(categoryDir, { withFileTypes: true })) {
      if (!slug.isDirectory()) continue;
      const dir = join(categoryDir, slug.name);
      if (existsSync(join(dir, "scenario.md"))) {
        locations.push({ slug: slug.name, category: category.name, dir });
      }
    }
  }
  return locations;
}

/** Recursively list files under `dir` as scenario-relative POSIX paths. */
function walkFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walkFiles(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}

/** Read one scenario folder into an `AuthoredBundle` (never throws). */
export function loadAuthoredBundle(location: Location): AuthoredBundle {
  const raw = readFileSync(join(location.dir, "scenario.md"), "utf8");

  let frontmatter: unknown = null;
  let scenario: AuthoredBundle["scenario"] = null;
  let schemaError: string | null = null;
  let sections: Record<string, string> = {};

  try {
    const { frontmatter: fm, body } = splitFrontmatter(raw);
    frontmatter = fm;
    sections = splitSections(body);
    const parsed = scenarioSchema.safeParse(fm);
    if (parsed.success) scenario = parsed.data;
    else schemaError = formatIssues(parsed.error);
  } catch (e) {
    schemaError = (e as Error).message;
  }

  const files: Record<string, string> = {};
  for (const rel of walkFiles(location.dir)) {
    if (rel === "scenario.md") continue;
    files[rel] = readFileSync(join(location.dir, rel), "utf8");
  }

  return { slug: location.slug, category: location.category, raw, frontmatter, scenario, schemaError, sections, files };
}

export function loadAllAuthoredBundles(): AuthoredBundle[] {
  return findLocations().map(loadAuthoredBundle);
}

/** Latest mtime (ms) across every file in a scenario folder — "last modified". */
function lastModifiedMs(dir: string): number {
  let latest = 0;
  for (const rel of walkFiles(dir)) {
    const mtime = statSync(join(dir, rel)).mtimeMs;
    if (mtime > latest) latest = mtime;
  }
  return latest;
}

/** An authored bundle plus the filesystem facts the Studio surfaces. */
export interface AuthoredBundleWithMeta {
  bundle: AuthoredBundle;
  /** Epoch ms of the most recently edited file in the scenario folder. */
  lastModifiedMs: number;
}

/** Load one scenario's bundle by slug, with metadata. Null when the slug is unknown. */
export function loadAuthoredBundleBySlug(slug: string): AuthoredBundleWithMeta | null {
  const location = findLocations().find((l) => l.slug === slug);
  if (!location) return null;
  return { bundle: loadAuthoredBundle(location), lastModifiedMs: lastModifiedMs(location.dir) };
}

/**
 * Last-modified (epoch ms) for every scenario, keyed by slug. Only `stat`s files
 * (no reads), so the Studio's browser list can show freshness cheaply even as the
 * scenario count grows. Unknown/errored folders are simply absent from the map.
 */
export function scenarioLastModifiedBySlug(): Map<string, number> {
  const map = new Map<string, number>();
  for (const loc of findLocations()) map.set(loc.slug, lastModifiedMs(loc.dir));
  return map;
}

/**
 * Validate one scenario (by slug) or all of them. Cross-scenario checks (duplicate
 * slug/id) always run against the FULL set even when a single slug is requested, so
 * a duplicate is caught regardless. Returns one report per validated scenario.
 */
export async function validateScenarios(
  options: ValidateOptions & { slug?: string } = {},
): Promise<ScenarioReport[]> {
  const all = loadAllAuthoredBundles();
  const cross = crossScenarioDiagnostics(all);

  const targets = options.slug ? all.filter((b) => b.slug === options.slug) : all;
  if (options.slug && targets.length === 0) {
    throw new Error(`scenario not found: "${options.slug}". Known: ${all.map((b) => b.slug).join(", ") || "(none)"}`);
  }

  // Route reference-solution execution through the SAME platform production uses.
  // Composed once and only when actually running solutions.
  const verify: ValidateOptions["verify"] = options.runSolution
    ? (() => {
        const { platform } = createExecutionPlatform();
        return (context) => platform.verify(context);
      })()
    : undefined;

  // Machine-learning solutions are validated by the SAME real dependencies
  // production interview verification uses (pytest, plus — only when a
  // scenario configures `execution.artifacts.metrics.required: true` — the
  // real Output Preview runtime to run `main.py` and read back an artifact).
  // See `lib/scenarios/authoring/machine-learning-solution.ts`.
  const mlDependencies: ValidateOptions["mlDependencies"] = options.runSolution
    ? realMlStepVerificationDependencies
    : undefined;

  const reports: ScenarioReport[] = [];
  for (const bundle of targets) {
    const report = await validateScenario(bundle, { ...options, verify, mlDependencies });
    const extra = cross.get(bundle.slug) ?? [];
    const diagnostics = [...report.diagnostics, ...extra];
    reports.push({ ...report, diagnostics, ok: !diagnostics.some((d) => d.level === "error") });
  }
  return reports;
}
