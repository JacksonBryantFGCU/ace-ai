import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MarkdownEditor } from "../workspace/MarkdownEditor";

// Step 1's graded contract: the textarea is a controlled component, and a
// preview pane mirrors its content live, with no separate refresh action.
// Markdown formatting doesn't exist yet at this checkpoint — only escaping —
// so the preview is asserted on visible text, not structure.
afterEach(cleanup);

test("typing in the editor updates the controlled textarea's value", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source");

  fireEvent.change(textarea, { target: { value: "Hello world" } });

  expect(textarea).toHaveValue("Hello world");
});

test("the preview mirrors the typed content live, with no refresh step", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source");

  fireEvent.change(textarea, { target: { value: "Hello world" } });
  expect(screen.getByRole("region", { name: "Preview" })).toHaveTextContent("Hello world");

  fireEvent.change(textarea, { target: { value: "Hello world, updated" } });
  expect(screen.getByRole("region", { name: "Preview" })).toHaveTextContent("Hello world, updated");
});

test("HTML-looking input is shown as text in the preview, not rendered as live markup", () => {
  render(<MarkdownEditor />);
  const textarea = screen.getByLabelText("Markdown source");

  fireEvent.change(textarea, { target: { value: "<strong>not bold yet</strong>" } });

  const preview = screen.getByRole("region", { name: "Preview" });
  expect(preview.querySelector("strong")).not.toBeInTheDocument();
  expect(preview).toHaveTextContent("<strong>not bold yet</strong>");
});
