import { useState } from "react";
import type { TreeNode } from "./types";
import { INITIAL_TREE } from "./initialTree";

// A VS Code-style file explorer. Only the top level renders so far, and
// nothing can be expanded, selected, or edited yet.
//
// TODO (Step 1): render every folder's children recursively, to unlimited
// depth, and let a folder be expanded and collapsed.
export function Explorer() {
  const [tree] = useState<TreeNode[]>(INITIAL_TREE);

  return (
    <div>
      <div role="tree" aria-label="File Explorer">
        {tree.map((node) => (
          <div key={node.id} role="treeitem">
            {node.name}
          </div>
        ))}
      </div>
    </div>
  );
}
