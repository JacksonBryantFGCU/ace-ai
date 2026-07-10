import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

function isDisabled(element: HTMLElement): boolean {
  return (element as HTMLButtonElement).disabled;
}

function countInPanel(panel: HTMLElement, label: string): number {
  const match = within(panel).getByText(new RegExp(`^${label} \\d+$`)).textContent;
  return Number(match!.replace(`${label} `, ""));
}

afterEach(() => cleanup());

describe("frontend step 3", () => {
  it("fulfills a pending order and updates the detail panel and summary", async () => {
    render(<App />);
    const summary = await screen.findByLabelText("Order summary");
    await waitFor(() => expect(within(summary).queryByText(/^Fulfilled \d+$/)).toBeTruthy());
    const before = countInPanel(summary, "Fulfilled");

    const orderList = await screen.findByLabelText("Orders");
    const orderFour = await within(orderList).findByLabelText("Order 4");

    const user = userEvent.setup();
    await user.click(orderFour);

    const detail = screen.getByLabelText("Order details");
    await within(detail).findByText(/Order #4/);

    await user.click(within(detail).getByRole("button", { name: "Fulfill order" }));

    await waitFor(() =>
      expect(isDisabled(within(detail).getByRole("button", { name: "Fulfill order" }))).toBe(true),
    );

    await waitFor(() => expect(countInPanel(summary, "Fulfilled")).toBeGreaterThanOrEqual(before + 1));
  });

  it("cancels a pending order and updates the detail panel", async () => {
    render(<App />);
    const summary = await screen.findByLabelText("Order summary");
    await waitFor(() => expect(within(summary).queryByText(/^Cancelled \d+$/)).toBeTruthy());
    const before = countInPanel(summary, "Cancelled");

    const orderList = await screen.findByLabelText("Orders");
    const orderSix = await within(orderList).findByLabelText("Order 6");

    const user = userEvent.setup();
    await user.click(orderSix);

    const detail = screen.getByLabelText("Order details");
    await within(detail).findByText(/Order #6/);

    await user.click(within(detail).getByRole("button", { name: "Cancel order" }));

    await waitFor(() =>
      expect(isDisabled(within(detail).getByRole("button", { name: "Cancel order" }))).toBe(true),
    );

    await waitFor(() => expect(countInPanel(summary, "Cancelled")).toBeGreaterThanOrEqual(before + 1));
  });
});
