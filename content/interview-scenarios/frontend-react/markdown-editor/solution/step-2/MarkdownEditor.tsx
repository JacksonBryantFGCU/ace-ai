import { useRef, useState } from "react";
import { renderMarkdown } from "../../workspace/markdown";

// Step 2 reference solution: the preview now renders real formatted HTML
// (via the Step 2 parser), and a toolbar inserts Markdown syntax around the
// current textarea selection.
//
// `insertAroundSelection` reads the selection, computes the new source, and
// calls `setSource` -- but never returns focus or the selection to the
// textarea afterward. Clicking a toolbar button moves focus to the button,
// so the insert is correct in the VALUE but the user's cursor is left
// nowhere useful. Step 3 fixes this.
export function MarkdownEditor() {
  const [source, setSource] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertAroundSelection(prefix: string, suffix: string = prefix) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const before = source.slice(0, selectionStart);
    const selected = source.slice(selectionStart, selectionEnd);
    const after = source.slice(selectionEnd);
    setSource(`${before}${prefix}${selected}${suffix}${after}`);
  }

  return (
    <div>
      <div role="toolbar" aria-label="Formatting">
        <button type="button" onClick={() => insertAroundSelection("**")}>
          Bold
        </button>
        <button type="button" onClick={() => insertAroundSelection("*")}>
          Italic
        </button>
        <button type="button" onClick={() => insertAroundSelection("# ", "")}>
          Heading
        </button>
        <button type="button" onClick={() => insertAroundSelection("> ", "")}>
          Quote
        </button>
        <button type="button" onClick={() => insertAroundSelection("```\n", "\n```")}>
          Code Block
        </button>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <textarea
          ref={textareaRef}
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
    </div>
  );
}
