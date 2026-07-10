import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";

/** Real backend is shared across test files in this layer, so reset it before
 *  each test to stay deterministic regardless of execution order. */
beforeEach(async () => {
  await fetch(`${process.env.BACKEND_URL}/__test/reset`, { method: "POST" });
});
afterEach(() => cleanup());

describe("integration step 2", () => {
  it("changes plan, billing cycle, and seats, and persists across reloads", async () => {
    const user = userEvent.setup();
    render(<App />);

    const form = await screen.findByLabelText("Update subscription");
    await user.click(within(form).getByLabelText("Select Business plan"));
    await user.clear(within(form).getByLabelText("Seats"));
    await user.type(within(form).getByLabelText("Seats"), "25");
    await user.selectOptions(within(form).getByLabelText("Billing cycle"), "annual");
    await user.click(within(form).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const current = screen.getByLabelText("Current subscription");
      expect(within(current).getByText("Business")).toBeTruthy();
      expect(current.textContent).toContain("Annual billing");
      expect(current.textContent).toContain("25 seats");
    });

    cleanup();
    render(<App />);
    const reloadedCurrent = await screen.findByLabelText("Current subscription");
    expect(within(reloadedCurrent).getByText("Business")).toBeTruthy();
    expect(reloadedCurrent.textContent).toContain("Annual billing");
    expect(reloadedCurrent.textContent).toContain("25 seats");
  });
});
