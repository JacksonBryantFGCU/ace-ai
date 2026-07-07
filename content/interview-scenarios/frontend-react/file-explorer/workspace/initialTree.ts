import type { TreeNode } from "./types";

// A small project tree. Two files are both named "index.ts" at different
// depths, and "assets" is an empty folder — both are deliberate: tree
// operations must key nodes by `id`, never by name or position, and must
// handle folders with no children.
export const INITIAL_TREE: TreeNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      { id: "src-index", name: "index.ts", type: "file" },
      {
        id: "src-components",
        name: "components",
        type: "folder",
        children: [
          { id: "components-button", name: "Button.tsx", type: "file" },
          { id: "components-card", name: "Card.tsx", type: "file" },
        ],
      },
      {
        id: "src-utils",
        name: "utils",
        type: "folder",
        children: [{ id: "utils-index", name: "index.ts", type: "file" }],
      },
    ],
  },
  {
    id: "public",
    name: "public",
    type: "folder",
    children: [{ id: "public-favicon", name: "favicon.ico", type: "file" }],
  },
  {
    id: "assets",
    name: "assets",
    type: "folder",
    children: [],
  },
  { id: "readme", name: "README.md", type: "file" },
  { id: "package-json", name: "package.json", type: "file" },
];
