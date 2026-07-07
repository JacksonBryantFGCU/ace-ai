/**
 * Renders Markdown to HTML. Currently a placeholder that only escapes HTML
 * special characters — no Markdown syntax is recognized yet.
 *
 * TODO (Step 2): support headings, bold, italic, inline code, fenced code
 * blocks, blockquotes, ordered/unordered lists, and links.
 */
export function renderMarkdown(source: string): string {
  return escapeHtml(source);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
