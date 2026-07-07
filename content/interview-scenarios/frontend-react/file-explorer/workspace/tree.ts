import type { TreeNode } from "./types";

// Given, unchanged across every step: looks up a node anywhere in the tree
// by id, recursing into every folder's children regardless of depth.
export function findNode(tree: TreeNode[], id: string): TreeNode | undefined {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

// Step 2: return a new tree with `newNode` appended to the children of the
// folder identified by `parentId` (or appended at the top level if
// `parentId` is null). Do not mutate `tree` or any node in it.
export function insertNode(tree: TreeNode[], parentId: string | null, newNode: TreeNode): TreeNode[] {
  throw new Error("not implemented");
}

// Step 2: return a new tree with the node identified by `id` renamed to
// `name`, wherever it sits in the tree. Do not mutate `tree` or any node.
export function renameNode(tree: TreeNode[], id: string, name: string): TreeNode[] {
  throw new Error("not implemented");
}

// Step 2: return a new tree with the node identified by `id` removed,
// wherever it sits in the tree. Do not mutate `tree` or any node.
export function deleteNode(tree: TreeNode[], id: string): TreeNode[] {
  throw new Error("not implemented");
}
