import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TransactionsTable } from "../workspace/TransactionsTable";

// Step 1's graded contract: client-side pagination over the filtered rows — one
// page's worth of rows at a time, a "Page X of Y" indicator, and Previous/Next
// controls that disable at the ends. Everything here asserts observable output
// (which rows render, which controls are disabled), so any reasonable pagination
// implementation passes — the exact state shape is up to the candidate.
afterEach(cleanup);

const next = () => screen.getByRole("button", { name: /next/i });
const prev = () => screen.getByRole("button", { name: /previous/i });

test("shows only the first page of rows, with Previous disabled at the start", () => {
  render(<TransactionsTable />);

  // A first-page row is shown; a second-page row is not rendered yet.
  expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.queryByText("Ivy Chen")).not.toBeInTheDocument();

  expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  expect(prev()).toBeDisabled();
  expect(next()).toBeEnabled();
});

test("Next and Previous move between pages", () => {
  render(<TransactionsTable />);

  fireEvent.click(next());
  expect(screen.getByText("Ivy Chen")).toBeInTheDocument();
  expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();

  fireEvent.click(prev());
  expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
});

test("Next is disabled on the last page", () => {
  render(<TransactionsTable />);

  fireEvent.click(next());
  fireEvent.click(next());
  expect(screen.getByText("Quinn Rivera")).toBeInTheDocument(); // a last-page row
  expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument();
  expect(next()).toBeDisabled();
});
