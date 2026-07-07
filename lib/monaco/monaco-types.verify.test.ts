import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { MONACO_LIBS } from "@/lib/monaco/generated-libs";

/**
 * Verifies the Monaco type universe headlessly. Monaco's editor IS the TypeScript
 * language service, so we compile the exact same virtual FS Monaco is given — the
 * generated React/csstype libs at their `node_modules` paths + the real workspace
 * files — with the same compiler options, and assert the diagnostics.
 *
 * This proves the fix without a browser: `react/jsx-runtime` resolves (no 2875),
 * cross-file imports resolve (no 2307), and genuine type errors still surface.
 */

const WS = join(
  process.cwd(),
  "content/interview-scenarios/frontend-react/user-directory-search/workspace",
);
const readWs = (f: string) => readFileSync(join(WS, f), "utf8");
const BACKEND_WS = join(
  process.cwd(),
  "content/interview-scenarios/backend-node/notes-rest-api/workspace",
);
const readBackendWs = (f: string) => readFileSync(join(BACKEND_WS, f), "utf8");
const BACKEND_ROOT = join(
  process.cwd(),
  "content/interview-scenarios/backend-node/notes-rest-api",
);
const readBackend = (f: string) => readFileSync(join(BACKEND_ROOT, f), "utf8");

interface Diag {
  code: number;
  message: string;
}

/** Compile a virtual workspace against the bundled libs; return workspace diagnostics. */
function diagnose(files: Record<string, string>, entry: string): Diag[] {
  const virtual = new Map<string, string>();
  for (const lib of MONACO_LIBS) virtual.set(`/${lib.path}`, lib.content);
  for (const [name, content] of Object.entries(files)) virtual.set(`/ws/${name}`, content);

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.ReactJSX,
    jsxImportSource: "react",
    esModuleInterop: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
  };

  const host = ts.createCompilerHost(options, true);
  const origGetSourceFile = host.getSourceFile.bind(host);
  const origFileExists = host.fileExists.bind(host);
  const origReadFile = host.readFile.bind(host);
  const origDirExists = host.directoryExists?.bind(host);
  host.fileExists = (f) => virtual.has(f) || origFileExists(f);
  host.readFile = (f) => (virtual.has(f) ? virtual.get(f) : origReadFile(f));
  host.getSourceFile = (f, languageVersion, onError) => {
    const content = virtual.get(f);
    return content !== undefined
      ? ts.createSourceFile(f, content, languageVersion, true)
      : origGetSourceFile(f, languageVersion, onError);
  };
  // The bare host is partly backed by the real FS; make virtual dirs (e.g.
  // `/node_modules`) report as existing so resolution descends into them.
  // (Monaco's language-service worker handles this internally over extra libs.)
  host.directoryExists = (d) => {
    const prefix = d.endsWith("/") ? d : `${d}/`;
    for (const key of virtual.keys()) if (key.startsWith(prefix)) return true;
    return origDirExists ? origDirExists(d) : false;
  };

  const roots = [...Object.keys(files).map((name) => `/ws/${name}`), `/ws/${entry}`];
  const program = ts.createProgram([...new Set(roots)], options, host);
  return [...program.getSemanticDiagnostics(), ...program.getSyntacticDiagnostics()]
    .filter((d) => d.file?.fileName.startsWith("/ws/"))
    .map((d) => ({ code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, "\n") }));
}

