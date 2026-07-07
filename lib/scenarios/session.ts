import type {
  CheckpointFile,
  ServedWorkspaceFile,
  SessionFile,
  SessionResult,
  WorkspaceSession,
} from "@/lib/scenarios/types";

/**
 * Pure workspace-session model. Owns the candidate's live file set and the
 * open-tab / active-file view, with full CRUD (create / rename / delete / edit).
 * No React, no fs — every operation returns a new session (immutable updates) so
 * it's trivially testable and safe to drive from `useState`.
 *
 * Rules (by role + origin):
 * - `readonly` seed files (e.g. `api.ts`) are fully protected: no edit, rename,
 *   or delete.
 * - Authored `edit` seed files (e.g. `UserSearch.tsx`) are editable but NOT
 *   renamable or deletable — this keeps the authored test contract stable.
 * - Candidate-`created` files support full CRUD (edit, rename, delete), so
 *   refactors like extracting a hook into a new file happen naturally.
 *
 * Paths are stored as full workspace-relative paths (e.g. `hooks/useX.ts`), so
 * nested folders can be introduced later without redesigning the model — even
 * though the V1 UI presents a flat list.
 */

/** Characters allowed in a single path segment. */
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
const MAX_PATH = 200;

function newId(): string {
  return crypto.randomUUID();
}

/** Seed a fresh session from the authored workspace files. */
export function initSession(seed: ServedWorkspaceFile[], entry: string): WorkspaceSession {
  const files: SessionFile[] = seed.map((f) => ({
    id: newId(),
    path: f.path,
    content: f.content,
    role: f.role,
    origin: "authored",
  }));
  const entryFile = files.find((f) => f.path === entry) ?? files[0] ?? null;
  return {
    files,
    activeFileId: entryFile?.id ?? null,
    openFileIds: entryFile ? [entryFile.id] : [],
  };
}

/**
 * Validate a proposed workspace-relative path; `selfId` excludes a file from the
 * duplicate check (rename). Accepts `/`-separated segments so nested paths are
 * representable, while the V1 UI keeps entry flat.
 */
function validatePath(
  session: WorkspaceSession,
  rawPath: string,
  selfId?: string,
): { ok: true; path: string } | { ok: false; error: string } {
  const path = rawPath.trim();
  if (path === "") return { ok: false, error: "File name can't be empty." };
  if (path.length > MAX_PATH) return { ok: false, error: "File path is too long." };
  if (path.startsWith("/")) return { ok: false, error: "Use a relative path (no leading slash)." };
  for (const segment of path.split("/")) {
    if (segment === "") return { ok: false, error: "Path has an empty segment." };
    if (segment === "." || segment === "..") {
      return { ok: false, error: "Path can't contain '.' or '..' segments." };
    }
    if (!SEGMENT_RE.test(segment)) {
      return { ok: false, error: "Use letters, numbers, dots, dashes, or underscores." };
    }
  }
  const clash = session.files.some(
    (f) => f.id !== selfId && f.path.toLowerCase() === path.toLowerCase(),
  );
  if (clash) return { ok: false, error: `A file named "${path}" already exists.` };
  return { ok: true, path };
}

/** Edit a file's contents. No-op for readonly files (defence-in-depth; the UI also guards). */
export function editFile(session: WorkspaceSession, id: string, content: string): WorkspaceSession {
  let changed = false;
  const files = session.files.map((f) => {
    if (f.id !== id || f.role === "readonly" || f.content === content) return f;
    changed = true;
    return { ...f, content };
  });
  return changed ? { ...session, files } : session;
}

/** Open a file in a tab and make it active. */
export function openFile(session: WorkspaceSession, id: string): WorkspaceSession {
  if (!session.files.some((f) => f.id === id)) return session;
  const openFileIds = session.openFileIds.includes(id)
    ? session.openFileIds
    : [...session.openFileIds, id];
  return { ...session, openFileIds, activeFileId: id };
}

/** Close a tab. If it was active, activate the previous open tab (or none). */
export function closeTab(session: WorkspaceSession, id: string): WorkspaceSession {
  const idx = session.openFileIds.indexOf(id);
  if (idx === -1) return session;
  const openFileIds = session.openFileIds.filter((fid) => fid !== id);
  let activeFileId = session.activeFileId;
  if (activeFileId === id) {
    activeFileId = openFileIds[Math.max(0, idx - 1)] ?? openFileIds[0] ?? null;
  }
  return { ...session, openFileIds, activeFileId };
}

