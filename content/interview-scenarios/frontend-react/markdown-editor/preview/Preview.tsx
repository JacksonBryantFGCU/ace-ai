import * as ScenarioEntry from "scenario:entry";
import { Frame } from "./providers";
const CandidateEntry = ScenarioEntry.MarkdownEditor;

type Mode = "default" | "empty" | "large-dataset";

// "default"/"mobile" render the ACTUAL live candidate code — a single
// textarea with no preview pane yet (rendering isn't implemented). "empty"
// and "large-dataset" illustrate the TARGET two-pane layout (source +
// rendered preview) the candidate is building toward: an empty pane, and a
// realistically long document rendered with headings/emphasis/lists/code.
// Both are self-contained, deterministic, read-only mock UI.
const LONG_DOC = `# Release notes — v2.4

## Highlights

- **Faster search** — results now stream in under 100ms for most queries.
- *Dark mode* is available in Settings → Appearance.
- Fixed a bug where \`Cmd+K\` didn't open the command palette on Safari.

## Upgrade notes

> If you're on a self-hosted instance, run the migration before upgrading.

1. Back up your database.
2. Run \`npm run migrate\`.
3. Restart the service.

See the [full changelog](#) for details.`;

export default function Preview(props: { mode?: Mode; theme?: "light" | "dark" }) {
  const mode = props.mode ?? "default";
  return (
    <Frame theme={props.theme}>
      {mode === "default" ? <CandidateEntry /> : <IllustrativeEditor source={mode === "large-dataset" ? LONG_DOC : ""} />}
    </Frame>
  );
}

/** A tiny, deterministic renderer for the illustrative preview only — NOT the
 *  candidate's `renderMarkdown` (that's the very function under test, and
 *  it's still a stub). This exists purely to demonstrate what the target
 *  split-pane UI looks like once rendering works. */
function renderIllustrative(source: string): string {
  const lines = source.split("\n");
  const html: string[] = [];
  let inList = false;
  for (const line of lines) {
    if (line.startsWith("## ")) html.push(`<h3>${line.slice(3)}</h3>`);
    else if (line.startsWith("# ")) html.push(`<h2>${line.slice(2)}</h2>`);
    else if (line.startsWith("> ")) html.push(`<blockquote>${line.slice(2)}</blockquote>`);
    else if (/^\d+\.\s/.test(line)) html.push(`<div>${line}</div>`);
    else if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${line.slice(2).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>")}</li>`);
      continue;
    } else if (line.trim() === "") {
      html.push("<br/>");
    } else {
      html.push(`<p>${line.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>")}</p>`);
    }
    if (inList && !line.startsWith("- ")) {
      html.push("</ul>");
      inList = false;
    }
  }
  return html.join("");
}

function IllustrativeEditor({ source }: { source: string }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <textarea
        value={source}
        onChange={() => {}}
        aria-label="Markdown source"
        rows={14}
        readOnly
        style={{ flex: 1, fontFamily: "monospace" }}
      />
      <div aria-label="Rendered preview" style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        {source.trim() === "" ? (
          <p style={{ color: "#9ca3af" }}>Nothing to preview yet — start typing on the left.</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderIllustrative(source) }} />
        )}
      </div>
    </div>
  );
}
