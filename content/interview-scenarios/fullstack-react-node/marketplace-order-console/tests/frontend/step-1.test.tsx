import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading, then the order list with an order selected by default", async () => {
    render(<App />);
    expect(screen.getByRole("status").textContent).toContain("Loading orders");

    const orderList = screen.getByLabelText("Orders");
    await waitFor(() => expect(within(orderList).getAllByRole("button").length).toBeGreaterThanOrEqual(8));
  });

  it("shows the selected order's items in the detail panel", async () => {
    render(<App />);
    const orderList = await screen.findByLabelText("Orders");
    const orderFour = await within(orderList).findByLabelText("Order 4");

    const user = userEvent.setup();
    await user.click(orderFour);

    const detail = screen.getByLabelText("Order details");
    expect(await within(detail).findByText(/Order #4/)).toBeTruthy();
    expect(within(detail).getByText(/Wireless Keyboard/)).toBeTruthy();
    expect(within(detail).getByText(/Throw Blanket/)).toBeTruthy();
  });
});
