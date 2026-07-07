import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { Dashboard } from "../workspace/Dashboard";

// Step 3's graded contract: changing a filter control must immediately
// update the rendered metrics and table -- not just the control's own
// value. This is exactly the case a stale memoization dependency breaks, so
// these are the first tests in the scenario that change a filter and then
// assert on the METRICS, rather than the control.
afterEach(cleanup);

function metrics() {
  return screen.getByRole("region", { name: "Metrics" });
}

test("switching the date range to the last 24 hours updates every metric", () => {
  render(<Dashboard />);

  fireEvent.change(screen.getByLabelText("Date range"), { target: { value: "24h" } });

  expect(within(metrics()).getByText(/Total events:\s*4/)).toBeInTheDocument();
  expect(within(metrics()).getByText(/Unique users:\s*2/)).toBeInTheDocument();
  expect(within(metrics()).getByText(/Conversion rate:\s*100%/)).toBeInTheDocument();
  expect(within(metrics()).getByText(/Total revenue:\s*\$49\.99/)).toBeInTheDocument();
});

test("deselecting event types down to just Purchases updates the metrics", () => {
  render(<Dashboard />);

  fireEvent.click(screen.getByRole("checkbox", { name: "Clicks" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Signups" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Views" }));

  expect(within(metrics()).getByText(/Total events:\s*3/)).toBeInTheDocument();
  expect(within(metrics()).getByText(/Purchases:\s*3/)).toBeInTheDocument();
  expect(within(metrics()).getByText(/Clicks:\s*0/)).toBeInTheDocument();
  expect(within(metrics()).getByText(/Total revenue:\s*\$168\.98/)).toBeInTheDocument();
});

test("date range and event type filters combine correctly", () => {
  render(<Dashboard />);

  fireEvent.change(screen.getByLabelText("Date range"), { target: { value: "7d" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Clicks" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Signups" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Views" }));

  expect(within(metrics()).getByText(/Total events:\s*2/)).toBeInTheDocument();
  expect(within(metrics()).getByText(/Total revenue:\s*\$69\.98/)).toBeInTheDocument();
});

test("deselecting every event type shows the no-matching-filters empty state", () => {
  render(<Dashboard />);

  fireEvent.click(screen.getByRole("checkbox", { name: "Clicks" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Purchases" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Signups" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Views" }));

  expect(within(metrics()).getByText(/Total events:\s*0/)).toBeInTheDocument();
  expect(screen.getByText("No events match the current filters.")).toBeInTheDocument();
});
