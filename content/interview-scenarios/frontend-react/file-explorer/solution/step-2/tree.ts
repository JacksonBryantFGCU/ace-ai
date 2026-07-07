import type { TreeNode } from "../../workspace/types";

// Given, unchanged across every step.
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

// Step 2 reference solution: recurses into every folder so a node can be
// inserted at any depth, not just at the top level.
export function insertNode(tree: TreeNode[], parentId: string | null, newNode: TreeNode): TreeNode[] {
  if (parentId === null) {
    return [...tree, newNode];
  }
  return tree.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children ?? []), newNode] };
    }
    if (node.children) {
      return { ...node, children: insertNode(node.children, parentId, newNode) };
    }
    return node;
  });
}

// Step 2 reference solution: recurses into every folder so a node can be
// renamed at any depth.
export function renameNode(tree: TreeNode[], id: string, name: string): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) {
      return { ...node, name };
    }
    if (node.children) {
      return { ...node, children: renameNode(node.children, id, name) };
    }
    return node;
  });
}

// Step 2 reference solution: removes a node by id. This only filters the
// top-level list -- a reasonable first pass that works for the common case
// (deleting something you can see at the root) but never looks inside any
// folder's children, so deleting a nested node silently does nothing. Fixed
// in Step 3.
export function deleteNode(tree: TreeNode[], id: string): TreeNode[] {
  return tree.filter((node) => node.id !== id);
}
