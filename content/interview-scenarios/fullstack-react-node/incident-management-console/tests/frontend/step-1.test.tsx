import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";

/** Real backend is shared across test files in this layer, so reset it before
 *  each test to stay deterministic regardless of execution order. */
beforeEach(async () => {
  await fetch(`${process.env.BACKEND_URL}/__test/reset`, { method: "POST" });
});
afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading, then services, incidents, and options", async () => {
    render(<App />);

    expect(screen.getByRole("status").textContent).toContain("Loading incidents");

    const services = await screen.findByLabelText("Services");
    expect(within(services).getByText("API Gateway")).toBeTruthy();
    expect(within(services).getByText("Auth Service")).toBeTruthy();

    const incidents = screen.getByLabelText("Incidents");
    expect(within(incidents).getByText("Auth service full outage")).toBeTruthy();
    expect(within(incidents).getByText("Elevated API latency")).toBeTruthy();
  });

  it("selecting an incident shows its details and timeline", async () => {
    const user = userEvent.setup();
    render(<App />);

    const incidents = await screen.findByLabelText("Incidents");
    await user.click(within(incidents).getByText("Payment webhook delays"));

    const details = screen.getByLabelText("Incident details");
    expect(await within(details).findByText("Payment webhook delays")).toBeTruthy();
    expect(within(details).getByText("Assigned: Jordan Lee")).toBeTruthy();

    const timeline = screen.getByLabelText("Timeline");
    expect(await within(timeline).findByText("Status changed to monitoring.")).toBeTruthy();
    expect(within(timeline).getByText("Assigned to Jordan Lee.")).toBeTruthy();
  });

  it("renders unassigned incidents and system-authored events", async () => {
    const user = userEvent.setup();
    render(<App />);

    const incidents = await screen.findByLabelText("Incidents");
    await user.click(within(incidents).getByText("Auth service full outage"));

    const details = screen.getByLabelText("Incident details");
    expect(await within(details).findByText(/Unassigned/)).toBeTruthy();

    const timeline = screen.getByLabelText("Timeline");
    expect(await within(timeline).findByText("System")).toBeTruthy();
  });
});
