import ts from "typescript";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseScenario } from "@/lib/scenarios/parse";
import type { Scenario } from "@/lib/scenarios/schema";
import { DEFAULT_PREVIEW_STORY } from "@/lib/scenarios/preview/types";
import type { PreviewConfig, PreviewStory, ServedPreviewBundle } from "@/lib/scenarios/preview/types";
import { API_PREVIEW_METHODS, type ApiPreviewConfig, type ApiPreviewExample } from "@/lib/scenarios/preview/api";
import { isPublicScenario } from "@/lib/scenarios/visibility";
import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import type { LoadedScenario, ScenarioOption, ScenarioSummary, ServedWorkspaceFile } from "@/lib/scenarios/types";
import { logPerf, timePerf } from "@/server/scenarios/perf";

export type { LoadedScenario, ScenarioOption, ScenarioSummary, ServedWorkspaceFile } from "@/lib/scenarios/types";

/**
 * Server-only scenario loader: discovers scenarios on disk and assembles the
 * candidate-facing model.
 *
 * The AUTHORED vs RUNTIME rule (frozen §4) is enforced here at the serving
 * boundary: only `workspace/` file contents and the candidate-facing body
 * sections are returned. `tests/` and `solution/` are never read into the served
 * model, and the authored body sections ("Reference Solutions", "Evaluation
 * Notes") are stripped.
 *
 * Layout (frozen §1): content/interview-scenarios/<category>/<slug>/scenario.md
 * The leaf folder name is the slug (== frontmatter `id`).
 */

const CONTENT_ROOT = join(process.cwd(), "content", "interview-scenarios");

/** Body `## Heading`s that are authored-only and must never reach the candidate. */
const AUTHORED_SECTIONS = new Set(["Reference Solutions", "Evaluation Notes"]);

export interface LoadOptions {
  /**
   * Whether to include author-only grading data (scenario + step `rubric`s) in
   * the returned model. The dev playground defaults to `true` (it has no
   * candidate/proctor split). Production candidate delivery passes `false` so
   * grading criteria never reach the browser — the single seam that flips the
   * serving boundary, without changing the shape callers already handle.
   */
  includeAuthorOnly?: boolean;
}

/** Recursively freeze an object graph so authored content is immutable at runtime. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

/** Drop author-only fields (rubrics) from the scenario for production delivery. */
function stripAuthorOnly(scenario: Scenario): Scenario {
  return {
    ...scenario,
    rubric: [],
    steps: scenario.steps.map((step) => {
      const stripped = { ...step };
      delete (stripped as { rubric?: unknown }).rubric;
      return stripped;
    }),
  } as Scenario;
}

interface ScenarioLocation {
  slug: string;
  category: string;
  dir: string;
}

interface ScenarioFrontmatterEntry {
  loc: ScenarioLocation;
  scenario: Scenario;
}

const SCENARIO_CACHE_TTL_MS = process.env.NODE_ENV === "development" ? 2_000 : 30_000;
let locationsCache: { expiresAt: number; value: ScenarioLocation[] } | null = null;
let frontmatterCache: { expiresAt: number; value: ScenarioFrontmatterEntry[] } | null = null;
const loadedScenarioCache = new Map<string, { expiresAt: number; value: LoadedScenario }>();

function cacheActive<T>(cache: { expiresAt: number; value: T } | null): cache is { expiresAt: number; value: T } {
  return Boolean(cache && cache.expiresAt > Date.now());
}

function cacheExpiresAt(): number {
  return Date.now() + SCENARIO_CACHE_TTL_MS;
}

/** Absolute directory of a scenario by slug, or null if unknown. */
export function findScenarioDir(slug: string): string | null {
  return findScenarioLocations().find((l) => l.slug === slug)?.dir ?? null;
}

/** Enumerate every `<category>/<slug>/scenario.md` on disk. */
export function findScenarioLocations(): ScenarioLocation[] {
  if (cacheActive(locationsCache)) return locationsCache.value;
  if (!existsSync(CONTENT_ROOT)) return [];
  const startedAt = Date.now();
  const next: ScenarioLocation[] = [];
  for (const category of readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryDir = join(CONTENT_ROOT, category.name);
    for (const slug of readdirSync(categoryDir, { withFileTypes: true })) {
      if (!slug.isDirectory()) continue;
      const dir = join(categoryDir, slug.name);
      if (existsSync(join(dir, "scenario.md"))) {
        next.push({ slug: slug.name, category: category.name, dir });
      }
    }
  }
  logPerf("scenario.findLocations", Date.now() - startedAt, { count: next.length });
  locationsCache = { expiresAt: cacheExpiresAt(), value: next };
  return next;
}

