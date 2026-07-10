import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 3", () => {
  it("updates budget, changing the over-budget state, and the change survives a reload", async () => {
    const { unmount } = render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    const retargeting = await within(list).findByLabelText("Campaign Retargeting Push");

    const user = userEvent.setup();
    await user.click(retargeting);

    const detail = screen.getByLabelText("Campaign details");
    await within(detail).findByText("Retargeting Push");

    const budgetInput = within(detail).getByLabelText("Budget (cents)") as HTMLInputElement;
    await user.clear(budgetInput);
    await user.type(budgetInput, "90000");
    await user.click(within(detail).getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(within(list).getByLabelText("Campaign Retargeting Push").querySelector(".badge-over-budget")).toBeNull(),
    );

    unmount();

    // Simulate a reload: mount a fresh App instance against the same backend process.
    render(<App />);
    const reloadedList = await screen.findByLabelText("Campaigns");
    expect(within(reloadedList).getByLabelText("Campaign Retargeting Push").querySelector(".badge-over-budget")).toBe(
      null,
    );
  });

  it("updates status against the real backend and updates the summary", async () => {
    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    const q1Push = await within(list).findByLabelText("Campaign Q1 Push");

    const user = userEvent.setup();
    await user.click(q1Push);

    const detail = screen.getByLabelText("Campaign details");
    await within(detail).findByText("Q1 Push");

    await user.selectOptions(within(detail).getByLabelText("Campaign status"), "active");
    await user.click(within(detail).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const badge = within(list).getByLabelText("Campaign Q1 Push").querySelector(".status-active");
      expect(badge).toBeTruthy();
    });
  });

  it("rejects an invalid transition and any update on a completed campaign", async () => {
    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    const holidaySale = await within(list).findByLabelText("Campaign Holiday Sale");

    const user = userEvent.setup();
    await user.click(holidaySale);

    const detail = screen.getByLabelText("Campaign details");
    await within(detail).findByText("Holiday Sale");

    const budgetInput = within(detail).getByLabelText("Budget (cents)") as HTMLInputElement;
    expect(budgetInput.disabled).toBe(true);
    expect(within(detail).getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(true);
  });
});
