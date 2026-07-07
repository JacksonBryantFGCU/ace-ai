import { useState } from "react";
import type { TreeNode } from "../../workspace/types";
import { INITIAL_TREE } from "../../workspace/initialTree";
import { deleteNode, findNode, insertNode, renameNode } from "./tree";

let nextId = 100;

interface PendingCreate {
  parentId: string | null;
  type: "file" | "folder";
}

// Step 2 reference solution: adds single selection and create/rename/delete,
// all routed through the pure tree helpers so `tree` is always replaced, not
// mutated.
export function Explorer() {
  const [tree, setTree] = useState<TreeNode[]>(INITIAL_TREE);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);

  const selectedNode = selectedId ? findNode(tree, selectedId) : undefined;

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function startCreate(type: "file" | "folder") {
    const parentId = selectedNode?.type === "folder" ? selectedNode.id : null;
    if (parentId) {
      setExpanded((prev) => new Set(prev).add(parentId));
    }
    setRenamingId(null);
    setPendingCreate({ parentId, type });
  }

  function commitCreate(name: string) {
    if (!pendingCreate) return;
    const id = `node-${nextId++}`;
    const newNode: TreeNode = pendingCreate.type === "folder" ? { id, name, type: "folder", children: [] } : { id, name, type: "file" };
    setTree((prev) => insertNode(prev, pendingCreate.parentId, newNode));
    setSelectedId(id);
    setPendingCreate(null);
  }

  function startRename() {
    if (!selectedId) return;
    setPendingCreate(null);
    setRenamingId(selectedId);
  }

  function commitRename(name: string) {
    if (!renamingId) return;
    setTree((prev) => renameNode(prev, renamingId, name));
    setRenamingId(null);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setTree((prev) => deleteNode(prev, selectedId));
    setSelectedId(null);
    setRenamingId(null);
  }

  return (
    <div>
      <div role="toolbar" aria-label="File actions">
        <button type="button" onClick={() => startCreate("file")}>
          New File
        </button>
        <button type="button" onClick={() => startCreate("folder")}>
          New Folder
        </button>
        <button type="button" onClick={startRename} disabled={!selectedId}>
          Rename
        </button>
        <button type="button" onClick={deleteSelected} disabled={!selectedId}>
          Delete
        </button>
      </div>
      <div role="tree" aria-label="File Explorer">
        {tree.map((node) => (
          <TreeItemRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            selectedId={selectedId}
            renamingId={renamingId}
            pendingCreate={pendingCreate}
            onToggleExpanded={toggleExpanded}
            onSelect={setSelectedId}
            onCommitRename={commitRename}
            onCancelRename={() => setRenamingId(null)}
            onCommitCreate={commitCreate}
            onCancelCreate={() => setPendingCreate(null)}
          />
        ))}
        {pendingCreate?.parentId === null && (
          <div style={{ paddingLeft: 20 }}>
            <InlineNameInput
              ariaLabel={`New ${pendingCreate.type} name`}
              initialValue=""
              onCommit={commitCreate}
              onCancel={() => setPendingCreate(null)}
            />
          </div>
        )}
        {tree.length === 0 && <p>This folder is empty.</p>}
      </div>
    </div>
  );
}

function TreeItemRow({
  node,
  depth,
  expanded,
  selectedId,
  renamingId,
  pendingCreate,
  onToggleExpanded,
  onSelect,
  onCommitRename,
  onCancelRename,
  onCommitCreate,
  onCancelCreate,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedId: string | null;
  renamingId: string | null;
  pendingCreate: PendingCreate | null;
  onToggleExpanded: (id: string) => void;
  onSelect: (id: string) => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onCommitCreate: (name: string) => void;
  onCancelCreate: () => void;
}) {
  const isFolder = node.type === "folder";
  const isExpanded = isFolder && expanded.has(node.id);
  const isSelected = node.id === selectedId;
  const isRenaming = node.id === renamingId;

  return (
    <div>
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={isFolder ? isExpanded : undefined}
        style={{ paddingLeft: depth * 16, background: isSelected ? "#dbeafe" : undefined }}
        onClick={() => onSelect(node.id)}
      >
        {isFolder ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.id);
            }}
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span aria-hidden="true" style={{ display: "inline-block", width: 20 }} />
        )}
        {isRenaming ? (
          <InlineNameInput
            ariaLabel={`Rename ${node.name}`}
            initialValue={node.name}
            onCommit={onCommitRename}
            onCancel={onCancelRename}
          />
        ) : (
          <span>{node.name}</span>
        )}
      </div>
      {isFolder && isExpanded && (
        <div role="group">
          {(node.children ?? []).map((child) => (
            <TreeItemRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedId={selectedId}
              renamingId={renamingId}
              pendingCreate={pendingCreate}
              onToggleExpanded={onToggleExpanded}
              onSelect={onSelect}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              onCommitCreate={onCommitCreate}
              onCancelCreate={onCancelCreate}
            />
          ))}
          {pendingCreate?.parentId === node.id && (
            <div style={{ paddingLeft: (depth + 1) * 16 }}>
              <InlineNameInput
                ariaLabel={`New ${pendingCreate.type} name`}
                initialValue=""
                onCommit={onCommitCreate}
                onCancel={onCancelCreate}
              />
            </div>
          )}
          {(node.children ?? []).length === 0 && pendingCreate?.parentId !== node.id && (
            <p style={{ paddingLeft: (depth + 1) * 16 }}>This folder is empty.</p>
          )}
        </div>
      )}
    </div>
  );
}

function InlineNameInput({
  ariaLabel,
  initialValue,
  onCommit,
  onCancel,
}: {
  ariaLabel: string;
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <input
      autoFocus
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const trimmed = value.trim();
          if (trimmed) onCommit(trimmed);
        } else if (e.key === "Escape") {
          onCancel();
        }
      }}
    />
  );
}
