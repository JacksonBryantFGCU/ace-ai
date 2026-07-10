import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";

/** Real backend is shared across test files in this layer, so reset it before
 *  each test to stay deterministic regardless of execution order. */
beforeEach(async () => {
  await fetch(`${process.env.BACKEND_URL}/__test/reset`, { method: "POST" });
});
afterEach(() => cleanup());

describe("integration step 3", () => {
  it("resolves an incident, persists the resolution across reloads, and blocks further changes", async () => {
    const user = userEvent.setup();
    render(<App />);

    const incidents = await screen.findByLabelText("Incidents");
    await user.click(within(incidents).getByText("Elevated API latency"));

    const statusForm = await screen.findByLabelText("Change status");
    await user.selectOptions(within(statusForm).getByLabelText("New status"), "resolved");
    await user.selectOptions(within(statusForm).getByLabelText("Status responder"), "1");
    await user.type(within(statusForm).getByLabelText("Status message"), "Latency back to normal.");
    await user.click(within(statusForm).getByRole("button", { name: /resolve incident/i }));

    const details = screen.getByLabelText("Incident details");
    await waitFor(() => {
      expect(within(details).getByText("Resolved")).toBeTruthy();
    });

    cleanup();
    render(<App />);
    const reloadedIncidents = await screen.findByLabelText("Incidents");
    await user.click(within(reloadedIncidents).getByText("Elevated API latency"));
    const reloadedDetails = screen.getByLabelText("Incident details");
    await waitFor(() => {
      expect(within(reloadedDetails).getByText("Resolved")).toBeTruthy();
    });
    expect(screen.queryByLabelText("Change status")).toBeNull();
    expect(screen.queryByLabelText("Assign responder")).toBeNull();
    expect(screen.queryByLabelText("Add update")).toBeNull();

    // Steps 1 and 2 still work.
    expect(screen.getByLabelText("Services")).toBeTruthy();
    expect(screen.getByLabelText("Summary")).toBeTruthy();
    expect(screen.getByLabelText("Filters")).toBeTruthy();
    await user.click(within(reloadedIncidents).getByText("Payment webhook delays"));
    const otherDetails = screen.getByLabelText("Incident details");
    await waitFor(() => {
      expect(within(otherDetails).getByText("Payment webhook delays")).toBeTruthy();
    });
    expect(screen.getByLabelText("Assign responder")).toBeTruthy();
  });
});
