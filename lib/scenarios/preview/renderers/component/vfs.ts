/**
 * Pure virtual-filesystem path helpers for the component preview renderer.
 * Deliberately mirrors the equivalent helpers in
 * `lib/scenarios/engines/browser-test-runtime.ts` — a small, documented,
 * implementation-level reuse (docs/README.md
 * §12), not an architectural coupling between verification and preview: this
 * module has no dependency on that one and is used by neither the server nor
 * verification.
 */

export function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

export function normalize(path: string): string {
  const out: string[] = [];
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

/** Resolve a relative specifier against an importer key, trying TS/JS extensions. */
export function resolveRelative(importerKey: string, spec: string, vfs: Map<string, string>): string {
  const base = normalize(`${dirname(importerKey)}/${spec}`);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];
  for (const c of candidates) if (vfs.has(c)) return c;
  return base;
}

/** Fixed virtual paths authored preview source is mounted at. */
export const PREVIEW_SOURCE_PATH = "preview/Preview.tsx";
export const PROVIDERS_SOURCE_PATH = "preview/providers.tsx";

/** The virtual specifier `Preview.tsx` imports the candidate's live entry
 *  through — the entry's real workspace path varies per scenario, so it
 *  can't be a normal relative import (docs/README.md). */
export const ENTRY_SPECIFIER = "scenario:entry";

export interface VfsInput {
  files: { path: string; content: string }[];
  previewSource: string;
  providersSource?: string;
}

/** Build the virtual FS for one render: candidate files at their own paths,
 *  authored preview source at fixed `preview/` paths. */
export function buildVfs(input: VfsInput): Map<string, string> {
  const vfs = new Map<string, string>();
  for (const f of input.files) vfs.set(normalize(f.path), f.content);
  vfs.set(PREVIEW_SOURCE_PATH, input.previewSource);
  if (input.providersSource !== undefined) vfs.set(PROVIDERS_SOURCE_PATH, input.providersSource);
  return vfs;
}
