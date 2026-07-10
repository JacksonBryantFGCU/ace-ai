import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 2", () => {
  it("filters and creates an order against the real backend", async () => {
    render(<App />);
    const orderList = await screen.findByLabelText("Orders");
    await waitFor(() => expect(within(orderList).getAllByRole("button").length).toBeGreaterThan(0));
    const totalBefore = within(orderList).getAllByRole("button").length;

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Status"), "pending");
    await waitFor(() =>
      expect(within(orderList).getAllByRole("button").length).toBeLessThan(totalBefore),
    );
    await user.selectOptions(screen.getByLabelText("Status"), "all");
    await waitFor(() => expect(within(orderList).getAllByRole("button")).toHaveLength(totalBefore));

    await user.selectOptions(screen.getByLabelText("Customer"), "2");
    await user.selectOptions(screen.getByLabelText("Product"), "1");
    await user.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() => expect(within(orderList).getAllByRole("button")).toHaveLength(totalBefore + 1));

    // Step 1 behavior still works: selecting the newest order shows its real detail.
    const newest = within(orderList).getAllByRole("button")[0]!;
    await user.click(newest);
    const detail = screen.getByLabelText("Order details");
    expect(await within(detail).findByText(/Order #\d+/)).toBeTruthy();
  });

  it("shows a backend validation error when inventory is insufficient", async () => {
    render(<App />);
    await screen.findByLabelText("Orders");

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Customer"), "1");
    await user.selectOptions(screen.getByLabelText("Product"), "2");
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByText("Insufficient inventory")).toBeTruthy();
  });
});
