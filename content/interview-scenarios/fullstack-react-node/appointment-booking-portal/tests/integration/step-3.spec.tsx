import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 3", () => {
  it("finalizes an appointment and persists the change across reloads", async () => {
    const user = userEvent.setup();
    render(<App />);
    const list = screen.getByLabelText("Appointments");
    const heading = await within(list).findByText("Morgan Diaz");
    const card = heading.closest("article")!;

    await user.click(within(card).getByRole("button", { name: /cancel appointment for morgan diaz/i }));
    await waitFor(() => expect(within(card).getByText("Cancelled", { selector: ".status" })).toBeTruthy());

    cleanup();
    render(<App />);
    const reloadedList = screen.getByLabelText("Appointments");
    const reloadedHeading = await within(reloadedList).findByText("Morgan Diaz");
    const reloadedCard = reloadedHeading.closest("article")!;
    expect(within(reloadedCard).getByText("Cancelled", { selector: ".status" })).toBeTruthy();
  });
});