/** Create a new (editable) file and open it. */
export function createFile(session: WorkspaceSession, rawPath: string): SessionResult {
  const valid = validatePath(session, rawPath);
  if (!valid.ok) return { ok: false, error: valid.error };
  const file: SessionFile = {
    id: newId(),
    path: valid.path,
    content: "",
    role: "edit",
    origin: "created",
  };
  return {
    ok: true,
    session: {
      ...session,
      files: [...session.files, file],
      openFileIds: [...session.openFileIds, file.id],
      activeFileId: file.id,
    },
  };
}

/** Reason a provided (authored) file can't be renamed/deleted, or null if it can. */
function immutableReason(file: SessionFile, verb: "renamed" | "deleted"): string | null {
  if (file.origin === "created") return null;
  return file.role === "readonly"
    ? "This file is read-only."
    : `Provided workspace files can't be ${verb}.`;
}

/** Rename a candidate-created file. Authored seed files can't be renamed. */
export function renameFile(session: WorkspaceSession, id: string, rawPath: string): SessionResult {
  const file = session.files.find((f) => f.id === id);
  if (!file) return { ok: false, error: "File not found." };
  const blocked = immutableReason(file, "renamed");
  if (blocked) return { ok: false, error: blocked };
  const valid = validatePath(session, rawPath, id);
  if (!valid.ok) return { ok: false, error: valid.error };
  const files = session.files.map((f) => (f.id === id ? { ...f, path: valid.path } : f));
  return { ok: true, session: { ...session, files } };
}

/** Delete a candidate-created file, closing its tab. Authored seed files can't be deleted. */
export function deleteFile(session: WorkspaceSession, id: string): SessionResult {
  const file = session.files.find((f) => f.id === id);
  if (!file) return { ok: false, error: "File not found." };
  const blocked = immutableReason(file, "deleted");
  if (blocked) return { ok: false, error: blocked };
  const withoutFile: WorkspaceSession = { ...session, files: session.files.filter((f) => f.id !== id) };
  return { ok: true, session: closeTab(withoutFile, id) };
}

/** Resolve the currently active file, or null. */
export function activeFile(session: WorkspaceSession): SessionFile | null {
  return session.files.find((f) => f.id === session.activeFileId) ?? null;
}

/**
 * Apply a checkpoint DETERMINISTICALLY: rebuild the workspace from the authored
 * seed, then overlay the checkpoint files. The result depends only on
 * (`seed`, `entry`, `checkpointFiles`) — never on the candidate's current edits
 * or created files — so applying the same checkpoint always yields the exact same
 * workspace. Overlaid seed files keep their role/origin (an authored `edit` file
 * stays a non-deletable authored file); checkpoint files with no seed match are
 * added as candidate-owned (`created`, `edit`) so the candidate continues from
 * them. Any checkpoint-touched file is opened; the entry file is focused.
 */
export function applyCheckpoint(
  seed: readonly ServedWorkspaceFile[],
  entry: string,
  checkpointFiles: readonly CheckpointFile[],
): WorkspaceSession {
  const base = initSession([...seed], entry);
  const overlay = new Map(checkpointFiles.map((f) => [f.path, f.content]));

  // Overlay onto matching seed files.
  const files: SessionFile[] = base.files.map((file) =>
    overlay.has(file.path) ? { ...file, content: overlay.get(file.path)! } : file,
  );

  // Add checkpoint files that don't correspond to a seed file (candidate-owned).
  const seedPaths = new Set(base.files.map((f) => f.path));
  const added: SessionFile[] = checkpointFiles
    .filter((f) => !seedPaths.has(f.path))
    .map((f) => ({ id: newId(), path: f.path, content: f.content, role: "edit", origin: "created" }));

  const allFiles = [...files, ...added];
  const touched = new Set(checkpointFiles.map((f) => f.path));
  const openIds = allFiles.filter((f) => touched.has(f.path)).map((f) => f.id);
  const entryFile = allFiles.find((f) => f.path === entry) ?? allFiles[0] ?? null;
  const openFileIds = entryFile && !openIds.includes(entryFile.id) ? [entryFile.id, ...openIds] : openIds;

  return {
    files: allFiles,
    activeFileId: entryFile?.id ?? null,
    openFileIds,
  };
}
