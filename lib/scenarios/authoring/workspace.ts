import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";
import { SUPPORTED_LANGUAGES } from "@/lib/scenarios/authoring/taxonomy";

const AT = "scenario.md → workspace";

const EXT_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  sh: "bash",
  bash: "bash",
  sql: "sql",
  css: "css",
  html: "html",
  json: "json",
  md: "markdown",
};

function languageOf(path: string): string | null {
  return EXT_LANGUAGE[path.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

// ── relative-import resolution (mirrors the runtime's module resolver) ────────

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}
function normalize(path: string): string {
  const out: string[] = [];
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}
/** Resolve a relative specifier against `fromPath` (workspace-relative), returning
 *  the matched declared path or null. */
function resolveRelative(fromPath: string, spec: string, declared: Set<string>): string | null {
  const base = normalize(`${dirname(fromPath)}/${spec}`);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}/index.ts`, `${base}/index.tsx`];
  return candidates.find((c) => declared.has(c)) ?? null;
}

/** Extract relative import/require/export-from specifiers from a source file. */
function relativeSpecifiers(src: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g,
    /import\s*["']([^"']+)["']/g, // side-effect import
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /import\(\s*["']([^"']+)["']\s*\)/g, // dynamic
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const spec = m[1]!;
      if (spec.startsWith(".")) specs.push(spec);
    }
  }
  return specs;
}

/**
 * Workspace validation: every declared file exists, the entry is valid + editable,
 * no duplicate declarations, relative imports resolve, file languages are
 * supported, and undeclared workspace files (dead assets) are flagged.
 */
export function validateWorkspace(bundle: AuthoredBundle): Diagnostic[] {
  const { scenario } = bundle;
  if (!scenario) return []; // frontmatter validator already reported the schema failure.

  const out: Diagnostic[] = [];
  const declared = scenario.workspace.files;
  const declaredPaths = declared.map((f) => f.path);
  const declaredSet = new Set(declaredPaths);

  // Duplicate declarations.
  const seen = new Set<string>();
  for (const p of declaredPaths) {
    if (seen.has(p)) {
      out.push(
        diag.error(
          "workspace/duplicate-file",
          AT,
          `workspace file "${p}" is declared more than once.`,
          "Remove the duplicate entry from `workspace.files`.",
        ),
      );
    }
    seen.add(p);
  }

  // Required files exist on disk.
  for (const file of declared) {
    const key = `workspace/${file.path}`;
    if (!(key in bundle.files)) {
      out.push(
        diag.error(
          "workspace/missing-file",
          AT,
          `declared workspace file "${file.path}" is missing on disk.`,
          `Create workspace/${file.path}, or remove it from \`workspace.files\`.`,
        ),
      );
    }
    const lang = languageOf(file.path);
    if (lang && !SUPPORTED_LANGUAGES.includes(lang) && lang !== "json" && lang !== "markdown") {
      out.push(
        diag.warning(
          "workspace/unsupported-language",
          `${AT}.files`,
          `workspace file "${file.path}" uses an unsupported language (${lang}).`,
          `Use a supported language: ${SUPPORTED_LANGUAGES.join(", ")}.`,
        ),
      );
    }
  }

  // Entry must be declared and should be editable.
  const entryFile = declared.find((f) => f.path === scenario.workspace.entry);
  if (!entryFile) {
    out.push(
      diag.error(
        "workspace/entry-undeclared",
        `${AT}.entry`,
        `entry "${scenario.workspace.entry}" is not one of the declared workspace files.`,
        `Set \`entry\` to a declared file (${declaredPaths.join(", ") || "none declared"}).`,
      ),
    );
  } else if (entryFile.role !== "edit") {
    out.push(
      diag.warning(
        "workspace/entry-readonly",
        `${AT}.entry`,
        `entry "${scenario.workspace.entry}" is readonly — the candidate opens a file they can't edit.`,
        `Make the entry file \`role: edit\`, or point \`entry\` at the primary editable file.`,
      ),
    );
  }

  // Relative imports resolve to a declared file.
  for (const file of declared) {
    const src = bundle.files[`workspace/${file.path}`];
    if (src === undefined) continue;
    for (const spec of relativeSpecifiers(src)) {
      if (!resolveRelative(file.path, spec, declaredSet)) {
        out.push(
          diag.error(
            "workspace/unresolved-import",
            `workspace/${file.path}`,
            `import "${spec}" does not resolve to a declared workspace file.`,
            `Add the target to \`workspace.files\`, or fix the import path in workspace/${file.path}.`,
          ),
        );
      }
    }
  }

  // Undeclared workspace files present on disk (dead assets).
  for (const key of Object.keys(bundle.files)) {
    if (!key.startsWith("workspace/")) continue;
    const rel = key.slice("workspace/".length);
    if (!declaredSet.has(rel)) {
      out.push(
        diag.warning(
          "workspace/undeclared-file",
          key,
          `workspace file "${rel}" exists on disk but isn't declared in \`workspace.files\`.`,
          `Declare it in \`workspace.files\` (so it's served) or delete workspace/${rel}.`,
        ),
      );
    }
  }

  return out;
}
