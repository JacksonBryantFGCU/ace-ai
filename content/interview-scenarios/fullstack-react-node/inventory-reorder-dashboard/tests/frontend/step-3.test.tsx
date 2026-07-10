import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 3", () => {
  it("shows backend validation errors and applies successful stock updates", async () => {
    render(<App />);

    const mouseHeading = await screen.findByText("Wireless Mouse");
    const mouseCard = mouseHeading.closest("article")!;

    const stockInput = screen.getByLabelText("Update stock for Wireless Mouse");
    // `fireEvent.change` sets the whole value at once; `userEvent.type` types the
    // "-" keystroke first, which jsdom sanitizes away for <input type="number">.
    fireEvent.change(stockInput, { target: { value: "-5" } });
    await userEvent.click(within(mouseCard).getByRole("button", { name: /save update/i }));
    expect(await screen.findByText(/non-negative whole number/i)).toBeTruthy();

    await userEvent.clear(stockInput);
    await userEvent.type(stockInput, "40");
    await userEvent.click(within(mouseCard).getByRole("button", { name: /save update/i }));

    await waitFor(() => expect(screen.queryByText(/non-negative whole number/i)).toBeNull());
    await waitFor(() => expect(within(mouseCard).queryByText("Reorder needed")).toBeNull());
    expect(within(mouseCard).getByText("Stock is healthy.")).toBeTruthy();
  });
});
