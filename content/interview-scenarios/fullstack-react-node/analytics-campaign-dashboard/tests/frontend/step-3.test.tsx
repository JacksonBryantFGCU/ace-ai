import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 3", () => {
  it("updates a campaign's budget and refreshes the detail panel", async () => {
    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    const brandAwareness = await within(list).findByLabelText("Campaign Brand Awareness");

    const user = userEvent.setup();
    await user.click(brandAwareness);

    const detail = screen.getByLabelText("Campaign details");
    await within(detail).findByText("Brand Awareness");

    const budgetInput = within(detail).getByLabelText("Budget (cents)") as HTMLInputElement;
    await user.clear(budgetInput);
    await user.type(budgetInput, "200000");
    await user.click(within(detail).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(within(detail).getByText("$1580.00")).toBeTruthy());
  });

  it("updates a campaign's status and reflects it in the list", async () => {
    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    const newsletter = await within(list).findByLabelText("Campaign Newsletter Promo");

    const user = userEvent.setup();
    await user.click(newsletter);

    const detail = screen.getByLabelText("Campaign details");
    await within(detail).findByText("Newsletter Promo");

    await user.selectOptions(within(detail).getByLabelText("Campaign status"), "active");
    await user.click(within(detail).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const badge = within(list).getByLabelText("Campaign Newsletter Promo").querySelector(".status-active");
      expect(badge).toBeTruthy();
    });
  });

  it("shows a backend validation error for an invalid status transition", async () => {
    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    const springLaunch = await within(list).findByLabelText("Campaign Spring Launch");

    const user = userEvent.setup();
    await user.click(springLaunch);

    const detail = screen.getByLabelText("Campaign details");
    await within(detail).findByText("Spring Launch");

    // Spring Launch is active; active -> draft is not an allowed transition.
    await user.selectOptions(within(detail).getByLabelText("Campaign status"), "draft");
    await user.click(within(detail).getByRole("button", { name: "Save changes" }));

    expect(await within(detail).findByText("Invalid status transition")).toBeTruthy();
  });
});
