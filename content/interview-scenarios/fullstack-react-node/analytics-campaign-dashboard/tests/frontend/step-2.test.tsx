import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 2", () => {
  it("renders a summary panel with numeric KPIs", async () => {
    render(<App />);
    const panel = await screen.findByLabelText("Campaign summary");
    expect(within(panel).getByText(/^Total \d+$/)).toBeTruthy();
    expect(within(panel).getByText(/^Active \d+$/)).toBeTruthy();
    expect(within(panel).getByText(/^CTR \d+(\.\d+)?%$/)).toBeTruthy();
    expect(within(panel).getByText(/^Over budget \d+$/)).toBeTruthy();
  });

  it("filters the campaign list by channel", async () => {
    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    await waitFor(() => expect(within(list).getAllByRole("button")).toHaveLength(8));

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Channel"), "1");

    await waitFor(() => expect(within(list).getAllByRole("button")).toHaveLength(2));
    expect(within(list).getByLabelText("Campaign Spring Launch")).toBeTruthy();
    expect(within(list).getByLabelText("Campaign Brand Awareness")).toBeTruthy();
  });

  it("filters the campaign list by status", async () => {
    render(<App />);
    await screen.findByLabelText("Campaigns");
    const list = screen.getByLabelText("Campaigns");

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Status"), "completed");

    await waitFor(() => expect(within(list).getAllByRole("button")).toHaveLength(2));
    expect(within(list).getByLabelText("Campaign Holiday Sale")).toBeTruthy();
    expect(within(list).getByLabelText("Campaign Flash Sale")).toBeTruthy();
  });

  it("shows a backend validation error for an invalid date range", async () => {
    render(<App />);
    await screen.findByLabelText("Campaigns");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Start date"), "2025-03-01");
    await user.type(screen.getByLabelText("End date"), "2025-01-01");

    expect((await screen.findAllByText("Invalid date range")).length).toBeGreaterThan(0);
  });
});
