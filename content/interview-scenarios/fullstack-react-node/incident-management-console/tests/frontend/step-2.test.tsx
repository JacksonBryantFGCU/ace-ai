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

describe("frontend step 2", () => {
  it("renders the summary panel and filters, and filtering narrows the incident list", async () => {
    const user = userEvent.setup();
    render(<App />);

    const summary = await screen.findByLabelText("Summary");
    expect(within(summary).getByText("6")).toBeTruthy();

    const filters = screen.getByLabelText("Filters");
    const incidents = screen.getByLabelText("Incidents");
    expect(within(incidents).getByText("Auth service full outage")).toBeTruthy();

    await user.selectOptions(within(filters).getByLabelText("Status filter"), "resolved");
    await waitFor(() => {
      expect(within(incidents).queryByText("Auth service full outage")).toBeNull();
      expect(within(incidents).getByText("Push notifications delayed")).toBeTruthy();
    });
  });

  it("shows an empty state when no incidents match the filters", async () => {
    const user = userEvent.setup();
    render(<App />);

    const filters = await screen.findByLabelText("Filters");
    const incidents = screen.getByLabelText("Incidents");
    await user.selectOptions(within(filters).getByLabelText("Status filter"), "resolved");
    await user.selectOptions(within(filters).getByLabelText("Severity filter"), "sev1");

    await waitFor(() => {
      expect(within(incidents).getByText(/no incidents match/i)).toBeTruthy();
    });
  });

  it("assigns a responder through the backend and updates the detail panel", async () => {
    const user = userEvent.setup();
    render(<App />);

    const incidents = await screen.findByLabelText("Incidents");
    await user.click(within(incidents).getByText("Gateway config drift alert"));

    const assignForm = await screen.findByLabelText("Assign responder");
    await user.selectOptions(within(assignForm).getByLabelText("Responder to assign"), "2");
    await user.click(within(assignForm).getByRole("button", { name: /assign responder/i }));

    const details = screen.getByLabelText("Incident details");
    await waitFor(() => {
      expect(within(details).getByText("Assigned: Jordan Lee")).toBeTruthy();
    });

    const timeline = screen.getByLabelText("Timeline");
    expect(within(timeline).getByText("Assigned to Jordan Lee.")).toBeTruthy();
  });

  it("adds a timeline update through the backend", async () => {
    const user = userEvent.setup();
    render(<App />);

    const incidents = await screen.findByLabelText("Incidents");
    await user.click(within(incidents).getByText("Gateway config drift alert"));

    const updateForm = await screen.findByLabelText("Add update");
    await user.selectOptions(within(updateForm).getByLabelText("Update responder"), "1");
    await user.type(within(updateForm).getByLabelText("Update message"), "Confirmed drift source and rolled back config.");
    await user.click(within(updateForm).getByRole("button", { name: /post update/i }));

    const timeline = screen.getByLabelText("Timeline");
    await waitFor(() => {
      expect(within(timeline).getByText("Confirmed drift source and rolled back config.")).toBeTruthy();
    });
  });

  it("shows the backend validation error when assigning the same responder twice", async () => {
    const user = userEvent.setup();
    render(<App />);

    const incidents = await screen.findByLabelText("Incidents");
    await user.click(within(incidents).getByText("Gateway config drift alert"));

    const assignForm = await screen.findByLabelText("Assign responder");
    await user.selectOptions(within(assignForm).getByLabelText("Responder to assign"), "1");
    await user.click(within(assignForm).getByRole("button", { name: /assign responder/i }));

    const details = screen.getByLabelText("Incident details");
    await waitFor(() => {
      expect(within(details).getByText("Assigned: Alex Rivera")).toBeTruthy();
    });

    await user.selectOptions(within(assignForm).getByLabelText("Responder to assign"), "1");
    await user.click(within(assignForm).getByRole("button", { name: /assign responder/i }));

    await waitFor(() => {
      expect(within(assignForm).getByRole("alert").textContent).toContain("Responder is already assigned");
    });
  });
});
