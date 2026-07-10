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

describe("integration step 2", () => {
  it("filters, assigns a responder, and adds a timeline update, persisting after reload", async () => {
    const user = userEvent.setup();
    render(<App />);

    const filters = await screen.findByLabelText("Filters");
    const incidents = screen.getByLabelText("Incidents");
    await user.selectOptions(within(filters).getByLabelText("Assigned filter"), "false");
    await waitFor(() => {
      expect(within(incidents).getByText("Gateway config drift alert")).toBeTruthy();
      expect(within(incidents).queryByText("Elevated API latency")).toBeNull();
    });

    await user.click(within(incidents).getByText("Gateway config drift alert"));

    const assignForm = await screen.findByLabelText("Assign responder");
    await user.selectOptions(within(assignForm).getByLabelText("Responder to assign"), "2");
    await user.click(within(assignForm).getByRole("button", { name: /assign responder/i }));

    const updateForm = await screen.findByLabelText("Add update");
    await user.selectOptions(within(updateForm).getByLabelText("Update responder"), "2");
    await user.type(within(updateForm).getByLabelText("Update message"), "Rolled back the config change.");
    await user.click(within(updateForm).getByRole("button", { name: /post update/i }));

    const summary = screen.getByLabelText("Summary");
    await waitFor(() => {
      const unassignedLabel = within(summary).getByText("Unassigned");
      expect(unassignedLabel.parentElement?.textContent).toContain("1");
    });

    cleanup();
    render(<App />);
    const reloadedFilters = await screen.findByLabelText("Filters");
    await user.selectOptions(within(reloadedFilters).getByLabelText("Assigned filter"), "false");
    const reloadedIncidents = screen.getByLabelText("Incidents");
    await waitFor(() => {
      expect(within(reloadedIncidents).queryByText("Gateway config drift alert")).toBeNull();
    });

    // Step 1 still works.
    await user.selectOptions(within(reloadedFilters).getByLabelText("Assigned filter"), "");
    await user.click(within(reloadedIncidents).getByText("Gateway config drift alert"));
    const details = screen.getByLabelText("Incident details");
    await waitFor(() => {
      expect(within(details).getByText("Assigned: Jordan Lee")).toBeTruthy();
    });
    const timeline = screen.getByLabelText("Timeline");
    expect(within(timeline).getByText("Rolled back the config change.")).toBeTruthy();
  });
});
