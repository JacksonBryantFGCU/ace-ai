export type NodeType = "file" | "folder";

export interface TreeNode {
  id: string;
  name: string;
  type: NodeType;
  children?: TreeNode[];
}
