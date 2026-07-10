import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

function isDisabled(element: HTMLElement): boolean {
  return (element as HTMLButtonElement).disabled;
}

afterEach(() => cleanup());

describe("integration step 3", () => {
  it("fulfills an order against the real backend and the change survives a reload", async () => {
    const { unmount } = render(<App />);
    const orderList = await screen.findByLabelText("Orders");
    const orderEight = await within(orderList).findByLabelText("Order 8");

    const user = userEvent.setup();
    await user.click(orderEight);

    const detail = screen.getByLabelText("Order details");
    await within(detail).findByText(/Order #8/);
    await user.click(within(detail).getByRole("button", { name: "Fulfill order" }));
    await waitFor(() => expect(isDisabled(within(detail).getByRole("button", { name: "Fulfill order" }))).toBe(true));

    unmount();

    // Simulate a reload: mount a fresh App instance against the same backend process.
    render(<App />);
    const reloadedList = await screen.findByLabelText("Orders");
    const reloadedOrderEight = await within(reloadedList).findByLabelText("Order 8");
    await user.click(reloadedOrderEight);
    const reloadedDetail = screen.getByLabelText("Order details");
    await within(reloadedDetail).findByText(/Order #8/);
    await waitFor(() =>
      expect(isDisabled(within(reloadedDetail).getByRole("button", { name: "Fulfill order" }))).toBe(true),
    );
  });

  it("prevents cancelling a fulfilled order and fulfilling a cancelled order", async () => {
    render(<App />);
    const orderList = await screen.findByLabelText("Orders");

    const user = userEvent.setup();
    const fulfilledOrder = await within(orderList).findByLabelText("Order 2");
    await user.click(fulfilledOrder);
    const detail = screen.getByLabelText("Order details");
    await within(detail).findByText(/Order #2/);
    expect(isDisabled(within(detail).getByRole("button", { name: "Cancel order" }))).toBe(true);

    const cancelledOrder = await within(orderList).findByLabelText("Order 3");
    await user.click(cancelledOrder);
    await within(detail).findByText(/Order #3/);
    expect(isDisabled(within(detail).getByRole("button", { name: "Fulfill order" }))).toBe(true);
  });
});
