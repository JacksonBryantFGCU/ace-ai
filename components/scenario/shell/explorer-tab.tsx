"use client";

import { useState } from "react";
import { Check, ChevronDown, FilePlus2, Folder, Lock, Pencil, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { shell } from "@/components/scenario/shell/tokens";
import type { ScenarioSessionApi } from "@/hooks/use-scenario-session";
import type { SessionFile } from "@/lib/scenarios/types";

const ext = (path: string) => (path.split(".").pop() || "").toUpperCase();

/**
 * The Explorer panel tab: the session's files as an IDE file tree. Files open on
 * click; created (editable) files can be renamed or deleted, readonly seed files
 * show a lock. Same session API as before — only the presentation is new.
 */
export function ExplorerTab({ api }: { api: ScenarioSessionApi }) {
  const { session, open, create, rename, remove } = api;
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SessionFile | null>(null);

  const submitCreate = () => {
    if (create(newName.trim())) {
      setNewName("");
      setCreating(false);
    }
  };

  const submitRename = () => {
    if (renamingId && rename(renamingId, renameValue.trim())) setRenamingId(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center justify-end gap-0.5 px-2.5 pt-2 pb-1">
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          aria-label="New file"
          aria-expanded={creating}
          className="flex size-7 items-center justify-center rounded-[7px] text-[#8b95a3] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
        >
          <FilePlus2 className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <div className="flex items-center gap-1.5 px-1.5 py-1 text-[12.5px]" style={{ color: shell.text }}>
          <ChevronDown className="size-3.5" style={{ color: shell.textFaint }} />
          <Folder className="size-3.5" style={{ color: shell.aiAccent }} />
          <span className="font-medium">src</span>
        </div>

        <ul>
          {session.files.map((file) => {
            const isActive = file.id === session.activeFileId;
            const isRenaming = file.id === renamingId;
            if (isRenaming) {
              return (
                <li key={file.id} className="flex items-center gap-1 py-0.5 pr-1 pl-[22px]">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    aria-label={`Rename ${file.path}`}
                    className="min-w-0 flex-1 rounded-md border border-blue-500 bg-[#0a0c10] px-[7px] py-1 font-mono text-xs text-white outline-none"
                  />
                  <button type="button" onClick={submitRename} aria-label="Save name" className="rounded p-0.5 text-emerald-400 hover:bg-white/10">
                    <Check className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => setRenamingId(null)} aria-label="Cancel rename" className="rounded p-0.5 text-[#8b95a3] hover:bg-white/10">
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            }
            return (
              <li key={file.id} className="group">
                <div
                  className="flex items-center gap-2 rounded-[7px] py-[5px] pr-2 pl-[22px] text-[12.5px] transition-colors"
                  style={{
                    background: isActive ? "rgba(255,255,255,.08)" : "transparent",
                    color: isActive ? "#ffffff" : shell.text,
                  }}
                >
                  <span
                    className="flex-none rounded font-mono text-[9px] font-bold"
                    style={{ padding: "2px 4px", background: "rgba(255,255,255,.06)", color: "#8b95a3" }}
                  >
                    {ext(file.path)}
                  </span>
                  <button
                    type="button"
                    onClick={() => open(file.id)}
                    title={file.path}
                    className="min-w-0 flex-1 truncate rounded text-left hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
                  >
                    {file.path}
                  </button>
                  {file.role === "readonly" ? (
                    <Lock className="size-3 flex-none" style={{ color: shell.textFainter }} aria-label="Read-only" />
                  ) : file.origin === "created" ? (
                    <>
                      <span className="flex flex-none items-center gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(file.id);
                            setRenameValue(file.path);
                          }}
                          aria-label={`Rename ${file.path}`}
                          className="rounded p-0.5 text-[#8b95a3] hover:text-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(file)}
                          aria-label={`Delete ${file.path}`}
                          className="rounded p-0.5 text-[#8b95a3] hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-400/60 focus-visible:outline-none"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                      <span className="flex-none text-[9.5px]" style={{ color: shell.infoText }}>
                        new
                      </span>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {creating ? (
          <div className="flex items-center gap-1 py-0.5 pr-1 pl-[22px]">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Component.tsx"
              aria-label="New file name"
              className="min-w-0 flex-1 rounded-md border border-blue-500 bg-[#0a0c10] px-[7px] py-1 font-mono text-xs text-white outline-none"
            />
            <button type="button" onClick={submitCreate} aria-label="Create file" className="rounded p-0.5 text-emerald-400 hover:bg-white/10">
              <Check className="size-3.5" />
            </button>
            <button type="button" onClick={() => setCreating(false)} aria-label="Cancel" className="rounded p-0.5 text-[#8b95a3] hover:bg-white/10">
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="flex-none px-4 py-[9px] text-[11px]"
        style={{ borderTop: "1px solid rgba(255,255,255,.05)", color: shell.textFainter }}
      >
        Editable files persist across steps
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