function readScenarioFrontmatterEntries(): ScenarioFrontmatterEntry[] {
  if (cacheActive(frontmatterCache)) return frontmatterCache.value;

  const entries = findScenarioLocations().flatMap((loc) => {
    try {
      const raw = readFileSync(join(loc.dir, "scenario.md"), "utf8");
      const { scenario } = parseScenario(raw);
      return [{ loc, scenario }];
    } catch (e) {
      console.warn(`Skipping invalid scenario '${loc.slug}': ${(e as Error).message}`);
      return [];
    }
  });

  frontmatterCache = { expiresAt: cacheExpiresAt(), value: entries };
  return entries;
}

export function listScenarioFrontmatterEntries(): ScenarioFrontmatterEntry[] {
  return readScenarioFrontmatterEntries();
}

/**
 * Discover all scenarios as summaries for the picker. Invalid scenarios are
 * skipped with a warning rather than breaking discovery for the valid ones.
 */
export async function listScenarios(): Promise<ScenarioSummary[]> {
  return timePerf("scenario.listScenarios", async () => {
    const summaries: ScenarioSummary[] = [];
    for (const { loc, scenario } of readScenarioFrontmatterEntries()) {
      if (!isPublicScenario(scenario)) continue;
      summaries.push({
        slug: loc.slug,
        category: loc.category,
        type: scenarioTypeOf(scenario),
        title: scenario.title,
        summary: scenario.summary,
        difficulty: scenario.difficulty,
        status: scenario.status,
      });
    }
    return summaries.sort((a, b) => a.title.localeCompare(b.title));
  });
}

/**
 * Discover all scenarios as **picker options** — richer than `ScenarioSummary`
 * (difficulty, skills, roles, estimate) so the setup scenario picker can present
 * and filter them. Frontmatter only (no workspace/tests/solutions). Invalid
 * scenarios are skipped with a warning. Sorted by difficulty then title.
 */
export async function listScenarioOptions(): Promise<ScenarioOption[]> {
  const order: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  return timePerf("scenario.listOptions", async () => {
    const options: ScenarioOption[] = [];
    for (const { loc, scenario } of readScenarioFrontmatterEntries()) {
      if (!isPublicScenario(scenario)) continue;
      options.push({
        slug: loc.slug,
        category: loc.category,
        type: scenarioTypeOf(scenario),
        title: scenario.title,
        summary: scenario.summary,
        difficulty: scenario.difficulty,
        skills: [...scenario.skills],
        tags: [...(scenario.tags ?? [])],
        jobRoles: [...scenario.jobRoles],
        runtime: scenario.runtime,
        framework: scenario.framework,
        estimatedMinutes: scenario.estimatedMinutes,
        status: scenario.status,
      });
    }
    return options.sort(
      (a, b) => (order[a.difficulty] ?? 9) - (order[b.difficulty] ?? 9) || a.title.localeCompare(b.title),
    );
  });
}

/**
 * Evaluate a small authored, trusted TS module (`stories.ts` /
 * `preview.config.ts`) and return its exports. These are plain data
 * descriptors by design (docs §6/§17) — never candidate code, never executed
 * in the sandbox — so running them here, server-side, at load time is exactly
 * as safe as executing `tests/`/`solution/` already is. Authors write
 * self-contained arrays/objects (optionally typed against the exported
 * interfaces, erased at transpile time); any import attempt is rejected with
 * a clear error rather than silently resolving to something unexpected.
 */
function evaluateAuthoredModule(path: string, source: string): Record<string, unknown> {
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
  });
  const mod = { exports: {} as Record<string, unknown> };
  const requireStub = (spec: string) => {
    throw new Error(`${path}: may not import "${spec}" — it must be plain, self-contained data.`);
  };
  const factory = new Function("require", "module", "exports", outputText);
  factory(requireStub, mod, mod.exports);
  return mod.exports;
}

