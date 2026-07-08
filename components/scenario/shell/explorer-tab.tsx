"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, FilePlus2, Folder, FolderOpen, Lock, Pencil, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { shell } from "@/components/scenario/shell/tokens";
import type { ScenarioSessionApi } from "@/hooks/use-scenario-session";
import type { SessionFile } from "@/lib/scenarios/types";

const ext = (path: string) => (path.split(".").pop() || "").toUpperCase();

type TreeNode = FolderNode | FileNode;

interface FolderNode {
  kind: "folder";
  id: string;
  name: string;
  path: string;
  children: TreeNode[];
}

interface FileNode {
  kind: "file";
  file: SessionFile;
}

/**
 * The Explorer panel tab: the session's files as a collapsible path tree with
 * editable work surfaced first and locked reference files below it.
 */
export function ExplorerTab({ api }: { api: ScenarioSessionApi }) {
  const { session, open, create, rename, remove } = api;
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SessionFile | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [lockedCollapsed, setLockedCollapsed] = useState(true);

  const editableFiles = useMemo(() => session.files.filter((file) => file.role !== "readonly"), [session.files]);
  const lockedFiles = useMemo(() => session.files.filter((file) => file.role === "readonly"), [session.files]);
  const editableTree = useMemo(() => buildTree(editableFiles), [editableFiles]);
  const lockedTree = useMemo(() => buildTree(lockedFiles), [lockedFiles]);
  const visibleExpandedFolders = useMemo(() => {
    const active = session.files.find((file) => file.id === session.activeFileId);
    if (!active) return expandedFolders;
    return new Set([...expandedFolders, ...ancestorFolderPaths(active.path)]);
  }, [expandedFolders, session.activeFileId, session.files]);

  const submitCreate = () => {
    if (create(newName.trim())) {
      setNewName("");
      setCreating(false);
    }
  };

  const submitRename = () => {
    if (renamingId && rename(renamingId, renameValue.trim())) setRenamingId(null);
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center justify-between px-2.5 pt-2 pb-1">
        <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: shell.textFaint }}>
          Files
        </span>
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
              placeholder="components/Component.tsx"
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

        <SectionLabel label="Files to edit" count={editableFiles.length} />
        {editableTree.length > 0 ? (
          <ul>
            {editableTree.map((node) => (
              <TreeRow
                key={node.kind === "folder" ? node.path : node.file.id}
                node={node}
                depth={0}
                activeFileId={session.activeFileId}
                renamingId={renamingId}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                submitRename={submitRename}
                cancelRename={() => setRenamingId(null)}
                open={open}
                startRename={(file) => {
                  setRenamingId(file.id);
                  setRenameValue(file.path);
                }}
                setPendingDelete={setPendingDelete}
                expandedFolders={visibleExpandedFolders}
                onToggleFolder={toggleFolder}
              />
            ))}
          </ul>
        ) : (
          <EmptyState label="No editable files" />
        )}

        <button
          type="button"
          onClick={() => setLockedCollapsed((collapsed) => !collapsed)}
          aria-expanded={!lockedCollapsed}
          className="mt-3 flex w-full items-center gap-1 rounded-[7px] px-1.5 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.13em] transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
          style={{ color: shell.textFaint }}
        >
          {lockedCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          <span>Locked files</span>
          <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[#8b95a3]">{lockedFiles.length}</span>
        </button>
        {!lockedCollapsed ? (
          lockedTree.length > 0 ? (
            <ul className="mt-1">
              {lockedTree.map((node) => (
                <TreeRow
                  key={node.kind === "folder" ? node.path : node.file.id}
                  node={node}
                  depth={0}
                  activeFileId={session.activeFileId}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  submitRename={submitRename}
                  cancelRename={() => setRenamingId(null)}
                  open={open}
                  startRename={(file) => {
                    setRenamingId(file.id);
                    setRenameValue(file.path);
                  }}
                  setPendingDelete={setPendingDelete}
                  expandedFolders={visibleExpandedFolders}
                  onToggleFolder={toggleFolder}
                  muted
                />
              ))}
            </ul>
          ) : (
            <EmptyState label="No locked files" className="mt-1" />
          )
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

function TreeRow({
  node,
  depth,
  activeFileId,
  renamingId,
  renameValue,
  setRenameValue,
  submitRename,
  cancelRename,
  open,
  startRename,
  setPendingDelete,
  expandedFolders,
  onToggleFolder,
  muted = false,
}: {
  node: TreeNode;
  depth: number;
  activeFileId: string | null;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (value: string) => void;
  submitRename: () => void;
  cancelRename: () => void;
  open: (id: string) => void;
  startRename: (file: SessionFile) => void;
  setPendingDelete: (file: SessionFile) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (folderPath: string) => void;
  muted?: boolean;
}) {
  if (node.kind === "folder") {
    const expanded = expandedFolders.has(node.path);
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggleFolder(node.path)}
          aria-label={expanded ? `Collapse ${node.path}` : `Expand ${node.path}`}
          aria-expanded={expanded}
          className="flex w-full items-center gap-1 rounded-[7px] py-[5px] pr-2 text-left text-[12.5px] transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
          style={{ paddingLeft: 8 + depth * 14, color: muted ? shell.textFaint : shell.text }}
        >
          {expanded ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
          {expanded ? (
            <FolderOpen className="size-3.5 shrink-0" style={{ color: shell.aiAccent }} />
          ) : (
            <Folder className="size-3.5 shrink-0" style={{ color: shell.aiAccent }} />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {expanded ? (
          <ul>
            {node.children.map((child) => (
              <TreeRow
                key={child.kind === "folder" ? child.path : child.file.id}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                renamingId={renamingId}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                submitRename={submitRename}
                cancelRename={cancelRename}
                open={open}
                startRename={startRename}
                setPendingDelete={setPendingDelete}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                muted={muted}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  const file = node.file;
  const isActive = file.id === activeFileId;
  const isRenaming = file.id === renamingId;

  if (isRenaming) {
    return (
      <li className="flex items-center gap-1 py-0.5 pr-1" style={{ paddingLeft: 22 + depth * 14 }}>
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitRename();
            if (e.key === "Escape") cancelRename();
          }}
          aria-label={`Rename ${file.path}`}
          className="min-w-0 flex-1 rounded-md border border-blue-500 bg-[#0a0c10] px-[7px] py-1 font-mono text-xs text-white outline-none"
        />
        <button type="button" onClick={submitRename} aria-label="Save name" className="rounded p-0.5 text-emerald-400 hover:bg-white/10">
          <Check className="size-3.5" />
        </button>
        <button type="button" onClick={cancelRename} aria-label="Cancel rename" className="rounded p-0.5 text-[#8b95a3] hover:bg-white/10">
          <X className="size-3.5" />
        </button>
      </li>
    );
  }

  return (
    <li className="group">
      <div
        className="flex items-center gap-2 rounded-[7px] py-[5px] pr-2 text-[12.5px] transition-colors"
        style={{
          paddingLeft: 22 + depth * 14,
          background: isActive ? "rgba(255,255,255,.08)" : "transparent",
          color: isActive ? "#ffffff" : muted ? shell.textFaint : shell.text,
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
          {leafName(file.path)}
        </button>
        {file.role === "readonly" ? (
          <Lock className="size-3 flex-none" style={{ color: shell.textFainter }} aria-label="Read-only" />
        ) : file.origin === "created" ? (
          <>
            <span className="flex flex-none items-center gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => startRename(file)}
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
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-1 flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: shell.textFaint }}>
      <span>{label}</span>
      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[#8b95a3]">{count}</span>
    </div>
  );
}

function EmptyState({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`rounded-[7px] px-2 py-2 text-[12px] ${className}`.trim()} style={{ color: shell.textFainter }}>
      {label}
    </div>
  );
}

function buildTree(files: SessionFile[]): TreeNode[] {
  const roots: FolderNode[] = [];
  const folderMap = new Map<string, FolderNode>();

  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = file.path.split("/");
    let children = roots as TreeNode[];
    let currentPath = "";

    for (const segment of parts.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let folder = folderMap.get(currentPath);
      if (!folder) {
        folder = {
          kind: "folder",
          id: `folder:${currentPath}`,
          name: segment,
          path: currentPath,
          children: [],
        };
        folderMap.set(currentPath, folder);
        children.push(folder);
      }
      children = folder.children;
    }

    children.push({ kind: "file", file });
  }

  return sortNodes(roots);
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return [...nodes]
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      const aName = a.kind === "folder" ? a.name : leafName(a.file.path);
      const bName = b.kind === "folder" ? b.name : leafName(b.file.path);
      return aName.localeCompare(bName);
    })
    .map((node) => (node.kind === "folder" ? { ...node, children: sortNodes(node.children) } : node));
}

function leafName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function ancestorFolderPaths(path: string): string[] {
  const parts = path.split("/");
  const ancestors: string[] = [];
  let current = "";
  for (const segment of parts.slice(0, -1)) {
    current = current ? `${current}/${segment}` : segment;
    ancestors.push(current);
  }
  return ancestors;
}
