import ts from "typescript";
import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";
import { ENTRY_SPECIFIER, dirname, normalize } from "@/lib/scenarios/preview/renderers/component/vfs";
import { API_PREVIEW_METHODS, type ApiPreviewConfig, type ApiPreviewExample } from "@/lib/scenarios/preview/api";
import type { PreviewConfig, PreviewKind, PreviewStory } from "@/lib/scenarios/preview/types";

/**
 * Preview validation (docs/README.md). A scenario's `preview/`
 * folder is optional (P1) — this validator is a no-op when it doesn't exist.
 * When it does, this checks the AUTHORED BUNDLE only: it never mounts React,
 * never executes the interview runtime, and never renders in a browser. The
 * one exception — evaluating `stories.ts`/`preview.config.ts` — mirrors
 * exactly what `server/scenarios/load.ts`'s `loadPreviewBundle` already does
 * at serve time: they are plain, trusted, self-contained data (§6), not
 * candidate code, so statically evaluating them here is the same operation
 * the loader performs, just run earlier (at authoring time instead of
 * request time).
 */

const AT = "scenario.md → preview";
const SUPPORTED_KINDS: readonly PreviewKind[] = ["component", "api"];
const KNOWN_CONFIG_KEYS = new Set(["kind", "title", "defaultStoryId"]);
const LARGE_PROPS_CHARS = 2000;
const EDGE_CASE_KEYWORDS = ["empty", "loading", "error"];
const INTERACTIVE_TAG = /<(button|input|select|textarea|a\s)/i;
const ARIA_ATTR = /\baria-[a-z]+=/i;

// ── static source checks (Preview.tsx / providers.tsx) — no execution ────────

/** Syntax/compile diagnostics only (mirrors the sandbox's own `transpileModule`
 *  call, `lib/scenarios/preview/renderers/component/mount.tsx`) — never runs
 *  the output. */
function checkCompiles(path: string, source: string, out: Diagnostic[]): boolean {
  const result = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowJs: true,
      isolatedModules: true,
    },
  });
  const errorDiagnostic = result.diagnostics?.find((d) => d.category === ts.DiagnosticCategory.Error);
  if (!errorDiagnostic) return true;

  const message = ts.flattenDiagnosticMessageText(errorDiagnostic.messageText, "\n");
  let location = path;
  if (errorDiagnostic.file && errorDiagnostic.start !== undefined) {
    const pos = errorDiagnostic.file.getLineAndCharacterOfPosition(errorDiagnostic.start);
    location = `${path}:${pos.line + 1}:${pos.character + 1}`;
  }
  out.push(
    diag.error(
      "preview/syntax-error",
      location,
      `${path} has a syntax error: ${message}`,
      "Fix the syntax error — the sandbox will fail to compile this file exactly the same way.",
    ),
  );
  return false;
}

/** Extract every import/require/dynamic-import specifier (relative or bare),
 *  mirroring `lib/scenarios/authoring/workspace.ts`'s approach for workspace
 *  files. */
function extractImportSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g,
    /import\s*["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) specs.push(m[1]!);
  }
  return specs;
}

/** Resolve a relative import against another file under `preview/`, trying
 *  the same extensions the sandbox's module resolver does. */
function resolvePreviewRelative(fromPath: string, spec: string, files: Record<string, string>): boolean {
  const base = normalize(`${dirname(fromPath)}/${spec}`);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`];
  return candidates.some((c) => c in files);
}

/** No unsupported imports: only React, relative imports resolving inside
 *  `preview/`, and (Preview.tsx only) the virtual `scenario:entry` binding —
 *  exactly what the sandbox's module linker allows at render time
 *  (`renderers/component/mount.tsx`), checked here without executing it. */
function checkImports(path: string, source: string, bundle: AuthoredBundle, out: Diagnostic[]): void {
  for (const spec of extractImportSpecifiers(source)) {
    if (spec === ENTRY_SPECIFIER) continue;
    if (spec === "react" || spec.startsWith("react/")) continue;
    if (spec.startsWith(".")) {
      if (!resolvePreviewRelative(path, spec, bundle.files)) {
        out.push(
          diag.error(
            "preview/unresolved-import",
            path,
            `${path} imports "${spec}", which doesn't resolve to another file under preview/.`,
            `Fix the import path, or add the missing file under preview/.`,
          ),
        );
      }
      continue;
    }
    out.push(
      diag.error(
        "preview/unsupported-import",
        path,
        `${path} imports "${spec}" — only React and relative imports are supported in preview code.`,
        `Remove the import, or move the dependency's usage into an authored mock in providers.tsx (docs §7).`,
      ),
    );
  }
}

