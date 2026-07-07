import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TransactionsTable } from "../workspace/TransactionsTable";

// Step 2's graded contract: the current page must stay valid when the active
// filter changes how many rows (and pages) exist. Paging to a later page and then
// narrowing the filter must NOT leave the table on a now-nonexistent page. This
// asserts the observable outcome only — clamping the page or resetting it on filter
// change both satisfy it.
afterEach(cleanup);

const next = () => screen.getByRole("button", { name: /next/i });
const filter = () => screen.getByRole("combobox");

test("does not go blank when a filter shrinks the list after paging to a later page", () => {
  render(<TransactionsTable />);

  // Page to the last page under "All"...
  fireEvent.click(next());
  fireEvent.click(next());
  expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument();

  // ...then switch to a filter with only a single page of results.
  fireEvent.change(filter(), { target: { value: "overdue" } });

  // The table shows the filtered rows on a valid page, not an empty window.
  expect(screen.getByText("Zed Miller")).toBeInTheDocument(); // an overdue customer
  expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
});

test("clamps back into range so Previous is disabled after the filter shrinks", () => {
  render(<TransactionsTable />);

  fireEvent.click(next());
  fireEvent.click(next());
  fireEvent.change(filter(), { target: { value: "overdue" } });

  expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
});
