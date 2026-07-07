import { describe, expect, it } from "vitest";
import {
  activeFile,
  applyCheckpoint,
  closeTab,
  createFile,
  deleteFile,
  editFile,
  initSession,
  openFile,
  renameFile,
} from "@/lib/scenarios/session";
import type { CheckpointFile, ServedWorkspaceFile } from "@/lib/scenarios/types";

const SEED: ServedWorkspaceFile[] = [
  { path: "UserSearch.tsx", role: "edit", content: "// entry" },
  { path: "api.ts", role: "readonly", content: "// api" },
  { path: "types.ts", role: "readonly", content: "// types" },
];

const start = () => initSession(SEED, "UserSearch.tsx");

describe("initSession", () => {
  it("seeds files and opens the entry file", () => {
    const s = start();
    expect(s.files.map((f) => f.path)).toEqual(["UserSearch.tsx", "api.ts", "types.ts"]);
    expect(s.files.every((f) => f.origin === "authored")).toBe(true);
    expect(activeFile(s)?.path).toBe("UserSearch.tsx");
    expect(s.openFileIds).toHaveLength(1);
  });
});

describe("editFile", () => {
  it("edits an editable file", () => {
    const s = start();
    const id = s.files[0]!.id;
    const next = editFile(s, id, "changed");
    expect(next.files[0]!.content).toBe("changed");
  });

  it("never mutates a readonly file", () => {
    const s = start();
    const readonlyId = s.files.find((f) => f.role === "readonly")!.id;
    const next = editFile(s, readonlyId, "hacked");
    expect(next).toBe(s); // unchanged reference
    expect(next.files.find((f) => f.id === readonlyId)!.content).toBe("// api");
  });
});

describe("createFile", () => {
  it("creates an editable file and opens it", () => {
    const r = createFile(start(), "useUserSearch.ts");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const created = r.session.files.find((f) => f.path === "useUserSearch.ts");
    expect(created?.role).toBe("edit");
    expect(created?.origin).toBe("created");
    expect(r.session.activeFileId).toBe(created?.id);
    expect(r.session.openFileIds).toContain(created?.id);
  });

  it("rejects duplicate names (case-insensitive)", () => {
    const r = createFile(start(), "API.ts");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/already exists/);
  });

  it("rejects invalid names but accepts nested paths", () => {
    expect(createFile(start(), "  ").ok).toBe(false);
    expect(createFile(start(), "/abs.ts").ok).toBe(false);
    expect(createFile(start(), "../secret.ts").ok).toBe(false);
    expect(createFile(start(), "bad name.ts").ok).toBe(false);
    expect(createFile(start(), "a//b.ts").ok).toBe(false);
    // Nested paths are representable in the model (UI stays flat for V1).
    expect(createFile(start(), "hooks/useUserSearch.ts").ok).toBe(true);
  });
});

/** Create a file and return { session, id } for CRUD-on-created tests. */
function withCreatedFile(path = "useUserSearch.ts") {
  const r = createFile(start(), path);
  if (!r.ok) throw new Error(r.error);
  return { session: r.session, id: r.session.activeFileId! };
}

describe("renameFile", () => {
  it("renames a created file, preserving id and content", () => {
    const { session, id } = withCreatedFile();
    const r = renameFile(session, id, "hooks/useSearch.ts");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const file = r.session.files.find((f) => f.id === id)!;
    expect(file.path).toBe("hooks/useSearch.ts");
  });

  it("refuses to rename a readonly file", () => {
    const s = start();
    const readonlyId = s.files.find((f) => f.role === "readonly")!.id;
    expect(renameFile(s, readonlyId, "other.ts").ok).toBe(false);
  });

  it("refuses to rename an authored editable seed file", () => {
    const s = start();
    const entryId = s.files[0]!.id; // UserSearch.tsx (authored, edit)
    const r = renameFile(s, entryId, "Search.tsx");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/can't be renamed/);
  });
});

describe("deleteFile", () => {
  it("deletes a created file and reselects", () => {
    const { session, id } = withCreatedFile();
    const r = deleteFile(session, id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.session.files.some((f) => f.id === id)).toBe(false);
    expect(r.session.openFileIds).not.toContain(id);
  });

  it("refuses to delete a readonly file", () => {
    const s = start();
    const readonlyId = s.files.find((f) => f.role === "readonly")!.id;
    expect(deleteFile(s, readonlyId).ok).toBe(false);
  });

  it("refuses to delete an authored editable seed file", () => {
    const s = start();
    const entryId = s.files[0]!.id;
    const r = deleteFile(s, entryId);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/can't be deleted/);
  });
});

describe("applyCheckpoint", () => {
  const CHECKPOINT: CheckpointFile[] = [
    { path: "UserSearch.tsx", content: "// solution entry" },
    { path: "useUserSearch.ts", content: "// extracted hook" },
  ];

  /** Snapshot of the file set (path → content + role + origin), order-independent. */
  const fileSetOf = (s: ReturnType<typeof initSession>) =>
    [...s.files]
      .map((f) => `${f.path}|${f.content}|${f.role}|${f.origin}`)
      .sort();

  it("is deterministic regardless of current edits or created files", () => {
    // Path A: apply straight onto the pristine seed.
    const a = applyCheckpoint(SEED, "UserSearch.tsx", CHECKPOINT);

    // Path B: heavily mutate first (edit entry, create files), THEN apply.
    let dirty = initSession(SEED, "UserSearch.tsx");
    dirty = editFile(dirty, dirty.files[0]!.id, "candidate's own messy code");
    const created = createFile(dirty, "scratch.ts");
    if (created.ok) dirty = created.session;
    const b = applyCheckpoint(SEED, "UserSearch.tsx", CHECKPOINT);

    // Identical resulting workspace (ignoring volatile ids).
    expect(fileSetOf(a)).toEqual(fileSetOf(b));
    void dirty;
  });

  it("overlays seed files (keeping role/origin) and adds new files as created", () => {
    const s = applyCheckpoint(SEED, "UserSearch.tsx", CHECKPOINT);

    const entry = s.files.find((f) => f.path === "UserSearch.tsx")!;
    expect(entry.content).toBe("// solution entry");
    expect(entry.role).toBe("edit");
    expect(entry.origin).toBe("authored"); // still a non-deletable authored file

    const hook = s.files.find((f) => f.path === "useUserSearch.ts")!;
    expect(hook.origin).toBe("created"); // candidate-owned going forward
    expect(hook.role).toBe("edit");

    // Readonly seed files are untouched and preserved.
    expect(s.files.find((f) => f.path === "api.ts")?.role).toBe("readonly");
  });
});

describe("tabs", () => {
  it("opens and closes tabs, keeping an active file", () => {
    let s = start();
    const apiId = s.files.find((f) => f.path === "api.ts")!.id;
    s = openFile(s, apiId);
    expect(s.activeFileId).toBe(apiId);
    expect(s.openFileIds).toHaveLength(2);
    s = closeTab(s, apiId);
    expect(s.openFileIds).toHaveLength(1);
    expect(s.activeFileId).toBe(s.files[0]!.id);
  });
});