/** Parse `preview/stories.ts` into a validated, non-empty `PreviewStory[]`. */
function parseStories(path: string, source: string): PreviewStory[] {
  const exports = evaluateAuthoredModule(path, source);
  const raw = exports.stories ?? exports.default;
  if (!Array.isArray(raw)) {
    throw new Error(`${path} must export an array of stories (named "stories" or default).`);
  }
  const seen = new Set<string>();
  const stories = raw.map((story: unknown, i) => {
    if (
      !story ||
      typeof story !== "object" ||
      typeof (story as { id?: unknown }).id !== "string" ||
      typeof (story as { label?: unknown }).label !== "string"
    ) {
      throw new Error(`${path}: story at index ${i} must have a string "id" and "label".`);
    }
    const s = story as PreviewStory;
    if (seen.has(s.id)) throw new Error(`${path}: duplicate story id "${s.id}".`);
    seen.add(s.id);
    return s;
  });
  return stories.length > 0 ? stories : [DEFAULT_PREVIEW_STORY];
}

/** Parse `preview/preview.config.ts` into a validated `PreviewConfig`. */
function parseConfig(path: string, source: string, stories: PreviewStory[]): PreviewConfig {
  const exports = evaluateAuthoredModule(path, source);
  const raw = (exports.config ?? exports.default) as Partial<PreviewConfig> | undefined;
  const kind = raw?.kind ?? "component";
  if (kind !== "component") {
    throw new Error(`${path}: unknown preview kind "${kind}" — no renderer is registered for it.`);
  }
  if (raw?.defaultStoryId && !stories.some((s) => s.id === raw.defaultStoryId)) {
    throw new Error(`${path}: defaultStoryId "${raw.defaultStoryId}" does not match any story id.`);
  }
  return { kind, title: raw?.title, defaultStoryId: raw?.defaultStoryId };
}

function parseApiConfig(path: string, source: string): ApiPreviewConfig {
  const exports = evaluateAuthoredModule(path, source);
  const rawExamples = exports.apiExamples ?? exports.examples;
  if (!Array.isArray(rawExamples) || rawExamples.length === 0) {
    throw new Error(`${path} must export a non-empty apiExamples array.`);
  }

  const examples: ApiPreviewExample[] = rawExamples.map((raw: unknown, i) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`${path}: example at index ${i} must be an object.`);
    }
    const example = raw as Partial<ApiPreviewExample>;
    if (typeof example.id !== "string" || example.id.length === 0) {
      throw new Error(`${path}: example at index ${i} must have a string id.`);
    }
    if (typeof example.label !== "string" || example.label.length === 0) {
      throw new Error(`${path}: example "${example.id}" must have a string label.`);
    }
    if (typeof example.method !== "string" || !API_PREVIEW_METHODS.includes(example.method as never)) {
      throw new Error(`${path}: example "${example.id}" has an unsupported method.`);
    }
    if (typeof example.path !== "string" || !example.path.startsWith("/")) {
      throw new Error(`${path}: example "${example.id}" path must start with "/".`);
    }
    return {
      id: example.id,
      label: example.label,
      method: example.method as ApiPreviewExample["method"],
      path: example.path,
      body: example.body,
    };
  });

  const rawConfig = (exports.config ?? exports.default) as Partial<ApiPreviewConfig> | undefined;
  const defaultExampleId = rawConfig?.defaultExampleId ?? examples[0]!.id;
  if (!examples.some((example) => example.id === defaultExampleId)) {
    throw new Error(`${path}: defaultExampleId "${defaultExampleId}" does not match any apiExamples id.`);
  }

  return {
    title: rawConfig?.title,
    defaultExampleId,
    examples,
  };
}

/**
 * Load a scenario's optional `preview/` folder, exactly like `workspace/` /
 * `tests/` / `solution/`: authored, discovered by convention, optional. If the
 * folder doesn't exist, returns `undefined` — nothing else about the scenario
 * changes (Preview Runtime architecture doc, P1).
 *
 * `Preview.tsx`/`providers.tsx` are read as raw source text only — there is
 * no server-side execution of authored preview *component* code (that's the
 * sandboxed client renderer's job, docs §5/§12). `preview.config.ts` and
 * `stories.ts` are different: they are plain data (§6), so they ARE parsed
 * here via `evaluateAuthoredModule`, exactly like any other trusted authored
 * artifact this loader already reads.
 */
