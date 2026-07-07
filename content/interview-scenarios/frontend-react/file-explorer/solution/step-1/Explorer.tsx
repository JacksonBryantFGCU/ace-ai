import { useState } from "react";
import type { TreeNode } from "../../workspace/types";
import { INITIAL_TREE } from "../../workspace/initialTree";

// Step 1 reference solution: every folder's children render recursively, to
// unlimited depth, and a folder can be expanded or collapsed. Selection and
// file operations are Step 2 work.
export function Explorer() {
  const [tree] = useState<TreeNode[]>(INITIAL_TREE);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  return (
    <div>
      <div role="tree" aria-label="File Explorer">
        {tree.map((node) => (
          <TreeItemRow key={node.id} node={node} depth={0} expanded={expanded} onToggleExpanded={toggleExpanded} />
        ))}
      </div>
    </div>
  );
}

function TreeItemRow({
  node,
  depth,
  expanded,
  onToggleExpanded,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggleExpanded: (id: string) => void;
}) {
  const isFolder = node.type === "folder";
  const isExpanded = isFolder && expanded.has(node.id);

  return (
    <div>
      <div role="treeitem" aria-expanded={isFolder ? isExpanded : undefined} style={{ paddingLeft: depth * 16 }}>
        {isFolder ? (
          <button
            type="button"
            onClick={() => onToggleExpanded(node.id)}
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span aria-hidden="true" style={{ display: "inline-block", width: 20 }} />
        )}
        <span>{node.name}</span>
      </div>
      {isFolder && isExpanded && node.children && node.children.length > 0 && (
        <div role="group">
          {node.children.map((child) => (
            <TreeItemRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
