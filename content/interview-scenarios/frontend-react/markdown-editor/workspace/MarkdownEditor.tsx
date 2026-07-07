import { useState } from "react";

// A markdown editor. The textarea is controlled, but there's no preview yet.
//
// TODO (Step 1): render a live preview beside the editor that mirrors what's
// typed, using `renderMarkdown` from `markdown.ts`.
export function MarkdownEditor() {
  const [source, setSource] = useState("");

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        aria-label="Markdown source"
        rows={12}
        style={{ flex: 1, fontFamily: "monospace" }}
      />
    </div>
  );
}