type DefaultExportShape = "component" | "non-component" | "none";

/** Static (non-executing) heuristic for "does this file's default export look
 *  like a component": a function/class/arrow declared or referenced directly
 *  as the default export. Cannot know for certain without running it — that's
 *  exactly what this validator must not do — so a non-component shape (an
 *  object/literal/number) is flagged, and anything ambiguous is let through. */
function defaultExportShape(source: string): DefaultExportShape {
  const sourceFile = ts.createSourceFile("Preview.tsx", source, ts.ScriptTarget.ES2019, true, ts.ScriptKind.TSX);
  const topLevel = new Map<string, "component" | "other">();

  for (const stmt of sourceFile.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) topLevel.set(stmt.name.text, "component");
    else if (ts.isClassDeclaration(stmt) && stmt.name) topLevel.set(stmt.name.text, "component");
    else if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
        const isFnLike = ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer);
        topLevel.set(decl.name.text, isFnLike ? "component" : "other");
      }
    }
  }

  for (const stmt of sourceFile.statements) {
    if (ts.canHaveModifiers(stmt)) {
      const mods = ts.getModifiers(stmt);
      const hasExport = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      const hasDefault = mods?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
      if (hasExport && hasDefault) {
        if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) return "component";
      }
    }
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      const expr = stmt.expression;
      if (ts.isFunctionExpression(expr) || ts.isArrowFunction(expr) || ts.isClassExpression(expr)) return "component";
      if (ts.isIdentifier(expr)) return topLevel.get(expr.text) === "component" ? "component" : "non-component";
      return "non-component";
    }
  }
  return "none";
}

/** Compile + import + (optionally) default-export-shape checks shared by
 *  Preview.tsx and providers.tsx. */
function checkPreviewSource(
  path: string,
  source: string,
  bundle: AuthoredBundle,
  out: Diagnostic[],
  options: { requireDefaultComponent: boolean },
): void {
  if (!checkCompiles(path, source, out)) return; // unreadable source — nothing else is checkable
  checkImports(path, source, bundle, out);

  if (options.requireDefaultComponent) {
    const shape = defaultExportShape(source);
    if (shape === "none") {
      out.push(
        diag.error(
          "preview/no-default-export",
          path,
          `${path} has no default export.`,
          "Export a component as the default export — it's what the runtime mounts.",
        ),
      );
    } else if (shape === "non-component") {
      out.push(
        diag.error(
          "preview/default-export-not-component",
          path,
          `${path}'s default export doesn't look like a component (a function/class).`,
          "Export a function or class component as the default export, not a plain value.",
        ),
      );
    }
  }
}

// ── stories.ts / preview.config.ts — plain data, safe to evaluate ────────────

/** Mirrors `server/scenarios/load.ts`'s `evaluateAuthoredModule` exactly —
 *  authored, trusted, self-contained data only. Only called after
 *  `checkImports` has already confirmed there's nothing to reject. */
function evaluateAuthoredModule(path: string, source: string): Record<string, unknown> {
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
  });
  const mod = { exports: {} as Record<string, unknown> };
  const requireStub = () => {
    throw new Error("unexpected import"); // checkImports already rejected real imports
  };
  const factory = new Function("require", "module", "exports", outputText);
  factory(requireStub, mod, mod.exports);
  return mod.exports;
}

function findNonSerializablePath(value: unknown, path = ""): string | null {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return null;
  }
  if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint" || value === undefined) {
    return path || "(root)";
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const bad = findNonSerializablePath(value[i], `${path}[${i}]`);
      if (bad) return bad;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const bad = findNonSerializablePath(v, path ? `${path}.${k}` : k);
      if (bad) return bad;
    }
    return null;
  }
  return null;
}

