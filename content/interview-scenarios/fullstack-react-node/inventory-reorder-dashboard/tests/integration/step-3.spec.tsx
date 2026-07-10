import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 3", () => {
  it("surfaces validation errors and persists successful updates across reloads", async () => {
    const user = userEvent.setup();
    render(<App />);

    const mouseHeading = await screen.findByText("Wireless Mouse");
    const mouseCard = mouseHeading.closest("article")!;

    const stockInput = screen.getByLabelText("Update stock for Wireless Mouse");
    // `fireEvent.change` sets the whole value at once; `userEvent.type` types the
    // "-" keystroke first, which jsdom sanitizes away for <input type="number">.
    fireEvent.change(stockInput, { target: { value: "-1" } });
    await user.click(within(mouseCard).getByRole("button", { name: /save update/i }));
    expect(await screen.findByText(/non-negative whole number/i)).toBeTruthy();

    await user.clear(stockInput);
    await user.type(stockInput, "50");
    await user.click(within(mouseCard).getByRole("button", { name: /save update/i }));
    await waitFor(() => expect(screen.queryByText(/non-negative whole number/i)).toBeNull());
    await waitFor(() => expect(within(mouseCard).queryByText("Reorder needed")).toBeNull());

    cleanup();
    render(<App />);
    await user.click(await screen.findByLabelText("Low stock only"));
    await screen.findByText("Ceramic Mug");
    expect(screen.queryByText("Wireless Mouse")).toBeNull();
  });
});
