import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TodoApp } from "../workspace/TodoApp";

// Step 2's graded contract: a todo's completion can be toggled, its text can
// be edited inline, and the filter tabs show the right subset. None of these
// cases combine editing/toggling with an active filter that would corrupt
// state on top of one of the others — that interaction is Step 3.
afterEach(cleanup);

test("toggling a todo's checkbox updates its completion state", () => {
  render(<TodoApp />);

  const checkbox = screen.getByLabelText("Mark Fix login redirect bug complete") as HTMLInputElement;
  expect(checkbox.checked).toBe(false);

  fireEvent.click(checkbox);
  expect(checkbox.checked).toBe(true);

  fireEvent.click(checkbox);
  expect(checkbox.checked).toBe(false);
});

test("editing a todo's text saves the new text on Enter", () => {
  render(<TodoApp />);

  fireEvent.doubleClick(screen.getByText("Add dark mode toggle"));
  const editInput = screen.getByLabelText("Edit Add dark mode toggle");
  fireEvent.change(editInput, { target: { value: "Add light and dark mode toggle" } });
  fireEvent.keyDown(editInput, { key: "Enter" });

  expect(screen.getByText("Add light and dark mode toggle")).toBeInTheDocument();
  expect(screen.queryByText("Add dark mode toggle")).not.toBeInTheDocument();
});

test("editing a todo's text discards the change on Escape", () => {
  render(<TodoApp />);

  fireEvent.doubleClick(screen.getByText("Add dark mode toggle"));
  const editInput = screen.getByLabelText("Edit Add dark mode toggle");
  fireEvent.change(editInput, { target: { value: "Something else entirely" } });
  fireEvent.keyDown(editInput, { key: "Escape" });

  expect(screen.getByText("Add dark mode toggle")).toBeInTheDocument();
  expect(screen.queryByText("Something else entirely")).not.toBeInTheDocument();
});

test("filter tabs show only the matching todos", () => {
  render(<TodoApp />);

  fireEvent.click(screen.getByRole("tab", { name: "Active" }));
  expect(screen.getByText("Fix login redirect bug")).toBeInTheDocument();
  expect(screen.queryByText("Write project README")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Completed" }));
  expect(screen.getByText("Write project README")).toBeInTheDocument();
  expect(screen.queryByText("Fix login redirect bug")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "All" }));
  expect(screen.getByText("Write project README")).toBeInTheDocument();
  expect(screen.getByText("Fix login redirect bug")).toBeInTheDocument();
});
