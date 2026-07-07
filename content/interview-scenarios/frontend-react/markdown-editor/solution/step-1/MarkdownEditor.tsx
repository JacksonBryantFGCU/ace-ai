import { useState } from "react";
import { renderMarkdown } from "../../workspace/markdown";

// Step 1 reference solution: a live preview pane renders alongside the
// editor. `renderMarkdown` is still the Step 1 placeholder (HTML-escape
// only), so the preview mirrors the typed text verbatim — no separate
// refresh step, no debounce, just the same `source` state driving both
// panes on every render.
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
      <section
        aria-label="Preview"
        style={{ flex: 1 }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
      />
    </div>
  );
}
