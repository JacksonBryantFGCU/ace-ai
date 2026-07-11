import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 2", () => {
  it("renders a summary panel with numeric totals", async () => {
    render(<App />);
    const panel = await screen.findByLabelText("Order summary");
    expect(within(panel).getByText(/^Total \d+$/)).toBeTruthy();
    expect(within(panel).getByText(/^Pending \d+$/)).toBeTruthy();
    expect(within(panel).getByText(/^Fulfilled \d+$/)).toBeTruthy();
    expect(within(panel).getByText(/^Cancelled \d+$/)).toBeTruthy();
  });

  it("filters the order list by status", async () => {
    render(<App />);
    const orderList = await screen.findByLabelText("Orders");
    await waitFor(() => expect(within(orderList).getAllByRole("button").length).toBeGreaterThan(0));
    const total = within(orderList).getAllByRole("button").length;

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Status"), "fulfilled");

    await waitFor(() => expect(within(orderList).getAllByRole("button").length).toBeLessThan(total));
    expect(within(orderList).getAllByText("Fulfilled").length).toBeGreaterThan(0);
    expect(within(orderList).queryAllByText(/^(Pending|Cancelled)$/).length).toBe(0);
  });

  it("creates a valid order through the backend and adds it to the list", async () => {
    render(<App />);
    const orderList = await screen.findByLabelText("Orders");
    await waitFor(() => expect(within(orderList).getAllByRole("button").length).toBeGreaterThan(0));
    const before = within(orderList).getAllByRole("button").length;

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Customer"), "1");
    await user.selectOptions(screen.getByLabelText("Product"), "4");
    await user.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() => expect(within(orderList).getAllByRole("button")).toHaveLength(before + 1));
  });

  it("shows a backend validation error for insufficient inventory", async () => {
    render(<App />);
    await screen.findByLabelText("Orders");

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Customer"), "1");
    await user.selectOptions(screen.getByLabelText("Product"), "2");
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByText("Insufficient inventory")).toBeTruthy();
  });
});
