"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, FilePlus2, Lock, Pencil, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ScenarioSessionApi } from "@/hooks/use-scenario-session";
import type { SessionFile } from "@/lib/scenarios/types";

/**
 * Workspace file sidebar: lists the session's files, opens them on click, and
 * provides create / rename / delete for editable files. Readonly seed files show
 * a lock and expose no mutation controls.
 */
export function WorkspaceFileTree({ api }: { api: ScenarioSessionApi }) {
  const { session, open, create, rename, remove } = api;
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SessionFile | null>(null);
  const [referenceCollapsed, setReferenceCollapsed] = useState(true);

  const isFullstackWorkspace = useMemo(
    () => session.files.some((file) => file.path.startsWith("backend/") || file.path.startsWith("frontend/")),
    [session.files],
  );
  const editableFiles = useMemo(() => session.files.filter((file) => file.role !== "readonly"), [session.files]);
  const referenceFiles = useMemo(() => session.files.filter((file) => file.role === "readonly"), [session.files]);
  const grouped = isFullstackWorkspace && referenceFiles.length > 0;
  const activeReferenceFile = referenceFiles.some((file) => file.id === session.activeFileId);
  const showReferenceFiles = !referenceCollapsed || activeReferenceFile;

  const submitCreate = () => {
    if (create(newName.trim())) {
      setNewName("");
      setCreating(false);
    }
  };

  const startRename = (file: SessionFile) => {
    setRenamingId(file.id);
    setRenameValue(file.path);
  };

  const submitRename = () => {
    if (renamingId && rename(renamingId, renameValue.trim())) {
      setRenamingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-black/20">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
        <span>Files</span>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          aria-label="New file"
          aria-expanded={creating}
          className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
        >
          <FilePlus2 className="size-4" />
        </button>
      </div>

      {creating ? (
        <div className="flex items-center gap-1 px-2 pb-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCreate();
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="new-file.ts"
            aria-label="New file name"
            className="min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white outline-none focus:border-blue-400"
          />
          <button type="button" onClick={submitCreate} aria-label="Create file" className="rounded p-1 text-green-400 hover:bg-white/10">
            <Check className="size-4" />
          </button>
          <button type="button" onClick={() => setCreating(false)} aria-label="Cancel" className="rounded p-1 text-gray-400 hover:bg-white/10">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {grouped ? (
          <>
            <FileSectionLabel label="Files to edit" count={editableFiles.length} />
            <ul>
              {editableFiles.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  isActive={file.id === session.activeFileId}
                  isRenaming={file.id === renamingId}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  submitRename={submitRename}
                  cancelRename={() => setRenamingId(null)}
                  open={open}
                  startRename={startRename}
                  setPendingDelete={setPendingDelete}
                />
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setReferenceCollapsed((collapsed) => !collapsed)}
              className="mt-3 flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase hover:bg-white/5 hover:text-gray-300 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
              aria-expanded={showReferenceFiles}
            >
              {showReferenceFiles ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              <span>Reference files</span>
              <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">{referenceFiles.length}</span>
            </button>
            {showReferenceFiles ? (
              <ul className="mt-1">
                {referenceFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    isActive={file.id === session.activeFileId}
                    isRenaming={file.id === renamingId}
                    renameValue={renameValue}
                    setRenameValue={setRenameValue}
                    submitRename={submitRename}
                    cancelRename={() => setRenamingId(null)}
                    open={open}
                    startRename={startRename}
                    setPendingDelete={setPendingDelete}
                    muted
                  />
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <ul>
            {session.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                isActive={file.id === session.activeFileId}
                isRenaming={file.id === renamingId}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                submitRename={submitRename}
                cancelRename={() => setRenamingId(null)}
                open={open}
                startRename={startRename}
                setPendingDelete={setPendingDelete}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title={pendingDelete ? `Delete ${pendingDelete.path}?` : "Delete file?"}
        description="This removes the file from your workspace. You can't undo this."
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={() => {
          if (pendingDelete) remove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function FileSectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-1 flex items-center justify-between px-2 text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
      <span>{label}</span>
      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">{count}</span>
    </div>
  );
}

function FileRow({
  file,
  isActive,
  isRenaming,
  renameValue,
  setRenameValue,
  submitRename,
  cancelRename,
  open,
  startRename,
  setPendingDelete,
  muted = false,
}: {
  file: SessionFile;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  setRenameValue: (value: string) => void;
  submitRename: () => void;
  cancelRename: () => void;
  open: (id: string) => void;
  startRename: (file: SessionFile) => void;
  setPendingDelete: (file: SessionFile) => void;
  muted?: boolean;
}) {
  return (
    <li className="group">
      {isRenaming ? (
        <div className="flex items-center gap-1 px-1 py-0.5">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") cancelRename();
            }}
            aria-label={`Rename ${file.path}`}
            className="min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white outline-none focus:border-blue-400"
          />
          <button type="button" onClick={submitRename} aria-label="Save name" className="rounded p-1 text-green-400 hover:bg-white/10">
            <Check className="size-4" />
          </button>
          <button type="button" onClick={cancelRename} aria-label="Cancel rename" className="rounded p-1 text-gray-400 hover:bg-white/10">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
            isActive
              ? "bg-white/10 text-white"
              : muted
                ? "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                : "text-gray-300 hover:bg-white/5"
          }`}
        >
          <button
            type="button"
            onClick={() => open(file.id)}
            className="min-w-0 flex-1 truncate rounded text-left focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
            title={file.path}
          >
            {file.path}
          </button>
          {file.role === "readonly" ? (
            <Lock className="size-3.5 shrink-0 text-gray-500" aria-label="Read-only" />
          ) : file.origin === "created" ? (
            <>
              <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => startRename(file)}
                  aria-label={`Rename ${file.path}`}
                  className="rounded p-0.5 text-gray-400 hover:text-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(file)}
                  aria-label={`Delete ${file.path}`}
                  className="rounded p-0.5 text-gray-400 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-400/60 focus-visible:outline-none"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
              <span className="shrink-0 text-[10px] text-blue-300/70">new</span>
            </>
          ) : null}
        </div>
      )}
    </li>
  );
}
