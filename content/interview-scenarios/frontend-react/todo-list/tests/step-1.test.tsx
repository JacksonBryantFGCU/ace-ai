import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TodoApp } from "../workspace/TodoApp";

// Step 1's graded contract: adding a todo through the controlled input and
// deleting a todo both work. Everything here asserts observable output (what
// text appears, what disappears), so any reasonable state shape passes.
afterEach(cleanup);

test("adding a todo appears in the list and clears the input", () => {
  render(<TodoApp />);

  const input = screen.getByLabelText("New todo");
  fireEvent.change(input, { target: { value: "Buy milk" } });
  fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

  expect(screen.getByText("Buy milk")).toBeInTheDocument();
  expect(input).toHaveValue("");
});

test("submitting an empty todo does not add a blank item", () => {
  render(<TodoApp />);
  const before = screen.getAllByRole("listitem").length;

  fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

  expect(screen.getAllByRole("listitem")).toHaveLength(before);
});

test("deleting a todo removes only that todo", () => {
  render(<TodoApp />);

  expect(screen.getByText("Fix login redirect bug")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /delete fix login redirect bug/i }));

  expect(screen.queryByText("Fix login redirect bug")).not.toBeInTheDocument();
  expect(screen.getByText("Write project README")).toBeInTheDocument();
  expect(screen.getByText("Add dark mode toggle")).toBeInTheDocument();
});