function isValidViewport(v: unknown): boolean {
  if (v === "mobile" || v === "desktop") return true;
  if (v && typeof v === "object") {
    const { width, height } = v as { width?: unknown; height?: unknown };
    return typeof width === "number" && width > 0 && typeof height === "number" && height > 0;
  }
  return false;
}

/** Parses + validates `stories.ts`. Returns the parsed stories (even with
 *  errors reported) so cross-validation and best-practice checks downstream
 *  can still run against whatever was recoverable, or `null` if the file
 *  couldn't be evaluated at all. */
function checkStories(path: string, source: string, bundle: AuthoredBundle, out: Diagnostic[]): PreviewStory[] | null {
  if (!checkCompiles(path, source, out)) return null;
  const before = out.length;
  checkImports(path, source, bundle, out);
  if (out.length > before) return null; // an unresolved/unsupported import already reported

  let exports: Record<string, unknown>;
  try {
    exports = evaluateAuthoredModule(path, source);
  } catch (e) {
    out.push(
      diag.error(
        "preview/stories-invalid",
        path,
        `${path} could not be evaluated: ${(e as Error).message}`,
        "stories.ts must be plain, self-contained data — a `stories` (or default) array of story objects.",
      ),
    );
    return null;
  }

  const raw = exports.stories ?? exports.default;
  if (!Array.isArray(raw)) {
    out.push(
      diag.error(
        "preview/stories-not-array",
        path,
        `${path} must export an array of stories (named "stories" or default).`,
        `Export \`export const stories: PreviewStory[] = [...]\` (or a default array).`,
      ),
    );
    return null;
  }

  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  const stories: PreviewStory[] = [];
  raw.forEach((story: unknown, i) => {
    const at = `${path}[${i}]`;
    if (!story || typeof story !== "object") {
      out.push(diag.error("preview/story-invalid", at, `story at index ${i} is not an object.`, "Each story must be `{ id, label, ... }`."));
      return;
    }
    const s = story as Partial<PreviewStory>;
    if (typeof s.id !== "string" || s.id.length === 0) {
      out.push(diag.error("preview/story-missing-id", at, `story at index ${i} has no string "id".`, `Give it a stable, kebab-case id.`));
      return;
    }
    if (typeof s.label !== "string" || s.label.length === 0) {
      out.push(diag.error("preview/story-missing-label", at, `story "${s.id}" has no "label".`, `Give it a short, human-readable label for the story picker.`));
      return;
    }
    if (seenIds.has(s.id)) {
      out.push(diag.error("preview/duplicate-story-id", at, `duplicate story id "${s.id}".`, "Every story id must be unique."));
    }
    seenIds.add(s.id);
    if (s.label) {
      const key = s.label.trim().toLowerCase();
      if (seenLabels.has(key)) {
        out.push(diag.warning("preview/duplicate-story-label", at, `duplicate story label "${s.label}".`, "Give each story a distinct label so the picker isn't ambiguous."));
      }
      seenLabels.add(key);
    }

    if (s.viewport !== undefined && !isValidViewport(s.viewport)) {
      out.push(
        diag.error(
          "preview/invalid-story-viewport",
          at,
          `story "${s.id}" has an invalid viewport (${JSON.stringify(s.viewport)}).`,
          `Use "mobile", "desktop", or { width, height } with positive numbers.`,
        ),
      );
    }
    if (s.theme !== undefined && s.theme !== "light" && s.theme !== "dark") {
      out.push(
        diag.error(
          "preview/invalid-story-theme",
          at,
          `story "${s.id}" has an invalid theme (${JSON.stringify(s.theme)}).`,
          `Use "light" or "dark".`,
        ),
      );
    }
    if (s.props !== undefined) {
      const badPath = findNonSerializablePath(s.props);
      if (badPath) {
        out.push(
          diag.error(
            "preview/story-props-not-serializable",
            at,
            `story "${s.id}"'s props.${badPath} isn't plain, serializable data.`,
            "Story props cross into the sandboxed iframe as postMessage data — use only strings/numbers/booleans/plain objects/arrays.",
          ),
        );
      }
    }
    stories.push(s as PreviewStory);
  });

  return stories;
}

