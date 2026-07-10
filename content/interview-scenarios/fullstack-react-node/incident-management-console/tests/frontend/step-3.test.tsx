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

describe("frontend step 3", () => {
  it("changes status through the backend and updates the detail panel and timeline", async () => {
    const user = userEvent.setup();
    render(<App />);

    const incidents = await screen.findByLabelText("Incidents");
    await user.click(within(incidents).getByText("Gateway config drift alert"));

    const statusForm = await screen.findByLabelText("Change status");
    await user.selectOptions(within(statusForm).getByLabelText("New status"), "investigating");
    await user.selectOptions(within(statusForm).getByLabelText("Status responder"), "1");
    await user.type(within(statusForm).getByLabelText("Status message"), "Looking into the drift alert.");
    await user.click(within(statusForm).getByRole("button", { name: /save status change/i }));

    const details = screen.getByLabelText("Incident details");
    await waitFor(() => {
      expect(within(details).getByText("Investigating")).toBeTruthy();
    });

    const timeline = screen.getByLabelText("Timeline");
    expect(within(timeline).getByText("Looking into the drift alert.")).toBeTruthy();
  });

  it("resolves an incident and hides further controls", async () => {
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
    expect(screen.queryByLabelText("Change status")).toBeNull();
    expect(screen.queryByLabelText("Assign responder")).toBeNull();
    expect(screen.queryByLabelText("Add update")).toBeNull();
  });

  it("shows the backend validation error for a disallowed transition", async () => {
    const user = userEvent.setup();
    render(<App />);

    const incidents = await screen.findByLabelText("Incidents");
    await user.click(within(incidents).getByText("Auth service full outage"));

    const statusForm = await screen.findByLabelText("Change status");
    await user.selectOptions(within(statusForm).getByLabelText("New status"), "resolved");
    await user.selectOptions(within(statusForm).getByLabelText("Status responder"), "1");
    await user.type(within(statusForm).getByLabelText("Status message"), "Skipping ahead.");
    await user.click(within(statusForm).getByRole("button", { name: /resolve incident/i }));

    await waitFor(() => {
      expect(within(statusForm).getByRole("alert").textContent).toContain("Invalid status transition");
    });
  });
});
