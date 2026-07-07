import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "../../workspace/markdown";

// Step 3 reference solution: `insertAroundSelection` now also records where
// the selection SHOULD end up, and an effect -- which runs after the DOM
// value has actually updated -- refocuses the textarea and restores that
// selection. Clicking a toolbar button now leaves the cursor exactly where
// a user would expect: right after (or around) what was just inserted.
export function MarkdownEditor() {
  const [source, setSource] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (!pendingSelection || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(pendingSelection.start, pendingSelection.end);
    setPendingSelection(null);
  }, [pendingSelection, source]);

  function insertAroundSelection(prefix: string, suffix: string = prefix) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const before = source.slice(0, selectionStart);
    const selected = source.slice(selectionStart, selectionEnd);
    const after = source.slice(selectionEnd);
    setSource(`${before}${prefix}${selected}${suffix}${after}`);
    setPendingSelection({
      start: selectionStart + prefix.length,
      end: selectionStart + prefix.length + selected.length,
    });
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
