import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MarkdownEditor } from "../workspace/MarkdownEditor";

// Step 3's graded contract: after a toolbar insert, the textarea must keep
// (or regain) focus, with the cursor/selection landing exactly where the
// user would expect to keep typing -- not wherever the browser's default
// focus behavior happens to leave it.
afterEach(cleanup);

test("after wrapping a selection, the textarea keeps focus and selects the wrapped text", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: "hello" } });
  textarea.setSelectionRange(0, 5);

  fireEvent.click(screen.getByRole("button", { name: "Bold" }));

  expect(textarea).toHaveValue("**hello**");
  expect(textarea).toHaveFocus();
  expect(textarea.selectionStart).toBe(2);
  expect(textarea.selectionEnd).toBe(7);
});

test("inserting formatting with no selection places the cursor between the markers", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source") as HTMLTextAreaElement;
  textarea.setSelectionRange(0, 0);

  fireEvent.click(screen.getByRole("button", { name: "Italic" }));

  expect(textarea).toHaveValue("**");
  expect(textarea).toHaveFocus();
  expect(textarea.selectionStart).toBe(1);
  expect(textarea.selectionEnd).toBe(1);
});

test("a prefix-only insert (Heading) leaves the cursor after the inserted prefix, selection collapsed", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: "Section title" } });
  textarea.setSelectionRange(0, 0);

  fireEvent.click(screen.getByRole("button", { name: "Heading" }));

  expect(textarea).toHaveValue("# Section title");
  expect(textarea).toHaveFocus();
  expect(textarea.selectionStart).toBe(2);
  expect(textarea.selectionEnd).toBe(2);
});

test("a second toolbar click in a row also lands the cursor correctly", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: "hello world" } });
  textarea.setSelectionRange(0, 5); // "hello"

  fireEvent.click(screen.getByRole("button", { name: "Bold" }));
  expect(textarea).toHaveValue("**hello** world");

  textarea.setSelectionRange(10, 15); // "world"
  fireEvent.click(screen.getByRole("button", { name: "Italic" }));

  expect(textarea).toHaveValue("**hello** *world*");
  expect(textarea).toHaveFocus();
  expect(textarea.selectionStart).toBe(11);
  expect(textarea.selectionEnd).toBe(16);
});