/** Parses + validates `preview.config.ts`. `stories` (already checked, may be
 *  `null`) is used only to cross-check `defaultStoryId`. */
function checkConfig(
  path: string,
  source: string,
  bundle: AuthoredBundle,
  stories: PreviewStory[] | null,
  out: Diagnostic[],
): Partial<PreviewConfig> | null {
  if (!checkCompiles(path, source, out)) return null;
  const before = out.length;
  checkImports(path, source, bundle, out);
  if (out.length > before) return null;

  let exports: Record<string, unknown>;
  try {
    exports = evaluateAuthoredModule(path, source);
  } catch (e) {
    out.push(
      diag.error(
        "preview/config-invalid",
        path,
        `${path} could not be evaluated: ${(e as Error).message}`,
        "preview.config.ts must be plain, self-contained data — a `config` (or default) object.",
      ),
    );
    return null;
  }

  const raw = (exports.config ?? exports.default) as Record<string, unknown> | undefined;
  if (raw === undefined || typeof raw !== "object") {
    out.push(
      diag.error(
        "preview/config-not-object",
        path,
        `${path} must export a config object (named "config" or default).`,
        `Export \`export const config: PreviewConfig = { kind: "component" }\`.`,
      ),
    );
    return null;
  }

  for (const key of Object.keys(raw)) {
    if (!KNOWN_CONFIG_KEYS.has(key)) {
      out.push(
        diag.warning(
          "preview/config-unknown-property",
          `${path}.${key}`,
          `unknown preview.config.ts property "${key}" — ignored.`,
          `Remove it, or check for a typo (supported: ${[...KNOWN_CONFIG_KEYS].join(", ")}).`,
        ),
      );
    }
  }

  const kind = (raw.kind as PreviewKind | undefined) ?? "component";
  if (!SUPPORTED_KINDS.includes(kind)) {
    out.push(
      diag.error(
        "preview/unsupported-kind",
        `${path}.kind`,
        `unsupported preview kind "${kind}" — no renderer is registered for it.`,
        `Use one of: ${SUPPORTED_KINDS.join(", ")}.`,
      ),
    );
  }

  if (raw.defaultStoryId !== undefined) {
    if (typeof raw.defaultStoryId !== "string") {
      out.push(diag.error("preview/invalid-default-story-id", `${path}.defaultStoryId`, "defaultStoryId must be a string.", "Set it to one of the ids in stories.ts."));
    } else if (stories && !stories.some((s) => s.id === raw.defaultStoryId)) {
      out.push(
        diag.error(
          "preview/default-story-not-found",
          `${path}.defaultStoryId`,
          `defaultStoryId "${raw.defaultStoryId as string}" does not match any story in stories.ts.`,
          "Set it to an id declared in stories.ts, or remove it to default to the first story.",
        ),
      );
    }
  }

  return raw as Partial<PreviewConfig>;
}

function checkNoImports(path: string, source: string, out: Diagnostic[]): boolean {
  const specs = extractImportSpecifiers(source);
  for (const spec of specs) {
    out.push(
      diag.error(
        "preview/api-config-unsupported-import",
        path,
        `${path} imports "${spec}", but API preview config must be plain, self-contained data.`,
        "Remove the import and inline deterministic request examples in api.config.ts.",
      ),
    );
  }
  return specs.length === 0;
}

