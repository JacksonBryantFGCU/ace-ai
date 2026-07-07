import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MarkdownEditor } from "../workspace/MarkdownEditor";

// Step 2's graded contract: the preview renders real structured HTML for
// headings, bold, italic, inline code, fenced code blocks, blockquotes,
// lists, and links, and the toolbar buttons insert the right syntax around
// the selection. Cursor/focus behavior after a toolbar insert is Step 3's
// concern, not asserted here.
afterEach(cleanup);

function setSource(text: string) {
  fireEvent.change(screen.getByLabelText("Markdown source"), { target: { value: text } });
}

function preview() {
  return screen.getByRole("region", { name: "Preview" });
}

test("renders a heading", () => {
  render(<MarkdownEditor />);
  setSource("# Hello");
  expect(preview().querySelector("h1")).toHaveTextContent("Hello");
});

test("renders bold and italic text", () => {
  render(<MarkdownEditor />);
  setSource("**bold** and *italic*");
  expect(preview().querySelector("strong")).toHaveTextContent("bold");
  expect(preview().querySelector("em")).toHaveTextContent("italic");
});

test("renders inline code", () => {
  render(<MarkdownEditor />);
  setSource("Use `npm install`");
  expect(preview().querySelector("code")).toHaveTextContent("npm install");
});

test("renders a fenced code block verbatim, without inline formatting applied inside it", () => {
  render(<MarkdownEditor />);
  setSource("```\nconst x = 1;\n*not italic*\n```");
  const block = preview().querySelector("pre code");
  expect(block).not.toBeNull();
  expect(block).toHaveTextContent("const x = 1;");
  expect(block!.innerHTML).not.toContain("<em>");
});

test("renders a blockquote", () => {
  render(<MarkdownEditor />);
  setSource("> A quote");
  expect(preview().querySelector("blockquote")).toHaveTextContent("A quote");
});

test("renders unordered and ordered lists", () => {
  render(<MarkdownEditor />);

  setSource("- one\n- two");
  expect(preview().querySelectorAll("ul li")).toHaveLength(2);

  setSource("1. first\n2. second");
  expect(preview().querySelectorAll("ol li")).toHaveLength(2);
});

test("renders a link", () => {
  render(<MarkdownEditor />);
  setSource("[ACE.AI](https://example.com)");
  const link = preview().querySelector("a");
  expect(link).toHaveAttribute("href", "https://example.com");
  expect(link).toHaveTextContent("ACE.AI");
});

test("the Bold toolbar button wraps the selected text in ** markers", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: "hello" } });
  textarea.setSelectionRange(0, 5);

  fireEvent.click(screen.getByRole("button", { name: "Bold" }));

  expect(textarea).toHaveValue("**hello**");
});

test("the Heading toolbar button prefixes the selection with '# '", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: "Section title" } });
  textarea.setSelectionRange(0, 0);

  fireEvent.click(screen.getByRole("button", { name: "Heading" }));

  expect(textarea).toHaveValue("# Section title");
});

test("the Code Block toolbar button fences the selection on its own lines", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: "const x = 1;" } });
  textarea.setSelectionRange(0, 13);

  fireEvent.click(screen.getByRole("button", { name: "Code Block" }));

  expect(textarea).toHaveValue("```\nconst x = 1;\n```");
});
