import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { Dashboard } from "../workspace/Dashboard";
import { computeMetrics, filterEvents } from "../workspace/analytics";
import { EVENTS, NOW } from "../workspace/events";

// Step 2's graded contract: `filterEvents` and `computeMetrics` (the pure
// data layer) are correct for date ranges, type selection, and the advanced
// metrics; the filter controls render and respond to interaction. Whether
// changing a filter actually updates the RENDERED metrics is Step 3's
// concern -- exercising that here would fail against a perfectly reasonable
// first-pass component that has the Step 3 bug but a fully correct data
// layer, so it's asserted only once the fix is required.
afterEach(cleanup);

const ALL_TYPES = ["click", "purchase", "signup", "view"] as const;

test("filterEvents narrows by date range", () => {
  expect(filterEvents(EVENTS, { range: "24h", types: [...ALL_TYPES] }, NOW)).toHaveLength(4);
  expect(filterEvents(EVENTS, { range: "7d", types: [...ALL_TYPES] }, NOW)).toHaveLength(8);
  expect(filterEvents(EVENTS, { range: "30d", types: [...ALL_TYPES] }, NOW)).toHaveLength(11);
  expect(filterEvents(EVENTS, { range: "all", types: [...ALL_TYPES] }, NOW)).toHaveLength(13);
});

test("filterEvents narrows by event type, independent of date range", () => {
  const purchasesOnly = filterEvents(EVENTS, { range: "all", types: ["purchase"] }, NOW);
  expect(purchasesOnly).toHaveLength(3);
  expect(purchasesOnly.every((e) => e.type === "purchase")).toBe(true);
});

test("filterEvents applies date range and type together", () => {
  const result = filterEvents(EVENTS, { range: "7d", types: ["purchase"] }, NOW);
  expect(result).toHaveLength(2);
});

test("filterEvents with no selected types returns nothing", () => {
  expect(filterEvents(EVENTS, { range: "all", types: [] }, NOW)).toHaveLength(0);
});

test("computeMetrics reports conversion rate and revenue for the full dataset", () => {
  const metrics = computeMetrics(EVENTS);
  expect(metrics.conversionRate).toBe(50);
  expect(metrics.totalRevenue).toBeCloseTo(168.98);
});

test("computeMetrics groups events by calendar day", () => {
  const metrics = computeMetrics(filterEvents(EVENTS, { range: "24h", types: [...ALL_TYPES] }, NOW));
  expect(metrics.eventsByDay).toEqual([{ date: "2026-06-15", count: 4 }]);
});

test("the dashboard renders filter controls for date range and event type", () => {
  render(<Dashboard />);

  const select = screen.getByLabelText("Date range") as HTMLSelectElement;
  expect(select).toHaveValue("all");
  fireEvent.change(select, { target: { value: "24h" } });
  expect(select).toHaveValue("24h");

  const purchasesCheckbox = screen.getByRole("checkbox", { name: "Purchases" });
  expect(purchasesCheckbox).toBeChecked();
  fireEvent.click(purchasesCheckbox);
  expect(purchasesCheckbox).not.toBeChecked();
});

test("the dashboard shows the advanced metrics for the default (all-time, all-types) view", () => {
  render(<Dashboard />);
  const metrics = screen.getByRole("region", { name: "Metrics" });
  expect(within(metrics).getByText(/Conversion rate:\s*50%/)).toBeInTheDocument();
  expect(within(metrics).getByText(/Total revenue:\s*\$168\.98/)).toBeInTheDocument();
});