function checkApiConfig(path: string, source: string, bundle: AuthoredBundle, out: Diagnostic[]): ApiPreviewConfig | null {
  void bundle;
  if (!checkCompiles(path, source, out)) return null;
  if (!checkNoImports(path, source, out)) return null;

  let exports: Record<string, unknown>;
  try {
    exports = evaluateAuthoredModule(path, source);
  } catch (e) {
    out.push(
      diag.error(
        "preview/api-config-invalid",
        path,
        `${path} could not be evaluated: ${(e as Error).message}`,
        "api.config.ts must export plain data: apiExamples plus an optional config object.",
      ),
    );
    return null;
  }

  const rawExamples = exports.apiExamples ?? exports.examples;
  if (!Array.isArray(rawExamples) || rawExamples.length === 0) {
    out.push(
      diag.error(
        "preview/api-examples-not-array",
        path,
        `${path} must export a non-empty apiExamples array.`,
        "Add deterministic request examples, e.g. `export const apiExamples = [{ id, label, method, path }]`.",
      ),
    );
    return null;
  }

  const examples: ApiPreviewExample[] = [];
  const ids = new Set<string>();
  rawExamples.forEach((raw: unknown, i) => {
    const at = `${path}[${i}]`;
    if (!raw || typeof raw !== "object") {
      out.push(diag.error("preview/api-example-invalid", at, `API example at index ${i} is not an object.`, "Each example must be `{ id, label, method, path, body? }`."));
      return;
    }
    const example = raw as Partial<ApiPreviewExample>;
    if (typeof example.id !== "string" || example.id.length === 0) {
      out.push(diag.error("preview/api-example-missing-id", at, `API example at index ${i} has no string id.`, "Give every example a stable id."));
      return;
    }
    if (ids.has(example.id)) {
      out.push(diag.error("preview/api-example-duplicate-id", at, `duplicate API example id "${example.id}".`, "Every API example id must be unique."));
    }
    ids.add(example.id);
    if (typeof example.label !== "string" || example.label.length === 0) {
      out.push(diag.error("preview/api-example-missing-label", at, `API example "${example.id}" has no string label.`, "Give it a short label for the endpoint selector."));
      return;
    }
    if (typeof example.method !== "string" || !API_PREVIEW_METHODS.includes(example.method as never)) {
      out.push(
        diag.error(
          "preview/api-example-invalid-method",
          at,
          `API example "${example.id}" has an unsupported method.`,
          `Use one of: ${API_PREVIEW_METHODS.join(", ")}.`,
        ),
      );
      return;
    }
    if (typeof example.path !== "string" || !example.path.startsWith("/")) {
      out.push(
        diag.error(
          "preview/api-example-invalid-path",
          at,
          `API example "${example.id}" path must start with "/".`,
          "Use an absolute API path such as `/notes`.",
        ),
      );
      return;
    }
    if (example.body !== undefined) {
      const badPath = findNonSerializablePath(example.body);
      if (badPath) {
        out.push(
          diag.error(
            "preview/api-example-body-not-serializable",
            at,
            `API example "${example.id}" body.${badPath} is not serializable JSON data.`,
            "Use only strings, numbers, booleans, null, arrays, and plain objects in request bodies.",
          ),
        );
      }
    }
    examples.push(example as ApiPreviewExample);
  });

  const rawConfig = (exports.config ?? exports.default) as Partial<ApiPreviewConfig> | undefined;
  const defaultExampleId = rawConfig?.defaultExampleId ?? examples[0]?.id;
  if (defaultExampleId && !examples.some((example) => example.id === defaultExampleId)) {
    out.push(
      diag.error(
        "preview/api-default-example-not-found",
        `${path}.defaultExampleId`,
        `defaultExampleId "${defaultExampleId}" does not match any apiExamples id.`,
        "Set it to an authored API example id, or remove it to use the first example.",
      ),
    );
  }

  return { title: rawConfig?.title, defaultExampleId, examples };
}

// ── best-practice suggestions ─────────────────────────────────────────────

