import * as ScenarioEntry from "scenario:entry";
import { Frame } from "./providers";
const CandidateEntry = ScenarioEntry.Explorer;

type Mode = "default" | "empty" | "large-dataset";

interface PreviewNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: PreviewNode[];
}

// "default"/"mobile" render the ACTUAL live candidate code — only the top
// level renders flat so far (recursive expand/collapse isn't implemented).
// "empty" illustrates a project with nothing in it; "large-dataset"
// illustrates a deep, expanded, realistic project tree — the target UI the
// candidate is building toward. Both are self-contained, deterministic,
// read-only mock UI.
function largeTree(): PreviewNode[] {
  const srcFiles = ["index.ts", "App.tsx", "router.ts"];
  const componentFiles = ["Button.tsx", "Card.tsx", "Modal.tsx", "Table.tsx", "Tooltip.tsx", "Avatar.tsx"];
  const hookFiles = ["useAuth.ts", "useDebounce.ts", "useFetch.ts", "usePagination.ts"];
  return [
    {
      id: "src",
      name: "src",
      type: "folder",
      children: [
        ...srcFiles.map((f, i) => ({ id: `src-${i}`, name: f, type: "file" as const })),
        {
          id: "components",
          name: "components",
          type: "folder",
          children: componentFiles.map((f, i) => ({ id: `comp-${i}`, name: f, type: "file" as const })),
        },
        {
          id: "hooks",
          name: "hooks",
          type: "folder",
          children: hookFiles.map((f, i) => ({ id: `hook-${i}`, name: f, type: "file" as const })),
        },
      ],
    },
    { id: "public", name: "public", type: "folder", children: [{ id: "favicon", name: "favicon.ico", type: "file" }] },
    { id: "readme", name: "README.md", type: "file" },
    { id: "package-json", name: "package.json", type: "file" },
    { id: "tsconfig", name: "tsconfig.json", type: "file" },
  ];
}

export default function Preview(props: { mode?: Mode; theme?: "light" | "dark" }) {
  const mode = props.mode ?? "default";
  return (
    <Frame theme={props.theme}>
      {mode === "default" ? <CandidateEntry /> : <IllustrativeExplorer tree={mode === "empty" ? [] : largeTree()} />}
    </Frame>
  );
}

function NodeRow({ node, depth }: { node: PreviewNode; depth: number }) {
  const isFolder = node.type === "folder";
  return (
    <div>
      <div
        role="treeitem"
        aria-label={node.name}
        aria-selected={false}
        style={{ paddingLeft: depth * 16, padding: "3px 0" }}
      >
        {isFolder ? "📁" : "📄"} {node.name}
      </div>
      {isFolder && node.children?.map((child) => <NodeRow key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}

function IllustrativeExplorer({ tree }: { tree: PreviewNode[] }) {
  return (
    <div role="tree" aria-label="File Explorer">
      {tree.length === 0 ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>This project is empty.</p>
      ) : (
        tree.map((node) => <NodeRow key={node.id} node={node} depth={0} />)
      )}
    </div>
  );
}
