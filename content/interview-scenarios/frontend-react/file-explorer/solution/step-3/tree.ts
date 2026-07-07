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

// Unchanged from Step 2.
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

// Unchanged from Step 2.
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

// Step 3 reference solution: the Step 2 version only filtered the top-level
// list. Fixed by also recursing into every remaining node's children, so a
// node is removed no matter how deep it sits.
export function deleteNode(tree: TreeNode[], id: string): TreeNode[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => (node.children ? { ...node, children: deleteNode(node.children, id) } : node));
}