function checkBestPractices(
  previewSrc: string,
  providersSrc: string | undefined,
  stories: PreviewStory[] | null,
  config: Partial<PreviewConfig> | null,
  out: Diagnostic[],
): void {
  if (!stories || stories.length === 0) {
    out.push(
      diag.suggestion(
        "preview/no-stories",
        AT,
        "no preview/stories.ts authored — the preview only shows its implicit default state.",
        "Add preview/stories.ts with a few named states (empty, loading, error, large dataset) so the preview exercises more than the happy path.",
      ),
    );
  } else {
    if (stories.length === 1) {
      out.push(
        diag.suggestion(
          "preview/single-story",
          AT,
          "only one story is authored.",
          "Consider adding stories for empty/loading/error/large-dataset states.",
        ),
      );
    }

    const hasEdgeCase = stories.some((s) =>
      EDGE_CASE_KEYWORDS.some((kw) => s.id.toLowerCase().includes(kw) || s.label.toLowerCase().includes(kw)),
    );
    if (!hasEdgeCase) {
      out.push(
        diag.suggestion(
          "preview/no-edge-case-story",
          AT,
          "no story name suggests an empty, loading, or error state.",
          "Add a story that shows the component in an edge-case state, not just the happy path.",
        ),
      );
    }

    const hasResponsiveStory = stories.some((s) => s.viewport === "mobile" || (s.viewport && typeof s.viewport === "object"));
    if (!hasResponsiveStory) {
      out.push(
        diag.suggestion(
          "preview/no-responsive-story",
          AT,
          "no story pins a mobile/narrow viewport.",
          "Add a story with `viewport: \"mobile\"` to verify the component still works at narrow widths.",
        ),
      );
    }

    for (const story of stories) {
      if (story.props === undefined) continue;
      const size = JSON.stringify(story.props).length;
      if (size > LARGE_PROPS_CHARS) {
        out.push(
          diag.suggestion(
            "preview/large-story-props",
            `${AT} → ${story.id}`,
            `story "${story.id}" has very large props (~${size} chars).`,
            "Trim the seed data — large props slow down every recompile (they cross the sandbox on every render).",
          ),
        );
      }
    }
  }

  if (!config?.title) {
    out.push(
      diag.suggestion(
        "preview/missing-title",
        AT,
        "no title set in preview.config.ts.",
        'Add `title` to preview.config.ts so the preview panel can label it, e.g. `{ title: "Card list" }`.',
      ),
    );
  }

  const combinedSource = `${previewSrc}\n${providersSrc ?? ""}`;
  if (INTERACTIVE_TAG.test(combinedSource) && !ARIA_ATTR.test(combinedSource)) {
    out.push(
      diag.suggestion(
        "preview/missing-accessibility-notes",
        AT,
        "preview renders interactive elements but no aria-* attributes were found.",
        "Verify keyboard/screen-reader behavior in this preview and add aria labels where useful.",
      ),
    );
  }
}

/**
 * Preview validation entry point (STATIC — no execution, no React mount, no
 * interview runtime). No-op when the scenario has no `preview/` folder (P1).
 */
export function validatePreview(bundle: AuthoredBundle): Diagnostic[] {
  const out: Diagnostic[] = [];
  const hasPreviewFolder = Object.keys(bundle.files).some((k) => k.startsWith("preview/"));
  if (!hasPreviewFolder) return out;

  const apiConfigPath = "preview/api.config.ts";
  const apiConfigSrc = bundle.files[apiConfigPath];
  if (apiConfigSrc !== undefined) {
    checkApiConfig(apiConfigPath, apiConfigSrc, bundle, out);
    return out;
  }

  const previewPath = "preview/Preview.tsx";
  const previewSrc = bundle.files[previewPath];
  if (previewSrc === undefined) {
    out.push(
      diag.error(
        "preview/missing-entry",
        AT,
        `preview/ exists but ${previewPath} is missing.`,
        `Add ${previewPath} — it's the one required file whenever preview/ exists.`,
      ),
    );
    return out;
  }

  checkPreviewSource(previewPath, previewSrc, bundle, out, { requireDefaultComponent: true });

  const providersPath = "preview/providers.tsx";
  const providersSrc = bundle.files[providersPath];
  if (providersSrc !== undefined) {
    checkPreviewSource(providersPath, providersSrc, bundle, out, { requireDefaultComponent: false });
  }

  const storiesPath = "preview/stories.ts";
  const storiesSrc = bundle.files[storiesPath];
  const stories = storiesSrc !== undefined ? checkStories(storiesPath, storiesSrc, bundle, out) : null;

  const configPath = "preview/preview.config.ts";
  const configSrc = bundle.files[configPath];
  const config = configSrc !== undefined ? checkConfig(configPath, configSrc, bundle, stories, out) : null;

  checkBestPractices(previewSrc, providersSrc, stories, config, out);

  return out;
}