describe("Monaco type universe", () => {
  const base = { "types.ts": readWs("types.ts"), "api.ts": readWs("api.ts") };

  it("resolves react/jsx-runtime + cross-file imports — no false diagnostics on the starter", () => {
    const diags = diagnose({ ...base, "UserSearch.tsx": readWs("UserSearch.tsx") }, "UserSearch.tsx");
    // The exact errors the old setup produced must be gone:
    expect(diags.find((d) => d.code === 2875)).toBeUndefined(); // react/jsx-runtime missing
    expect(diags.find((d) => d.code === 2307)).toBeUndefined(); // cannot find module
    // The clean starter should have zero diagnostics.
    expect(diags).toEqual([]);
  });

  it("resolves a multi-file refactor (a created hook importing workspace files + react)", () => {
    const hook = [
      `import { useState, useEffect } from "react";`,
      `import type { User } from "./types";`,
      `import { searchUsers } from "./api";`,
      `export function useUserSearch(query: string) {`,
      `  const [results, setResults] = useState<User[]>([]);`,
      `  useEffect(() => { void searchUsers(query).then(setResults); }, [query]);`,
      `  return results;`,
      `}`,
    ].join("\n");
    const component = [
      `import { useUserSearch } from "./useUserSearch";`,
      `export function UserSearch() {`,
      `  const users = useUserSearch("");`,
      `  return <ul>{users.map((u) => <li key={u.id}>{u.name} — {u.email}</li>)}</ul>;`,
      `}`,
    ].join("\n");
    const diags = diagnose({ ...base, "useUserSearch.ts": hook, "UserSearch.tsx": component }, "UserSearch.tsx");
    expect(diags).toEqual([]);
  });

  it("still reports genuine type errors (diagnostics are not disabled)", () => {
    const broken = `export const wrong: number = "definitely a string";\n`;
    const diags = diagnose({ ...base, "UserSearch.tsx": broken }, "UserSearch.tsx");
    expect(diags.some((d) => d.code === 2322)).toBe(true); // string not assignable to number
  });

  it("type-checks JSX intrinsic attributes (react JSX namespace is loaded)", () => {
    const badJsx = `export function Broken() { return <div notARealProp="x" />; }\n`;
    const diags = diagnose({ ...base, "UserSearch.tsx": badJsx }, "UserSearch.tsx");
    // An unknown attribute on <div> only errors if JSX.IntrinsicElements resolved.
    expect(diags.length).toBeGreaterThan(0);
  });

  it("resolves backend engine modules and contextual Express handler types", () => {
    const app = [
      `import express from "express";`,
      `import { db } from "./db";`,
      ``,
      `const app = express();`,
      `app.use(express.json());`,
      ``,
      `app.get("/notes/:id", (req, res) => {`,
      `  const id = Number(req.params.id);`,
      `  const note = db.get("SELECT id FROM notes WHERE id = ?", [id]);`,
      `  res.status(note ? 200 : 404).json(note ?? { error: "Note not found" });`,
      `});`,
      ``,
      `export default app;`,
    ].join("\n");
    const diags = diagnose(
      {
        "app.ts": app,
        "db.ts": readBackendWs("db.ts"),
        "backend-types.d.ts": readBackendWs("backend-types.d.ts"),
      },
      "app.ts",
    );
    expect(diags.find((d) => d.code === 2307)).toBeUndefined();
    expect(diags.find((d) => d.code === 7006)).toBeUndefined();
    expect(diags).toEqual([]);
  });

  it("type-checks the Notes backend starter and every reference solution", () => {
    const readonlyFiles = {
      "db.ts": readBackendWs("db.ts"),
      "backend-types.d.ts": readBackendWs("backend-types.d.ts"),
    };
    const appSources = [
      readBackendWs("app.ts"),
      readBackend("solution/step-1/app.ts").replaceAll("../../workspace/", "./"),
      readBackend("solution/step-2/app.ts").replaceAll("../../workspace/", "./"),
      readBackend("solution/step-3/app.ts").replaceAll("../../workspace/", "./"),
    ];

    for (const app of appSources) {
      const diags = diagnose({ ...readonlyFiles, "app.ts": app }, "app.ts");
      expect(diags.find((d) => d.code === 2307)).toBeUndefined();
      expect(diags.find((d) => d.code === 7006)).toBeUndefined();
      expect(diags).toEqual([]);
    }
  });
});
