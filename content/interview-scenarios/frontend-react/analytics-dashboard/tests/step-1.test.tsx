import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { Dashboard } from "../workspace/Dashboard";

// Step 1's graded contract: the raw events render in a table (already given)
// and the basic metrics -- total events, unique users, events by type -- are
// computed correctly from the full, unfiltered dataset.
afterEach(cleanup);

test("renders every event as a table row", () => {
  render(<Dashboard />);
  expect(screen.getAllByRole("row")).toHaveLength(14); // 13 events + header row
  expect(screen.getAllByText("u1")).toHaveLength(3); // u1 appears on 3 events
  expect(screen.getByText("u4")).toBeInTheDocument();
});

test("shows the total event count and unique user count for the full dataset", () => {
  render(<Dashboard />);
  const metrics = screen.getByRole("region", { name: "Metrics" });
  expect(within(metrics).getByText(/Total events:\s*13/)).toBeInTheDocument();
  expect(within(metrics).getByText(/Unique users:\s*6/)).toBeInTheDocument();
});

test("shows the correct count for each event type", () => {
  render(<Dashboard />);
  const metrics = screen.getByRole("region", { name: "Metrics" });
  expect(within(metrics).getByText(/Clicks:\s*3/)).toBeInTheDocument();
  expect(within(metrics).getByText(/Purchases:\s*3/)).toBeInTheDocument();
  expect(within(metrics).getByText(/Signups:\s*4/)).toBeInTheDocument();
  expect(within(metrics).getByText(/Views:\s*3/)).toBeInTheDocument();
});
