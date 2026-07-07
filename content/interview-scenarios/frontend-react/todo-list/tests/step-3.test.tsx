import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TodoApp } from "../workspace/TodoApp";

// Step 3's graded contract: deleting a todo while a filter narrows the view
// must remove the todo that was actually clicked — not whatever sits at that
// position in the full, unfiltered list. This asserts observable outcome
// only (which todos remain, under which filter), so any fix that keys off
// the todo's identity rather than its on-screen position satisfies it.
afterEach(cleanup);

test("deleting a todo while filtered removes the clicked todo and nothing else", () => {
  render(<TodoApp />);

  fireEvent.click(screen.getByRole("tab", { name: "Active" }));
  // "Fix login redirect bug" is the FIRST todo shown under Active, but it is
  // NOT the first todo overall — "Write project README" and "Set up CI
  // pipeline" (both completed) sit ahead of it in the full list.
  expect(screen.getByText("Fix login redirect bug")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /delete fix login redirect bug/i }));

  expect(screen.queryByText("Fix login redirect bug")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "All" }));
  expect(screen.getByText("Write project README")).toBeInTheDocument();
  expect(screen.getByText("Set up CI pipeline")).toBeInTheDocument();
  expect(screen.getByText("Add dark mode toggle")).toBeInTheDocument();
  expect(screen.getByText("Review pull request #42")).toBeInTheDocument();
  expect(screen.queryByText("Fix login redirect bug")).not.toBeInTheDocument();
});

test("deleting a middle todo under a filter still removes the right one", () => {
  render(<TodoApp />);

  fireEvent.click(screen.getByRole("tab", { name: "Active" }));
  // "Add dark mode toggle" is the SECOND todo shown under Active (position 1
  // in the filtered list), but it is the FOURTH todo overall (position 3 in
  // the full list) — a naive position-based delete would remove whatever
  // sits at position 1 in the full list instead ("Set up CI pipeline").
  fireEvent.click(screen.getByRole("button", { name: /delete add dark mode toggle/i }));

  expect(screen.queryByText("Add dark mode toggle")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "All" }));
  expect(screen.getByText("Write project README")).toBeInTheDocument();
  expect(screen.getByText("Set up CI pipeline")).toBeInTheDocument();
  expect(screen.getByText("Fix login redirect bug")).toBeInTheDocument();
  expect(screen.getByText("Review pull request #42")).toBeInTheDocument();
});
