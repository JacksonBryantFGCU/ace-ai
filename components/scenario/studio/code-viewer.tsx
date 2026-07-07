import { Markdown } from "@/components/ui/markdown";
import { EmptyState } from "@/components/ui/empty-state";
import { FileCode } from "lucide-react";

/** Guess a fenced-code language hint from a file extension (for highlighting). */
function langOf(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "js":
      return "javascript";
    case "jsx":
      return "jsx";
    case "py":
      return "python";
    case "sql":
      return "sql";
    case "json":
      return "json";
    case "css":
      return "css";
    case "md":
      return "markdown";
    default:
      return "";
  }
}

/**
 * Read-only source viewer for authored files (starter workspace, checkpoints,
 * solutions). Reuses the app Markdown renderer's highlighted fenced-code path so
 * authored code reads with the same theme as prompts — no separate editor, and
 * nothing here is editable (authored content is immutable, frozen §4).
 */
export function CodeViewer({ path, content }: { path: string | null; content: string | null }) {
  if (!path || content == null) {
    return (
      <EmptyState icon={FileCode} title="No file selected" description="Pick a file to view its source." />
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/10 px-3 py-1.5 font-mono text-xs text-gray-400">{path}</div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <Markdown>{`\`\`\`${langOf(path)}\n${content}\n\`\`\``}</Markdown>
      </div>
    </div>
  );
}