export function loadPreviewBundle(dir: string): ServedPreviewBundle | undefined {
  const previewDir = join(dir, "preview");
  if (!existsSync(previewDir)) return undefined;

  const apiConfigPath = join(previewDir, "api.config.ts");
  if (existsSync(apiConfigPath)) {
    const api = parseApiConfig(apiConfigPath, readFileSync(apiConfigPath, "utf8"));
    return {
      config: {
        kind: "api",
        title: api.title ?? "API Explorer",
        defaultStoryId: api.defaultExampleId,
      },
      stories: [],
      source: { api },
    };
  }

  const previewPath = join(previewDir, "Preview.tsx");
  if (!existsSync(previewPath)) {
    throw new Error(`preview/ folder exists but preview/Preview.tsx is missing (${dir})`);
  }

  const providersPath = join(previewDir, "providers.tsx");
  const providers = existsSync(providersPath) ? readFileSync(providersPath, "utf8") : undefined;

  // Optional advanced per-scenario stylesheet (§ Phase 5.2). Read as raw text
  // like Preview.tsx/providers.tsx — never executed, just injected into the
  // sandbox document on top of the shared `.preview-canvas` base.
  const cssPath = join(previewDir, "preview.css");
  const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : undefined;

  const storiesPath = join(previewDir, "stories.ts");
  const stories = existsSync(storiesPath)
    ? parseStories(storiesPath, readFileSync(storiesPath, "utf8"))
    : [DEFAULT_PREVIEW_STORY];

  const configPath = join(previewDir, "preview.config.ts");
  const config = existsSync(configPath)
    ? parseConfig(configPath, readFileSync(configPath, "utf8"), stories)
    : ({ kind: "component" } as const);

  return {
    config,
    stories,
    source: {
      preview: readFileSync(previewPath, "utf8"),
      providers,
      css,
    },
  };
}

/**
 * Load one scenario by slug into the candidate-facing model. Throws a readable
 * error if the slug is unknown, the frontmatter is invalid, or a declared
 * workspace file is missing on disk.
 */
export async function loadScenario(slug: string, options: LoadOptions = {}): Promise<LoadedScenario> {
  const { includeAuthorOnly = true } = options;
  const loc = findScenarioLocations().find((l) => l.slug === slug);
  if (!loc) {
    throw new Error(`scenario not found: '${slug}'`);
  }

  return timePerf("scenario.load", async () => {
    const cacheKey = `${slug}:${includeAuthorOnly ? "author" : "candidate"}`;
    const cached = loadedScenarioCache.get(cacheKey);
    if (cached && cacheActive(cached)) {
      return cached.value;
    }

    const raw = readFileSync(join(loc.dir, "scenario.md"), "utf8");
    const { scenario: parsed, sections } = parseScenario(raw);
    const scenario = includeAuthorOnly ? parsed : stripAuthorOnly(parsed);

    if (scenario.id !== loc.slug) {
      throw new Error(`scenario id '${scenario.id}' does not match its folder '${loc.slug}'`);
    }

    const files: ServedWorkspaceFile[] = scenario.workspace.files.map((file) => {
      const abs = join(loc.dir, "workspace", file.path);
      if (!existsSync(abs)) {
        throw new Error(`workspace file declared but missing on disk: workspace/${file.path}`);
      }
      return { path: file.path, role: file.role, content: readFileSync(abs, "utf8") };
    });

    const servedSections: Record<string, string> = {};
    for (const [heading, text] of Object.entries(sections)) {
      if (!AUTHORED_SECTIONS.has(heading)) servedSections[heading] = text;
    }

    const loaded = deepFreeze({
      slug: loc.slug,
      category: loc.category,
      scenario,
      sections: servedSections,
      files,
      entry: scenario.workspace.entry,
      preview: loadPreviewBundle(loc.dir),
    });
    loadedScenarioCache.set(cacheKey, { expiresAt: cacheExpiresAt(), value: loaded });
    return loaded;
  }, { slug, includeAuthorOnly });
}
