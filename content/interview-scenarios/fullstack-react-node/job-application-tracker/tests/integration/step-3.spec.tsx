import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 3", () => {
  it("updates an application and persists the change across reloads", async () => {
    const user = userEvent.setup();
    render(<App />);
    const list = screen.getByLabelText("Applications");
    const amazonHeading = await within(list).findByText("Amazon");
    const amazonCard = amazonHeading.closest("article")!;

    await user.selectOptions(within(amazonCard).getByLabelText("Update status for Amazon"), "applied");
    await user.click(within(amazonCard).getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(within(amazonCard).getByText("Applied", { selector: ".status" })).toBeTruthy());

    cleanup();
    render(<App />);
    const reloadedList = screen.getByLabelText("Applications");
    const reloadedHeading = await within(reloadedList).findByText("Amazon");
    const reloadedCard = reloadedHeading.closest("article")!;
    expect(within(reloadedCard).getByText("Applied", { selector: ".status" })).toBeTruthy();
  });
});
